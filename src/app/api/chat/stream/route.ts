/* eslint-disable @typescript-eslint/no-explicit-any */
import { anthropic, systemPrompt } from '@/lib/claude';
import { tools, executeTool, type ToolArgs } from '@/lib/tools';
import { supabaseAdmin } from '@/lib/supabase';

interface StreamRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  userId: string;
  conversationId: string;
}

interface StreamData {
  type: 'status' | 'content' | 'tool_call' | 'error';
  content: string;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
  finished: boolean;
}

interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export async function POST(req: Request): Promise<Response> {
  const encoder = new TextEncoder();
  
  try {
    const { messages, userId, conversationId }: StreamRequest = await req.json();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Función para enviar datos al cliente
          const sendData = (data: StreamData): void => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          // Indicar que estamos procesando
          sendData({
            type: 'status',
            content: '🤔 Analizando tu consulta...',
            finished: false
          });

          // Convertir mensajes al formato de Claude (sin tipos específicos)
          const claudeMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }));

          // Configurar herramientas para Claude (sin tipos específicos)
          const claudeTools = tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: {
              type: 'object',
              properties: tool.parameters.properties,
              required: tool.parameters.required
            }
          }));

          console.log('[Stream] Tools being sent to Claude:', JSON.stringify(claudeTools, null, 2));

          const response = await anthropic.messages.stream({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 2000,
            system: systemPrompt,
            messages: claudeMessages as any,
            tools: claudeTools as any,
            temperature: 0.1
          });

          let assistantMessage = '';
          const toolCalls: ToolCall[] = [];
          let currentToolCall: Partial<ToolCall> | null = null;
          let accumulatedJson = ''; // Acumular el JSON parcial

          // Procesar stream de Claude
          for await (const event of response) {
            switch (event.type) {
              case 'content_block_start':
                if (event.content_block.type === 'tool_use') {
                  currentToolCall = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: ({} as Record<string, unknown>)
                  };
                  accumulatedJson = ''; // Reset del acumulador

                  console.log('[Stream] Tool use started:', {
                    name: event.content_block.name,
                    id: event.content_block.id
                  });

                  // Notificar que tool se está ejecutando
                  sendData({
                    type: 'status',
                    content: `🔧 Ejecutando: ${getToolDisplayName(event.content_block.name)}`,
                    finished: false
                  });
                }
                break;

              case 'content_block_delta':
                if (event.delta.type === 'text_delta') {
                  assistantMessage += event.delta.text;
                  sendData({
                    type: 'content',
                    content: event.delta.text,
                    finished: false
                  });
                } else if (event.delta.type === 'input_json_delta' && currentToolCall) {
                  // Acumular los fragmentos de JSON
                  accumulatedJson += event.delta.partial_json || '';
                  console.log('[Stream] Accumulated JSON so far:', accumulatedJson);

                  // Intentar parsear el JSON acumulado (puede fallar si aún está incompleto)
                  try {
                    const parsedInput = JSON.parse(accumulatedJson);
                    currentToolCall.input = parsedInput;
                    console.log('[Stream] Successfully parsed input:', currentToolCall.input);
                  } catch (e) {
                    // Es normal que falle mientras el JSON está incompleto
                    console.log('[Stream] JSON still incomplete, waiting for more chunks...');
                  }
                }
                break;

              case 'content_block_stop':
                if (currentToolCall && currentToolCall.id && currentToolCall.name) {
                  // Último intento de parsear si no se parseó antes
                  if (accumulatedJson && Object.keys(currentToolCall.input || {}).length === 0) {
                    try {
                      currentToolCall.input = JSON.parse(accumulatedJson);
                      console.log('[Stream] Final parse of accumulated JSON:', currentToolCall.input);
                    } catch (e) {
                      console.error('[Stream] Failed to parse accumulated JSON:', accumulatedJson, e);
                    }
                  }

                  console.log('[Stream] Tool call complete:', {
                    name: currentToolCall.name,
                    finalInput: currentToolCall.input
                  });
                  toolCalls.push(currentToolCall as ToolCall);
                  currentToolCall = null;
                  accumulatedJson = '';
                }
                break;
            }
          }

          // Ejecutar tool calls si los hay
          if (toolCalls.length > 0) {
            const toolResults: Array<{
              tool_use_id: string;
              content: string;
            }> = [];

            for (const toolCall of toolCalls) {
              try {
                const result = await executeTool(toolCall.name, toolCall.input as unknown as ToolArgs, userId);

                sendData({
                  type: 'tool_call',
                  content: '',
                  toolCall: {
                    name: toolCall.name,
                    args: toolCall.input,
                    result: result
                  },
                  finished: false
                });

                toolResults.push({
                  tool_use_id: toolCall.id,
                  content: JSON.stringify(result)
                });

              } catch (error) {
                sendData({
                  type: 'error',
                  content: `Error ejecutando ${toolCall.name}: ${error}`,
                  finished: false
                });

                toolResults.push({
                  tool_use_id: toolCall.id,
                  content: JSON.stringify({ 
                    error: true, 
                    message: error instanceof Error ? error.message : String(error) 
                  })
                });
              }
            }

            // Continuar conversación con resultado de tools
            const messagesWithTools = [
              ...claudeMessages,
              {
                role: 'assistant',
                content: [
                  ...(assistantMessage ? [{ type: 'text', text: assistantMessage }] : []),
                  ...toolCalls.map((tc) => ({
                    type: 'tool_use',
                    id: tc.id,
                    name: tc.name,
                    input: tc.input
                  }))
                ]
              },
              {
                role: 'user',
                content: toolResults.map(tr => ({
                  type: 'tool_result',
                  tool_use_id: tr.tool_use_id,
                  content: tr.content
                }))
              }
            ];

            const followUpResponse = await anthropic.messages.stream({
              model: 'claude-3-5-haiku-20241022',
              max_tokens: 2000,
              system: systemPrompt,
              messages: messagesWithTools as any,
              temperature: 0.1
            });

            let finalMessage = '';
            for await (const event of followUpResponse) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                finalMessage += event.delta.text;
                sendData({
                  type: 'content',
                  content: event.delta.text,
                  finished: false
                });
              }
            }

            assistantMessage += finalMessage;
          }

          // Guardar mensaje en DB
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantMessage,
            tools_used: toolCalls.map(tc => ({
              name: tc.name,
              arguments: tc.input
            }))
          });

          // Finalizar stream
          sendData({
            type: 'content',
            content: '',
            finished: true
          });

        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            content: 'Error interno del servidor',
            finished: true
          } satisfies StreamData)}\n\n`));
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('Request parsing error:', error);
    return Response.json({ 
      error: 'Error procesando request' 
    }, { status: 400 });
  }
}

function getToolDisplayName(toolName: string): string {
  const names: Record<string, string> = {
    searchDocuments: '🔍 Buscando en documentos',
    saveData: '💾 Guardando información',
    calculate: '🧮 Realizando cálculos'
  };
  return names[toolName] || `🔧 ${toolName}`;
}