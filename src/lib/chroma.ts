// lib/chroma.ts
import { ChromaClient, Collection, Metadata } from 'chromadb';

const client = new ChromaClient({
  path: process.env.NODE_ENV === 'production'
    ? 'https://your-app.vercel.app'
    : 'http://localhost:3000'
});

let collection: Collection | null = null;

export async function initializeChroma() {
  try {
    collection = await client.createCollection({
      name: 'documents',
      metadata: { 'hnsw:space': 'cosine' }
    });
  } catch (error) {
    // Collection already exists
    console.log(`Error: ${error}`)
    collection = await client.getCollection({ name: 'documents' });
  }
  return collection;
}

export async function addDocument(id: string, content: string, metadata: Metadata) {
  if (!collection) await initializeChroma();

  await collection!.add({
    ids: [id],
    documents: [content],
    metadatas: [metadata]
  });
}

export async function searchDocuments(query: string, nResults: number = 3) {
  if (!collection) await initializeChroma();

  const results = await collection!.query({
    queryTexts: [query],
    nResults
  });

  return results.documents[0]?.map((doc, idx) => ({
    content: doc || '',
    metadata: results.metadatas?.[0]?.[idx] || null,
    distance: results.distances?.[0]?.[idx] || null
  })) || [];
}