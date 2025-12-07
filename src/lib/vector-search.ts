import { supabaseAdmin } from './supabase';
import { generateEmbedding, generateQueryEmbedding } from './voyage';

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  distance: number;
}

/**
 * Agrega un documento a la base vectorial
 */
export async function addDocument(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<{ id: string; success: boolean }> {
  try {
    console.log('[VectorSearch] Generando embedding para documento...');

    // Generar embedding con Voyage AI
    const embedding = await generateEmbedding(content);

    console.log('[VectorSearch] Embedding generado, insertando en BD...');

    // Insertar en Supabase
    const { data, error } = await supabaseAdmin
      .from('document_embeddings')
      .insert({
        content,
        embedding: JSON.stringify(embedding), // pgvector acepta arrays como strings
        metadata: {
          ...metadata,
          added_at: new Date().toISOString()
        }
      })
      .select('id')
      .single();

    if (error) {
      console.error('[VectorSearch] Error insertando documento:', error);
      throw error;
    }

    console.log(`[VectorSearch] ✅ Documento agregado: ${data.id}`);

    return { id: data.id, success: true };
  } catch (error) {
    console.error('[VectorSearch] Error en addDocument:', error);
    throw error;
  }
}

/**
 * Agrega múltiples documentos (batch)
 */
export async function addDocumentsBatch(
  documents: Array<{ content: string; metadata?: Record<string, unknown> }>
): Promise<{ count: number; success: boolean }> {
  try {
    console.log(`[VectorSearch] Procesando ${documents.length} documentos en batch...`);

    // Generar todos los embeddings en paralelo (más eficiente)
    const embeddings = await Promise.all(
      documents.map(doc => generateEmbedding(doc.content))
    );

    // Preparar datos para inserción
    const rows = documents.map((doc, i) => ({
      content: doc.content,
      embedding: JSON.stringify(embeddings[i]),
      metadata: {
        ...doc.metadata,
        added_at: new Date().toISOString()
      }
    }));

    // Insertar todos a la vez
    const { error, count } = await supabaseAdmin
      .from('document_embeddings')
      .insert(rows);

    if (error) {
      console.error('[VectorSearch] Error insertando batch:', error);
      throw error;
    }

    console.log(`[VectorSearch] ✅ ${count} documentos agregados`);

    return { count: count || 0, success: true };
  } catch (error) {
    console.error('[VectorSearch] Error en addDocumentsBatch:', error);
    throw error;
  }
}

/**
 * Busca documentos similares usando búsqueda vectorial
 */
export async function searchDocuments(
  query: string,
  nResults: number = 3,
  threshold: number = 0.5
): Promise<SearchResult[]> {
  try {
    console.log('[VectorSearch] Buscando:', query);

    // Generar embedding de la query
    const queryEmbedding = await generateQueryEmbedding(query);

    console.log('[VectorSearch] Embedding de query generado, buscando...');

    // Buscar usando la función de Postgres
    const { data, error } = await supabaseAdmin.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: threshold,
      match_count: nResults
    });

    if (error) {
      console.error('[VectorSearch] Error en búsqueda:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('[VectorSearch] No se encontraron resultados');
      return [];
    }

    // Mapear resultados
    const results: SearchResult[] = data.map((row: {
      id: string;
      content: string;
      metadata: Record<string, unknown>;
      similarity: number;
    }) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata,
      similarity: row.similarity,
      distance: 1 - row.similarity
    }));

    console.log(`[VectorSearch] ✅ Encontrados ${results.length} resultados`);

    return results;
  } catch (error) {
    console.error('[VectorSearch] Error en searchDocuments:', error);
    throw error;
  }
}

/**
 * Elimina todos los documentos (útil para re-indexar)
 */
export async function clearAllDocuments(): Promise<{ success: boolean }> {
  try {
    const { error } = await supabaseAdmin
      .from('document_embeddings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

    if (error) throw error;

    console.log('[VectorSearch] ✅ Todos los documentos eliminados');
    return { success: true };
  } catch (error) {
    console.error('[VectorSearch] Error eliminando documentos:', error);
    throw error;
  }
}

/**
 * Cuenta documentos en la base
 */
export async function countDocuments(): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('[VectorSearch] Error contando documentos:', error);
    return 0;
  }
}