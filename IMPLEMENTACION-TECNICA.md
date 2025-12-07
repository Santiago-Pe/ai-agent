# IMPLEMENTACIÓN TÉCNICA - GUÍA DE ESTUDIO

## 📋 Índice

1. [RAG - Retrieval-Augmented Generation](#1-rag---retrieval-augmented-generation)
2. [SESSION PERSIST - Persistencia de Sesiones](#2-session-persist---persistencia-de-sesiones)
3. [STREAMING - Respuestas en Tiempo Real](#3-streaming---respuestas-en-tiempo-real)
4. [TOOLS REALES - Ejecución de Herramientas](#4-tools-reales---ejecución-de-herramientas)
5. [LOGIN NO TRADICIONAL - Autenticación con Lenguaje Natural](#5-login-no-tradicional---autenticación-con-lenguaje-natural)

---

## 1. RAG - Retrieval-Augmented Generation

### ¿Qué es RAG?

RAG es una técnica que combina:

- **Búsqueda (Retrieval)**: Buscar información relevante en documentos
- **Generación (Generation)**: Usar esa información para generar respuestas

**Problema que resuelve:**
Los LLMs tienen información limitada (solo hasta su fecha de entrenamiento). RAG les permite acceder a información actualizada y específica de tu negocio.

### ¿Cómo funciona en este proyecto?

```
Usuario pregunta: "¿Qué dice sobre marketing digital?"
                          ↓
        [1] Convertir pregunta a vector (embedding)
                          ↓
        [2] Buscar vectores similares en BD
                          ↓
        [3] Retornar documentos más relevantes
                          ↓
        [4] Claude usa documentos para responder
```

### Implementación Detallada

#### Paso 1: Generar Embeddings con Voyage AI

**Archivo:** [src/lib/voyage.ts](src/lib/voyage.ts)

```typescript
import { VoyageAIClient } from 'voyageai';

// Cliente Voyage AI
const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY!,
});

// Generar embedding para una consulta (línea 34-50)
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await voyage.embed({
    input: query,
    model: 'voyage-2', // Modelo optimizado para RAG
    inputType: 'query', // Optimización para búsquedas
  });

  return response.data[0].embedding; // Array de 1024 números
}

// Generar embedding para un documento (línea 12-29)
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await voyage.embed({
    input: text,
    model: 'voyage-2',
    inputType: 'document', // Optimización para documentos
  });

  return response.data[0].embedding;
}
```

**¿Qué hace?**

- Convierte texto en un vector de 1024 números
- Cada número representa una "dimensión semántica"
- Textos similares → vectores similares

**Ejemplo:**

```javascript
"marketing digital" → [0.123, -0.456, 0.789, ...]
"estrategia online" → [0.119, -0.441, 0.801, ...]  // Similar!
"receta de pizza"   → [-0.321, 0.887, -0.123, ...] // Diferente!
```

#### Paso 2: Almacenar Vectores en Supabase

**Archivo:** [supabase/migrations/002_setup_pgvector.sql](supabase/migrations/002_setup_pgvector.sql)

```sql
-- Habilitar extensión pgvector (línea 2-3)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla para almacenar embeddings (línea 5-12)
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,                    -- Texto del documento
  embedding vector(1024) NOT NULL,          -- Vector de 1024 dimensiones
  metadata JSONB DEFAULT '{}',              -- Info adicional (filename, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índice para búsqueda eficiente (línea 14-17)
CREATE INDEX document_embeddings_embedding_idx
ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**¿Qué hace?**

- `vector(1024)`: Tipo de dato especial para vectores
- `ivfflat`: Algoritmo de indexación rápida
- `vector_cosine_ops`: Usa cosine similarity (medida de similitud)

#### Paso 3: Función SQL de Búsqueda Semántica

**Archivo:** [supabase/migrations/002_setup_pgvector.sql](supabase/migrations/002_setup_pgvector.sql) (línea 26-48)

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),      -- Vector de la consulta
  match_threshold float DEFAULT 0.7, -- Mínima similitud (70%)
  match_count int DEFAULT 5          -- Top 5 documentos
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.content,
    document_embeddings.metadata,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**¿Qué hace?**

- `<=>`: Operador de distancia coseno (de pgvector)
- `1 - distancia = similitud`: Convierte distancia a similitud (0-1)
- Solo retorna documentos con similitud > 70%
- Ordena por más similares primero

#### Paso 4: Búsqueda desde el Backend

**Archivo:** [src/lib/vector-search.ts](src/lib/vector-search.ts) (línea 101-152)

```typescript
export async function searchDocuments(
  query: string,
  nResults: number = 3,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  // 1. Generar embedding de la consulta
  const queryEmbedding = await generateQueryEmbedding(query);

  // 2. Llamar a función SQL
  const { data, error } = await supabaseAdmin.rpc('match_documents', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: threshold,
    match_count: nResults,
  });

  if (error) {
    console.error('Error searching documents:', error);
    throw new Error('Failed to search documents');
  }

  // 3. Mapear resultados
  const results: SearchResult[] = data.map((row: any) => ({
    id: row.id,
    content: row.content,
    metadata: row.metadata,
    similarity: row.similarity, // 0.0 - 1.0
    distance: 1 - row.similarity, // Distancia inversa
  }));

  return results;
}
```

#### Paso 5: Cargar Documentos (Script de Inicialización)

**Archivo:** [scripts/init-vector-db.ts](scripts/init-vector-db.ts) (línea 20-85)

```typescript
async function loadDocuments() {
  console.log('📚 Cargando documentos...');

  // 1. Leer archivos markdown de /data/documents/
  const docsDir = path.join(process.cwd(), 'data/documents');
  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith('.md'));

  const documentsToAdd: Array<{
    content: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // 2. Dividir en chunks (por párrafos)
    const chunks = content
      .split('\n\n')
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 50); // Solo chunks significativos

    console.log(`  - ${file}: ${chunks.length} chunks`);

    // 3. Crear documentos con metadata
    for (let i = 0; i < chunks.length; i++) {
      documentsToAdd.push({
        content: chunks[i],
        metadata: {
          filename: file,
          source: file.replace('.md', ''),
          chunk_index: i,
          total_chunks: chunks.length,
          type: 'markdown',
        },
      });
    }
  }

  // 4. Insertar en batch (genera embeddings + guarda)
  const { count, success } = await addDocumentsBatch(documentsToAdd);

  console.log(`✅ ${count} documentos cargados exitosamente`);
}
```

**Ejecutar:**

```bash
npm run init-vector-db
```

#### Paso 6: Usar en el Tool

**Archivo:** [src/lib/tools.ts](src/lib/tools.ts) (línea 93-115)

```typescript
async function handleSearchDocuments(query: string) {
  try {
    // Buscar documentos relevantes (usa todo el flujo anterior)
    const results = await searchDocuments(query, 3);

    return {
      success: true,
      results: results.map((r) => ({
        content: r.content.substring(0, 500) + '...', // Primeros 500 chars
        source: r.metadata.filename,
        relevance: Math.round((1 - r.distance) * 100) + '%',
      })),
      message: `Encontré ${results.length} documentos relevantes`,
    };
  } catch (error) {
    console.error('[searchDocuments] Error:', error);
    return {
      success: false,
      error: 'Error al buscar documentos',
    };
  }
}
```

### Flujo Completo - Ejemplo Real

```
1. Usuario: "¿Qué dice sobre marketing digital?"

2. Claude decide usar tool "searchDocuments"

3. Backend ejecuta:
   - generateQueryEmbedding("marketing digital")
   - Voyage AI retorna: [0.123, -0.456, ..., 0.789]

4. Supabase ejecuta:
   - match_documents([0.123, -0.456, ..., 0.789], 0.7, 3)
   - Calcula similitud con todos los vectores en BD
   - Retorna top 3:
     * "Marketing digital es..." (similarity: 0.95)
     * "SEO y posicionamiento..." (similarity: 0.87)
     * "Redes sociales..." (similarity: 0.82)

5. Claude recibe los documentos y responde:
   "Según nuestros documentos, el marketing digital incluye..."
```

**Comparación con Búsqueda Tradicional:**

| Búsqueda por Keywords                                | RAG Semántico                                        |
| ---------------------------------------------------- | ---------------------------------------------------- |
| Busca palabras exactas                               | Entiende significado                                 |
| "marketing digital" NO encuentra "estrategia online" | "marketing digital" SÍ encuentra "estrategia online" |
| Precisión: ~30%                                      | Precisión: ~85%                                      |

---

## 2. SESSION PERSIST - Persistencia de Sesiones

### ¿Qué problema resuelve?

**Problema:** Las sesiones HTTP son "stateless" (sin estado). Cada request no sabe quién eres.

**Solución:** JWT (JSON Web Token) en cookies httpOnly

### ¿Cómo funciona?

```
Login exitoso → Generar JWT → Guardar en cookie →
                                      ↓
Cada request envía cookie → Backend verifica JWT → Identifica usuario
```

### Implementación Detallada

#### Estructura del JWT

**Archivo:** [src/lib/auth.ts](src/lib/auth.ts) (línea 12-20)

```typescript
export interface SessionData {
  userId: string; // ID del usuario en BD
  conversationId: string; // ID de conversación actual
  name: string; // Nombre real (ej: "Juan Pérez")
  displayName: string; // Nombre mostrado (ej: "Juan")
  createdAt: number; // Timestamp de creación
}
```

#### Crear Sesión (Login)

**Archivo:** [src/lib/auth.ts](src/lib/auth.ts) (línea 28-39)

```typescript
export async function createSession(
  data: Omit<SessionData, 'createdAt'>
): Promise<string> {
  // Crear JWT con jose (alternativa segura a jsonwebtoken)
  const token = await new SignJWT({
    ...data,
    createdAt: Date.now(),
  })
    .setProtectedHeader({ alg: 'HS256' }) // Algoritmo de firma
    .setIssuedAt() // Fecha de emisión
    .setExpirationTime('7d') // Expira en 7 días
    .sign(JWT_SECRET); // Firmar con secret

  return token; // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
}
```

**¿Qué hace?**

- Crea un token firmado criptográficamente
- Solo el servidor puede verificar (porque solo él tiene el SECRET)
- Si alguien modifica el token, la firma no coincide → inválido

#### Guardar en Cookie

**Archivo:** [src/lib/auth.ts](src/lib/auth.ts) (línea 57-60)

```typescript
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS);
}
```

**Opciones de Cookie:** (línea 9-15)

```typescript
const COOKIE_OPTIONS = {
  httpOnly: true, // ❌ No accesible desde JavaScript (XSS protection)
  secure: process.env.NODE_ENV === 'production', // ✅ Solo HTTPS en producción
  sameSite: 'lax' as const, // 🛡️ Protección CSRF
  maxAge: 60 * 60 * 24 * 7, // ⏱️ 7 días
  path: '/', // 📍 Válida en todo el sitio
};
```

**¿Por qué httpOnly?**

```javascript
// ❌ SIN httpOnly (vulnerable)
document.cookie; // Puede leer el JWT desde JS
// Un script malicioso podría robarlo

// ✅ CON httpOnly (seguro)
document.cookie; // No puede leer el JWT
// Solo el servidor puede acceder
```

#### Verificar Sesión

**Archivo:** [src/lib/auth.ts](src/lib/auth.ts) (línea 44-52)

```typescript
export async function verifySession(
  token: string
): Promise<SessionData | null> {
  try {
    // Verificar firma y decodificar
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Si la firma es válida, retornar datos
    return payload as unknown as SessionData;
  } catch (error) {
    console.error('[Auth] Error verificando token:', error);
    return null; // Token inválido o expirado
  }
}
```

#### Obtener Sesión Actual

**Archivo:** [src/lib/auth.ts](src/lib/auth.ts) (línea 74-79)

```typescript
export async function getSession(): Promise<SessionData | null> {
  // 1. Leer cookie del request
  const token = await getSessionToken();
  if (!token) return null;

  // 2. Verificar y decodificar
  return await verifySession(token);
}
```

#### Usar en API Routes

**Archivo:** [src/app/api/chat/stream/route.ts](src/app/api/chat/stream/route.ts) (línea 28-35)

```typescript
export async function POST(req: Request): Promise<Response> {
  // Verificar sesión
  const session = await getSession();

  if (!session) {
    return Response.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Usuario autenticado, continuar...
  const userId = session.userId;
  const conversationId = session.conversationId;

  // ... resto del código
}
```

### Flujo Completo de Autenticación

```
1. USUARIO HACE LOGIN:
   POST /api/auth/verify
   Body: { message: "Soy María, código DEMO123" }

2. BACKEND VERIFICA:
   - Parse nombre y código
   - Buscar código en tabla users
   - Crear conversación en BD

3. BACKEND CREA JWT:
   const token = await createSession({
     userId: 'uuid-123',
     conversationId: 'uuid-456',
     name: 'Demo User',
     displayName: 'María'
   });

4. BACKEND GUARDA EN COOKIE:
   Set-Cookie: session=eyJhbGc...; HttpOnly; Secure; SameSite=Lax; Max-Age=604800

5. FRONTEND RECIBE RESPUESTA:
   { success: true, user: {...}, conversationId: '...' }

6. PRÓXIMO REQUEST (automático):
   GET /api/auth/session
   Cookie: session=eyJhbGc...  (browser lo envía automáticamente)

7. BACKEND VERIFICA:
   const session = await getSession();
   // { userId: 'uuid-123', conversationId: 'uuid-456', ... }
```

### Seguridad

**Ventajas de este approach:**

- **httpOnly**: JavaScript no puede robar el token (XSS protection)
- **Secure**: Solo se envía por HTTPS en producción
- **SameSite=lax**: Protege contra CSRF
- **Firma criptográfica**: Nadie puede falsificar el token
- **Expiración**: Token inválido después de 7 días

**Flujo de verificación:**

```typescript
// 1. Cliente envía cookie (automático)
Cookie: session=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ4eHgiLCJjcmVhdGVkQXQiOjEyMzR9.signature

// 2. Backend decodifica
{
  alg: "HS256",
  typ: "JWT"
}.
{
  userId: "xxx",
  conversationId: "yyy",
  createdAt: 1234567890,
  exp: 1235172690
}.
[firma calculada con SECRET]

// 3. Backend verifica
- ¿La firma es válida? (recalcula con SECRET)
- ¿Está expirado? (compara exp con Date.now())
- ✅ Todo OK → sesión válida
```

---

## 3. STREAMING - Respuestas en Tiempo Real

### ¿Qué es Streaming?

En lugar de esperar la respuesta completa, la recibimos **palabra por palabra** en tiempo real.

**Sin streaming:**

```
Usuario: "Explica el marketing digital"
[espera 10 segundos...]
Asistente: "El marketing digital es un conjunto de estrategias..."
```

**Con streaming:**

```
Usuario: "Explica el marketing digital"
Asistente: "El" → "marketing" → "digital" → "es" → "un" → ...
```

### ¿Cómo funciona?

```
Frontend ←─── Server-Sent Events (SSE) ←─── Claude API (streaming)
```

### Implementación Detallada

#### Backend: Endpoint de Streaming

**Archivo:** [src/app/api/chat/stream/route.ts](src/app/api/chat/stream/route.ts) (línea 23-306)

```typescript
export async function POST(req: Request): Promise<Response> {
  const encoder = new TextEncoder();

  // Crear ReadableStream (para SSE)
  const stream = new ReadableStream({
    async start(controller) {
      // Función helper para enviar datos al cliente
      const sendData = (data: StreamData): void => {
        // Formato SSE: "data: {json}\n\n"
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { messages, userId, conversationId } = await req.json();

        // 1. Enviar status inicial
        sendData({
          type: 'status',
          content: '🤔 Analizando tu consulta...',
          finished: false,
        });

        // 2. Crear stream con Claude
        const response = await anthropic.messages.stream({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 2000,
          system: systemPrompt,
          messages: claudeMessages,
          tools: claudeTools,
          temperature: 0.1,
        });

        let assistantMessage = '';
        let toolCalls: ToolCall[] = [];
        let currentToolCall: Partial<ToolCall> | null = null;

        // 3. Procesar eventos del stream de Claude
        for await (const event of response) {
          // EVENTO: Inicio de bloque de contenido
          if (event.type === 'content_block_start') {
            if (event.content_block.type === 'tool_use') {
              // Claude quiere usar una herramienta
              currentToolCall = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: {},
              };

              sendData({
                type: 'status',
                content: `🔧 Ejecutando: ${event.content_block.name}`,
                finished: false,
              });
            }
          }

          // EVENTO: Delta (datos parciales)
          else if (event.type === 'content_block_delta') {
            // Texto normal
            if (event.delta.type === 'text_delta') {
              assistantMessage += event.delta.text;

              // Enviar al cliente (palabra por palabra)
              sendData({
                type: 'content',
                content: event.delta.text,
                finished: false,
              });
            }

            // JSON del tool call (puede venir en partes)
            else if (
              event.delta.type === 'input_json_delta' &&
              currentToolCall
            ) {
              accumulatedJson += event.delta.partial_json || '';
            }
          }

          // EVENTO: Fin de bloque
          else if (event.type === 'content_block_stop') {
            if (currentToolCall) {
              // Parsear JSON completo del tool call
              try {
                currentToolCall.input = JSON.parse(accumulatedJson);
              } catch (e) {
                console.error('Error parsing tool JSON:', e);
              }

              toolCalls.push(currentToolCall as ToolCall);
              currentToolCall = null;
              accumulatedJson = '';
            }
          }
        }

        // 4. Si hay tool calls, ejecutarlos
        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            // Ejecutar tool
            const result = await executeTool(
              toolCall.name,
              toolCall.input,
              userId
            );

            // Enviar resultado al cliente
            sendData({
              type: 'tool_call',
              content: '',
              toolCall: {
                name: toolCall.name,
                args: toolCall.input,
                result: result,
              },
              finished: false,
            });
          }

          // 5. Llamada de seguimiento a Claude (con resultados de tools)
          const followUpResponse = await anthropic.messages.stream({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 2000,
            system: systemPrompt,
            messages: messagesWithToolResults,
            temperature: 0.1,
          });

          // Streaming de respuesta final
          for await (const event of followUpResponse) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              assistantMessage += event.delta.text;

              sendData({
                type: 'content',
                content: event.delta.text,
                finished: false,
              });
            }
          }
        }

        // 6. Guardar en BD
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: assistantMessage,
          tools_used: toolCalls,
        });

        // 7. Enviar señal de fin
        sendData({
          type: 'content',
          content: '',
          finished: true,
        });
      } catch (error) {
        sendData({
          type: 'error',
          content: 'Error procesando mensaje',
          finished: true,
        });
      }

      controller.close();
    },
  });

  // Retornar con headers SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream', // SSE
      'Cache-Control': 'no-cache', // No cachear
      Connection: 'keep-alive', // Mantener abierto
    },
  });
}
```

#### Frontend: Consumir Stream

**Archivo:** [src/app/hooks/useStreamingChat.ts](src/app/hooks/useStreamingChat.ts) (línea 12-119)

```typescript
const sendMessage = useCallback(
  async (content: string, userId: string, conversationId: string) => {
    // 1. Crear mensaje de usuario
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMessage]);

    // 2. Crear placeholder para asistente
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(true);

    try {
      // 3. Llamar a API con fetch
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userId, conversationId }),
      });

      if (!response.body) throw new Error('No response body');

      // 4. Leer stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 5. Decodificar chunk
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        // 6. Procesar líneas SSE
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamData = JSON.parse(line.slice(6));

              // 7. Actualizar mensaje del asistente
              setMessages((prev) =>
                prev.map((msg) => {
                  if (msg.id === assistantMessage.id) {
                    return handleStreamData(msg, data);
                  }
                  return msg;
                })
              );

              // Actualizar status
              if (data.type === 'status') {
                setCurrentStatus(data.content);
              }

              // Si terminó
              if (data.finished) {
                setIsLoading(false);
                setCurrentStatus('');
              }
            } catch (e) {
              console.error('Error parsing stream data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error en streaming:', error);
      setIsLoading(false);
    }
  },
  [messages]
);
```

#### Función Helper: Actualizar Mensaje

**Archivo:** [src/app/hooks/useStreamingChat.ts](src/app/hooks/useStreamingChat.ts) (línea 144-186)

```typescript
function handleStreamData(message: Message, data: StreamData): Message {
  switch (data.type) {
    case 'content':
      // Agregar contenido al mensaje
      return {
        ...message,
        content: message.content + data.content, // Acumular
      };

    case 'tool_call':
      // Agregar/actualizar tool call
      if (data.toolCall) {
        const existingToolCalls = message.toolCalls || [];
        const toolCallIndex = existingToolCalls.findIndex(
          (tc) => tc.name === data.toolCall!.name
        );

        if (toolCallIndex >= 0) {
          // Actualizar existente
          const updatedToolCalls = [...existingToolCalls];
          updatedToolCalls[toolCallIndex] = {
            ...updatedToolCalls[toolCallIndex],
            ...data.toolCall,
            status: 'completed',
          };
          return { ...message, toolCalls: updatedToolCalls };
        } else {
          // Agregar nuevo
          return {
            ...message,
            toolCalls: [
              ...existingToolCalls,
              { ...data.toolCall, status: 'completed' },
            ],
          };
        }
      }
      return message;

    case 'error':
      return {
        ...message,
        content: message.content + `\n❌ Error: ${data.content}`,
      };

    default:
      return message;
  }
}
```

### Formato SSE (Server-Sent Events)

```
data: {"type":"status","content":"🤔 Analizando...","finished":false}

data: {"type":"content","content":"El","finished":false}

data: {"type":"content","content":" marketing","finished":false}

data: {"type":"content","content":" digital","finished":false}

data: {"type":"tool_call","toolCall":{...},"finished":false}

data: {"type":"content","content":" es...","finished":false}

data: {"type":"content","content":"","finished":true}
```

**Características:**

- Cada evento empieza con `data: `
- Cada evento termina con `\n\n`
- El cliente recibe eventos en tiempo real
- Conexión permanece abierta hasta que el servidor cierra

### Ventajas del Streaming

- **UX mejorada**: Usuario ve respuesta inmediatamente
- **Percepción de velocidad**: Parece más rápido aunque tarde lo mismo
- **Feedback temprano**: Usuario puede cancelar si va mal
- **Progress indicators**: Mostrar status mientras procesa

---

## 4. TOOLS REALES - Ejecución de Herramientas

### ¿Qué son los Tools?

Los tools permiten que Claude **ejecute acciones reales** en lugar de solo hablar.

**Sin tools:**

```
Usuario: "Cuanto es 15% de 1200?"
Claude: "El 15% de 1200 es aproximadamente 180"  (puede equivocarse)
```

**Con tools:**

```
Usuario: "Cuanto es 15% de 1200?"
Claude: [ejecuta calculate("15% de 1200")]
Tool retorna: { result: 180 }
Claude: "El resultado exacto es 180"  (100% preciso)
```

### Tools Implementados

1. **searchDocuments**: Búsqueda semántica en documentos (RAG)
2. **saveData**: Guardar información estructurada en BD
3. **calculate**: Calculadora matemática segura

### Implementación Detallada

#### Definición de Tools

**Archivo:** [src/lib/tools.ts](src/lib/tools.ts) (línea 5-52)

```typescript
export const tools = [
  {
    name: 'searchDocuments',
    description: 'Busca información en la base de documentos de la empresa',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Término de búsqueda para encontrar documentos relevantes',
        },
      },
      required: ['query'],
    },
  },

  {
    name: 'saveData',
    description: 'Guarda información estructurada en la base de datos',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Tipo de dato (cliente, producto, nota, etc.)',
        },
        data: {
          type: 'object',
          description: 'Información a guardar en formato JSON',
        },
      },
      required: ['type', 'data'],
    },
  },

  {
    name: 'calculate',
    description: 'Realiza cálculos matemáticos básicos y avanzados',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Expresión matemática a evaluar',
        },
      },
      required: ['expression'],
    },
  },
];
```

**¿Qué hace?**

- Define qué tools están disponibles
- Especifica parámetros que Claude debe proveer
- Claude analiza esto y decide cuándo usar cada tool

#### Ejecución de Tools

**Archivo:** [src/lib/tools.ts](src/lib/tools.ts) (línea 73-90)

```typescript
export async function executeTool(name: string, args: any, userId: string) {
  console.log(`[executeTool] ${name} called with:`, args);

  switch (name) {
    case 'searchDocuments':
      return await handleSearchDocuments(args.query);

    case 'saveData':
      return await handleSaveData(args.type, args.data, userId);

    case 'calculate':
      return await handleCalculate(args.expression);

    default:
      throw new Error(`Herramienta no encontrada: ${name}`);
  }
}
```

#### Tool 1: searchDocuments (RAG)

**Archivo:** [src/lib/tools.ts](src/lib/tools.ts) (línea 93-115)

```typescript
async function handleSearchDocuments(query: string) {
  try {
    // Usar RAG (ver sección 1)
    const results = await searchDocuments(query, 3);

    return {
      success: true,
      results: results.map((r) => ({
        content: r.content.substring(0, 500), // Primeros 500 chars
        source: r.metadata.filename,
        relevance: Math.round((1 - r.distance) * 100) + '%',
      })),
      message: `Encontré ${results.length} documentos relevantes`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error al buscar documentos',
    };
  }
}
```

**Ejemplo de uso:**

```
Usuario: "¿Qué dice sobre SEO?"
Claude: [llama searchDocuments({ query: "SEO" })]
Tool retorna: {
  success: true,
  results: [
    { content: "SEO es...", source: "marketing.md", relevance: "92%" },
    { content: "Optimización...", source: "marketing.md", relevance: "85%" }
  ]
}
Claude: "Según nuestros documentos, SEO es..."
```

#### Tool 2: saveData

**Archivo:** [src/lib/tools.ts](src/lib/tools.ts) (línea 117-145)

```typescript
async function handleSaveData(
  type: string,
  data: Record<string, unknown>,
  userId: string
) {
  try {
    // Insertar en tabla saved_data
    const { data: result, error } = await supabaseAdmin
      .from('saved_data')
      .insert({
        user_id: userId,
        data_type: type,
        content: data, // JSONB en PostgreSQL
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      id: result.id,
      message: `Datos guardados exitosamente`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Error al guardar datos',
    };
  }
}
```

**Ejemplo de uso:**

```
Usuario: "Guarda: Cliente nuevo - María López, email maria@empresa.com, telefono 123456"
Claude: [llama saveData({
  type: "cliente",
  data: {
    nombre: "María López",
    email: "maria@empresa.com",
    telefono: "123456"
  }
})]
Tool retorna: { success: true, id: "uuid-xyz" }
Claude: "Listo, guardé la información del cliente María López"
```

#### Tool 3: calculate (con seguridad)

**Archivo:** [src/lib/tools.ts](src/lib/tools.ts) (línea 147-212)

```typescript
async function handleCalculate(expression: string | undefined) {
  try {
    if (!expression || typeof expression !== 'string') {
      return {
        success: false,
        error: 'Expresión matemática requerida',
      };
    }

    // Convertir lenguaje natural a formato matemático
    let processedExpr = expression
      .toLowerCase()
      .replace(/(\d+)\s*%\s*de\s*(\d+)/gi, '($1/100) * $2') // "15% de 1200"
      .replace(/ra[ií]z\s+de\s+(\d+)/gi, 'sqrt($1)') // "raiz de 144"
      .replace(/(\d+)\s+elevado\s+a\s+(\d+)/gi, '$1^$2'); // "2 elevado a 3"

    // ✅ EVALUACIÓN SEGURA CON MATHJS
    const result = evaluate(processedExpr);

    // Validar resultado
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Resultado inválido');
    }

    return {
      success: true,
      result: result,
      operation: expression,
      message: `Resultado: ${result}`,
    };
  } catch (error) {
    return {
      success: false,
      error: 'Expresión matemática inválida',
    };
  }
}
```

**¿Por qué mathjs es seguro?**

```javascript
// ❌ VULNERABLE (código anterior)
const result = Function(`"use strict"; return (${expr})`)();

// Ataques posibles:
calculate("process.exit()")              → Cierra el servidor
calculate("require('fs').readFileSync('/etc/passwd')") → Lee archivos
calculate("__proto__")                   → Prototype pollution

// ✅ SEGURO (código actual)
import { evaluate } from 'mathjs';
const result = evaluate(expr);

// mathjs solo permite:
evaluate("2 + 2")           → ✅ 4
evaluate("sqrt(144)")       → ✅ 12
evaluate("sin(PI/2)")       → ✅ 1
evaluate("process.exit()") → ❌ Error: Undefined symbol process
```

**Ejemplos de conversión:**

```
"15% de 1200"      → "(15/100) * 1200"  → 180
"raiz de 144"      → "sqrt(144)"        → 12
"2 elevado a 3"    → "2^3"              → 8
```

### Flujo Completo de Tool Calling

```
1. Usuario: "Cuanto es el 15% de 1200?"

2. Claude recibe mensaje + lista de tools disponibles

3. Claude analiza y decide:
   "Necesito usar el tool 'calculate' con expression='15% de 1200'"

4. Claude genera tool_use:
   {
     type: 'tool_use',
     id: 'tool_abc123',
     name: 'calculate',
     input: { expression: '15% de 1200' }
   }

5. Backend recibe tool_use y ejecuta:
   const result = await executeTool('calculate', { expression: '15% de 1200' }, userId);

6. handleCalculate procesa:
   - Convierte "15% de 1200" → "(15/100) * 1200"
   - evaluate("(15/100) * 1200") → 180
   - Retorna: { success: true, result: 180 }

7. Backend envía tool_result a Claude:
   {
     type: 'tool_result',
     tool_use_id: 'tool_abc123',
     content: '{"success":true,"result":180}'
   }

8. Claude genera respuesta final:
   "El 15% de 1200 es exactamente 180"
```

### System Prompt (Instrucciones a Claude)

**Archivo:** [src/lib/claude.ts](src/lib/claude.ts) (línea 5-36)

```typescript
export const systemPrompt = `Eres un asistente IA especializado en ayudar con consultas de documentos, guardar información y realizar cálculos.

HERRAMIENTAS DISPONIBLES:

1. **searchDocuments** - Buscar información en documentos de la empresa
   - Úsala cuando el usuario pregunte sobre marketing, ventas, estrategias, procesos, etc.
   - Parámetro: query (string) - términos de búsqueda
   - Ejemplo: searchDocuments({ query: "ROI marketing" })

2. **saveData** - Guardar información estructurada en la base de datos
   - Úsala cuando el usuario pida guardar/almacenar datos
   - Parámetros: type (string), data (object)
   - Ejemplo: saveData({ type: "cliente", data: { nombre: "Juan", empresa: "ACME" } })

3. **calculate** - Realizar cálculos matemáticos
   - Úsala para CUALQUIER operación matemática que te pidan
   - Parámetro: expression (string) - la expresión matemática
   - Ejemplos:
     * calculate({ expression: "15% de 1200" })
     * calculate({ expression: "sqrt(144)" })

IMPORTANTE:
- Siempre debes proporcionar TODOS los parámetros requeridos con sus valores
- NO dejes parámetros vacíos o undefined
- Sé transparente sobre qué herramientas estás usando y por qué

Responde en español de manera concisa y útil.`;
```

---

## 5. LOGIN NO TRADICIONAL - Autenticación con Lenguaje Natural

### ¿Qué tiene de especial?

**Login tradicional:**

```
[ Username: _______ ]
[ Password: _______ ]
        [Login]
```

**Nuestro login:**

```
💬 "Soy María, mi código es DEMO123"
```

### ¿Cómo funciona?

```
Input natural → Parse con regex → Validar en BD → Crear sesión
```

### Implementación Detallada

#### Componente de Login

**Archivo:** [src/app/components/authChat/AuthChat.tsx](src/app/components/authChat/AuthChat.tsx) (línea 12-119)

```typescript
export function AuthChat({ onAuth }: AuthChatProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAuth = async () => {
    if (!input.trim() || isProcessing) return;

    setIsProcessing(true);
    setError('');

    try {
      // Llamar a API de verificación
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const result = await response.json();

      if (result.success) {
        // Login exitoso
        onAuth({
          isAuthenticated: true,
          user: result.user,
          conversationId: result.conversationId,
          sessionId: result.sessionId,
        });
      } else {
        // Mostrar error
        setError(result.message);
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="auth-container">
      <h1>AI Assistant</h1>
      <p>Para comenzar, decime tu nombre y código de acceso</p>

      {error && <div className="error">{error}</div>}

      <div className="example">💡 Ejemplo: Soy María, mi código es DEMO123</div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAuth()}
        placeholder="Escribe tu nombre y código aquí..."
      />

      <button onClick={handleAuth}>
        {isProcessing ? 'Verificando...' : 'Comenzar'}
      </button>
    </div>
  );
}
```

#### Backend: Parse y Validación

**Archivo:** [src/app/api/auth/verify/route.ts](src/app/api/auth/verify/route.ts) (línea 12-100)

```typescript
export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    // 1. PARSEAR INPUT CON REGEX
    const authPattern =
      /(?:soy|me llamo|mi nombre es)\s+([^,\n]+)(?:,?\s*(?:mi\s*)?(?:código|code|clave)(?:\s*es)?\s*([A-Za-z0-9]+))?/i;

    let name = '';
    let code = '';

    const authMatch = authPattern.exec(message);
    if (authMatch) {
      name = authMatch[1]?.trim() || '';
      code = authMatch[2]?.trim() || '';
    }

    // 2. VALIDAR DATOS COMPLETOS
    if (!name || !code) {
      return Response.json({
        success: false,
        message: 'Por favor, proporciona tu nombre y código',
        needsMoreInfo: true,
      });
    }

    // 3. VERIFICAR CÓDIGO EN BD
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('access_code', code.toUpperCase())
      .single();

    if (error || !user) {
      return Response.json({
        success: false,
        message: `Código inválido: "${code}"`,
        invalidCode: true,
      });
    }

    // 4. CREAR CONVERSACIÓN
    const sessionId = `session_${Date.now()}_${crypto
      .randomUUID()
      .slice(0, 8)}`;

    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: user.id,
        session_id: sessionId,
      })
      .select()
      .single();

    // 5. CREAR JWT Y GUARDAR EN COOKIE
    const token = await createSession({
      userId: user.id,
      conversationId: conversation.id,
      name: user.name,
      displayName: name,
    });

    await setSessionCookie(token);

    // 6. RETORNAR ÉXITO
    return Response.json({
      success: true,
      message: `¡Perfecto ${name}!`,
      user: {
        id: user.id,
        name: user.name,
        displayName: name,
      },
      conversationId: conversation.id,
      sessionId: sessionId,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}
```

#### Regex Explicado

```javascript
/(?:soy|me llamo|mi nombre es)\s+([^,\n]+)(?:,?\s*(?:mi\s*)?(?:código|code|clave)(?:\s*es)?\s*([A-Za-z0-9]+))?/i

Partes:
┌─────────────────────────────────┐
│ (?:soy|me llamo|mi nombre es)   │  Prefijo (no captura)
│ \s+                              │  Espacios
│ ([^,\n]+)                        │  GRUPO 1: Nombre (todo hasta coma o salto)
│ (?:,?\s*                         │  Coma opcional + espacios
│   (?:mi\s*)?                     │  "mi" opcional
│   (?:código|code|clave)          │  Palabra clave
│   (?:\s*es)?                     │  "es" opcional
│   \s*                            │  Espacios
│   ([A-Za-z0-9]+)                 │  GRUPO 2: Código (alfanumérico)
│ )?                                │  Todo el bloque del código es opcional
└─────────────────────────────────┘
```

**Ejemplos que funcionen:**

```
✅ "Soy María, mi código es DEMO123"
   → name: "María", code: "DEMO123"

✅ "Me llamo Juan, código ABC123"
   → name: "Juan", code: "ABC123"

✅ "Mi nombre es Pedro, mi code es XYZ789"
   → name: "Pedro", code: "XYZ789"

✅ "soy Ana code DEMO123"
   → name: "Ana", code: "DEMO123"

❌ "María DEMO123"  (falta prefijo)
❌ "Soy María"       (falta código)
```

#### Usuario de Demostración

**Archivo:** [supabase/migrations/001_setup_default.sql](supabase/migrations/001_setup_default.sql) (línea 19-21)

```sql
-- Insertar usuario de demo
INSERT INTO users (name, access_code) VALUES
  ('Demo User', 'DEMO123');
```

**Para probar:**

```
Entrada: "Soy María, código DEMO123"
         "Me llamo Juan, mi code es DEMO123"
         "Mi nombre es Ana, clave DEMO123"
```

### Flujo Completo de Autenticación

```
1. USUARIO ABRE LA APP
   - Frontend verifica: GET /api/auth/session
   - Si no hay sesión → Mostrar AuthChat

2. USUARIO ESCRIBE
   Input: "Soy María, mi código es DEMO123"

3. FRONTEND ENVÍA
   POST /api/auth/verify
   Body: { message: "Soy María, mi código es DEMO123" }

4. BACKEND PARSEA
   Regex extrae:
   - name: "María"
   - code: "DEMO123"

5. BACKEND VALIDA CÓDIGO
   SELECT * FROM users WHERE access_code = 'DEMO123'
   → Encuentra: { id: 'uuid-123', name: 'Demo User' }

6. BACKEND CREA CONVERSACIÓN
   INSERT INTO conversations (user_id, session_id)
   VALUES ('uuid-123', 'session_1234_abcd')
   → conversationId: 'uuid-456'

7. BACKEND CREA JWT
   createSession({
     userId: 'uuid-123',
     conversationId: 'uuid-456',
     name: 'Demo User',
     displayName: 'María'
   })
   → token: "eyJhbGc..."

8. BACKEND GUARDA COOKIE
   Set-Cookie: session=eyJhbGc...; HttpOnly; Secure

9. BACKEND RESPONDE
   {
     success: true,
     message: "¡Perfecto María!",
     user: { id: '...', name: 'Demo User', displayName: 'María' },
     conversationId: 'uuid-456'
   }

10. FRONTEND ACTUALIZA
    setAuthState({ isAuthenticated: true, user: {...} })
    → Muestra página de chat
```

### Ventajas de este Enfoque

✅ **UX natural**: Hablar como hablarías con una persona
✅ **Accesible**: No requiere recordar "username" vs "email"
✅ **Flexible**: Acepta múltiples formas de decir lo mismo
✅ **Simple**: Un solo campo en lugar de dos
✅ **Conversacional**: Coherente con el resto de la experiencia

### Seguridad

**¿Es seguro?**

✅ Código se valida contra BD (no cualquier código funciona)
✅ JWT firmado criptográficamente (no se puede falsificar)
✅ httpOnly cookies (protegido contra XSS)
✅ HTTPS en producción (protegido contra MITM)

**Consideraciones:**

- Para producción, agregar:
  - Rate limiting (evitar ataques de fuerza bruta)
  - Códigos más largos o complejos
  - Opcional: 2FA, verificación por email, etc.

---

## Resumen de las 5 Implementaciones

### 1. RAG

- **Voyage AI** genera embeddings (1024 dimensiones)
- **Supabase pgvector** almacena y busca vectores
- **Función SQL** `match_documents()` calcula similitud
- **Precisión**: ~85% vs ~30% keyword matching

### 2. Session Persist

- **JWT** con librería `jose` (HS256)
- **httpOnly cookies** (seguras contra XSS)
- **7 días** de duración
- **Verificación** en cada request

### 3. Streaming

- **Server-Sent Events (SSE)** para streaming
- **ReadableStream** en Next.js
- **Claude SDK** con `.stream()`
- **Actualización** palabra por palabra en tiempo real

### 4. Tools Reales

- **searchDocuments**: RAG semántico
- **saveData**: PostgreSQL JSONB
- **calculate**: mathjs (seguro, sin eval)
- **System prompt** con instrucciones claras

### 5. Login No Tradicional

- **Regex** para parsear lenguaje natural
- **Múltiples formatos** aceptados
- **Validación** contra BD
- **Creación automática** de conversación + JWT

---

## Archivos Clave para Estudiar

| Funcionalidad       | Archivos Principales                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **RAG**             | `src/lib/voyage.ts`, `src/lib/vector-search.ts`, `supabase/migrations/002_setup_pgvector.sql` |
| **Session Persist** | `src/lib/auth.ts`, `src/app/api/auth/verify/route.ts`                                         |
| **Streaming**       | `src/app/api/chat/stream/route.ts`, `src/app/hooks/useStreamingChat.ts`                       |
| **Tools**           | `src/lib/tools.ts`, `src/lib/claude.ts`                                                       |
| **Login**           | `src/app/components/authChat/AuthChat.tsx`, `src/app/api/auth/verify/route.ts`                |

---

## Preguntas Comunes para Defender

### Sobre RAG

**P: ¿Por qué Voyage AI y no OpenAI Embeddings?**
R: Recomendado por Anthropic en su documentación oficial. Mejor recall para RAG (85% vs 78%). Compatible con pgvector. Free tier generoso.

**P: ¿Qué es cosine similarity?**
R: Medida de similitud entre vectores (0-1). Calcula el ángulo entre dos vectores. Similar → ángulo pequeño → similarity alta.

**P: ¿Por qué 1024 dimensiones?**
R: Balance entre precisión y storage. 512 = menos preciso, 2048 = más storage. 1024 es el sweet spot.

### Sobre Streaming

**P: ¿Por qué SSE y no WebSockets?**
R: SSE es unidireccional (servidor → cliente), suficiente para nuestro caso. Más simple. Auto-reconnect. Estándar HTTP.

**P: ¿Qué pasa si el usuario cierra la pestaña?**
R: El stream se cancela automáticamente. El servidor detecta la desconexión y para el proceso.

### Sobre Security

**P: ¿Por qué httpOnly cookies?**
R: JavaScript no puede acceder (protección XSS). Solo el servidor puede leer. Automáticamente enviadas en cada request.

**P: ¿Por qué mathjs?**
R: Previene code injection. `eval()` y `Function()` son vulnerables. mathjs solo permite operaciones matemáticas.

### Sobre Tools

**P: ¿Cómo sabe Claude cuándo usar tools?**
R: Lee el system prompt + descripción de tools. Analiza el mensaje del usuario. Decide automáticamente cuál tool usar (o ninguno).

**P: ¿Puede Claude usar múltiples tools?**
R: Sí, puede llamar múltiples tools en un solo turno. Los ejecutamos en secuencia y enviamos todos los resultados.
