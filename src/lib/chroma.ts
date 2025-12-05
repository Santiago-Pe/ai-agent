import fs from 'fs';

// Simulación de vector DB con archivos JSON
const DOCS_DB_PATH = './data/docs-db.json';

interface DocumentMetadata {
  added_at: string;
  source_document?: string;
  similarity_score?: number;
  [key: string]: string | number | boolean | undefined;
}

interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  chunks: string[];
}

let documentsDB: Document[] = [];

export async function initializeChroma() {
  try {
    if (fs.existsSync(DOCS_DB_PATH)) {
      const data = fs.readFileSync(DOCS_DB_PATH, 'utf-8');
      documentsDB = JSON.parse(data);
    } else {
      documentsDB = [];
      fs.writeFileSync(DOCS_DB_PATH, JSON.stringify(documentsDB, null, 2));
    }
    console.log(`📚 Loaded ${documentsDB.length} documents`);
    return true;
  } catch (error) {
    console.error('Error initializing docs DB:', error);
    return false;
  }
}

export async function addDocument(id: string, content: string, metadata: Record<string, string | number | boolean>) {
  // Chunking simple del contenido
  const chunks = content
    .split('\n\n')
    .filter(chunk => chunk.trim().length > 0)
    .map(chunk => chunk.trim());

  const document: Document = {
    id,
    content,
    metadata: {
      ...metadata,
      added_at: new Date().toISOString()
    },
    chunks
  };

  // Remover documento existente si existe
  documentsDB = documentsDB.filter(doc => doc.id !== id);
  
  // Agregar nuevo documento
  documentsDB.push(document);
  
  // Guardar en archivo
  fs.writeFileSync(DOCS_DB_PATH, JSON.stringify(documentsDB, null, 2));
  
  console.log(`✅ Added document: ${id}`);
}

interface SearchResult {
  content: string;
  metadata: DocumentMetadata;
  distance: number;
}

export async function searchDocuments(query: string, nResults: number = 3): Promise<SearchResult[]> {
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  // Búsqueda simple por keywords (en lugar de embeddings)
  for (const doc of documentsDB) {
    for (const chunk of doc.chunks) {
      const chunkLower = chunk.toLowerCase();
      
      // Calcular "similitud" simple por keywords comunes
      const queryWords = queryLower.split(' ').filter(w => w.length > 2);
      const matches = queryWords.filter(word => chunkLower.includes(word));
      const similarity = matches.length / queryWords.length;
      
      if (similarity > 0.3) { // Threshold mínimo
        results.push({
          content: chunk,
          metadata: {
            ...doc.metadata,
            source_document: doc.id,
            similarity_score: similarity
          },
          distance: 1 - similarity
        });
      }
    }
  }

  // Ordenar por similitud (menor distancia = mayor similitud)
  results.sort((a, b) => a.distance - b.distance);
  
  return results.slice(0, nResults);
}