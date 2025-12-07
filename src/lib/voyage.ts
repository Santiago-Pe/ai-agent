import { VoyageAIClient } from 'voyageai';

// Cliente de Voyage AI
const voyage = new VoyageAIClient({
  apiKey: process.env.VOYAGE_API_KEY!
});

/**
 * Genera un embedding para un texto usando Voyage AI
 * Modelo: voyage-2 (1024 dimensiones)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await voyage.embed({
      input: text,
      model: 'voyage-2', // 1024 dimensiones, optimizado para RAG
      inputType: 'document' // 'document' para indexar, 'query' para buscar
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No se recibió embedding de Voyage AI');
    }

    const embedding = response.data[0].embedding || []
    return embedding;
  } catch (error) {
    console.error('[Voyage] Error generando embedding:', error);
    throw error;
  }
}

/**
 * Genera embedding para una query de búsqueda
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await voyage.embed({
      input: query,
      model: 'voyage-2',
      inputType: 'query' // Optimizado para queries de búsqueda
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No se recibió embedding de Voyage AI');
    }

    const embedding = response.data[0].embedding || []
    return embedding;
  } catch (error) {
    console.error('[Voyage] Error generando query embedding:', error);
    throw error;
  }
}

/**
 * Genera embeddings en batch (más eficiente)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await voyage.embed({
      input: texts,
      model: 'voyage-2',
      inputType: 'document'
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No se recibieron embeddings de Voyage AI');
    }
    
    const embedding = response.data.map(item => item.embedding)
    return embedding || [];
    
  } catch (error) {
    console.error('[Voyage] Error generando embeddings batch:', error);
    throw error;
  }
}