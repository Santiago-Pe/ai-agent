import { addDocument, initializeChroma } from '@/lib/chroma';
import fs from 'fs';
import path from 'path';


async function loadDocuments() {
  await initializeChroma();
  
  const docsDir = path.join(process.cwd(), 'data/documents');
  const files = fs.readdirSync(docsDir);
  
  for (const file of files) {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
      const id = file.replace('.md', '');
      
      await addDocument(id, content, { 
        filename: file,
        type: 'markdown',
        loaded_at: new Date().toISOString()
      });
      
      console.log(`✅ Loaded: ${file}`);
    }
  }
}

loadDocuments().catch(console.error);