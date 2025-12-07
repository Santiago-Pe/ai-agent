import { searchDocuments } from './vector-search';
import { supabaseAdmin } from './supabase';
import { evaluate } from 'mathjs';

export const tools = [
  {
    name: 'searchDocuments',
    description: 'Busca información en la base de documentos de la empresa',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Término de búsqueda para encontrar documentos relevantes'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'saveData',
    description: 'Guarda información estructurada en la base de datos',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Tipo de dato (cliente, producto, nota, etc.)'
        },
        data: {
          type: 'object',
          description: 'Información a guardar en formato JSON'
        }
      },
      required: ['type', 'data']
    }
  },
  {
    name: 'calculate',
    description: 'Realiza cálculos matemáticos básicos y avanzados',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Expresión matemática a evaluar (ej: "15% de 1200", "sqrt(144)", "2^3")'
        }
      },
      required: ['expression']
    }
  }
];

// TODO: mover las interfaces a otro archivo.
// Tipos para los argumentos de las herramientas
export interface SearchDocumentsArgs {
  query: string;
}

export interface SaveDataArgs {
  type: string;
  data: Record<string, unknown>;
}

export interface CalculateArgs {
  expression: string;
}

export type ToolArgs = SearchDocumentsArgs | SaveDataArgs | CalculateArgs;

// Ejecutor de herramientas - AGREGAR LOGS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeTool(name: string, args: any, userId: string) {
  console.log(`[executeTool] ${name} called with args:`, JSON.stringify(args, null, 2)); // ← DEBUG
  
  switch (name) {
    case 'searchDocuments':
      return await handleSearchDocuments(args.query);

    case 'saveData':
      return await handleSaveData(args.type, args.data, userId);

    case 'calculate':
      console.log('[executeTool] Calculate args:', args); // ← DEBUG ESPECÍFICO
      return await handleCalculate(args.expression);

    default:
      throw new Error(`Herramienta no encontrada: ${name}`);
  }
}

// Implementaciones específicas
async function handleSearchDocuments(query: string) {
  try {
    const results = await searchDocuments(query, 3);

    return {
      success: true,
      results: results.map(r => ({
        content: r.content.substring(0, 500) + '...',
        source: r.metadata.filename,
        relevance: Math.round((1 - r.distance) * 100) + '%'
      })),
      message: `Encontré ${results.length} documentos relevantes`
    };
  } catch (error) {
    console.error('[searchDocuments] Error al buscar documentos:', error);
    return {
      success: false,
      error: 'Error al buscar documentos',
      message: 'No pude acceder a la base de documentos',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function handleSaveData(type: string, data: Record<string, unknown>, userId: string) {
  try {
    const { data: result, error } = await supabaseAdmin
      .from('saved_data')
      .insert({
        user_id: userId,
        data_type: type,
        content: data
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      id: result.id,
      message: `Datos guardados exitosamente (ID: ${result.id.substring(0, 8)}...)`
    };
  } catch (error) {
    console.error('[saveData] Error al guardar datos:', error);
    return {
      success: false,
      error: 'Error al guardar datos',
      message: 'No pude guardar la información en la base de datos',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function handleCalculate(expression: string | undefined) {
  console.log('[handleCalculate] Received expression:', expression);

  try {
    // Validar que expression existe
    if (!expression || typeof expression !== 'string') {
      console.log('[handleCalculate] Invalid expression:', { expression, type: typeof expression });
      return {
        success: false,
        error: 'Expresión matemática requerida',
        message: 'No se proporcionó una expresión para calcular',
        debug: { received: expression, type: typeof expression }
      };
    }

    console.log('[calculate] Procesando:', expression);

    // Convertir expresiones en lenguaje natural a formato matemático
    let processedExpr = expression
      .toLowerCase()
      // "15% de 1200" → "(15/100) * 1200"
      .replace(/(\d+)\s*%\s*de\s*(\d+)/gi, '($1/100) * $2')
      // "raiz de X" o "raíz de X" → "sqrt(X)"
      .replace(/ra[ií]z\s+de\s+(\d+)/gi, 'sqrt($1)')
      // Potencias: "2 elevado a 3" → "2^3"
      .replace(/(\d+)\s+elevado\s+a\s+(\d+)/gi, '$1^$2');

    console.log('[calculate] Expresión procesada:', processedExpr);

    // Validar que no esté vacía
    if (!processedExpr.trim()) {
      throw new Error('Expresión vacía después del procesamiento');
    }

    // ✅ EVALUACIÓN SEGURA con mathjs (sin eval ni Function)
    // mathjs previene inyección de código y solo permite operaciones matemáticas
    const result = evaluate(processedExpr);

    // Validar resultado
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Resultado inválido: ' + String(result));
    }

    console.log('[calculate] Resultado:', result);

    return {
      success: true,
      result: result,
      operation: expression,
      processedExpression: processedExpr,
      message: `Resultado: ${result}`
    };
  } catch (error) {
    console.error('[calculate] Error al procesar cálculo:', {
      expression,
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return {
      success: false,
      error: 'Expresión matemática inválida',
      message: 'No pude procesar el cálculo solicitado',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}