import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Cargar variables de entorno desde .env.local PRIMERO
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

/**
 * Script para cargar documentos markdown en la base vectorial
 * Uso: npm run init-vector-db
 */
async function loadDocuments() {
  try {
    // Importar dinámicamente después de cargar variables de entorno
    const { addDocumentsBatch, clearAllDocuments, countDocuments } = await import('../src/lib/vector-search');

    console.log('🚀 Iniciando carga de documentos...\n');

    // 1. Limpiar base de datos existente (opcional)
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      console.log('🗑️  Limpiando documentos existentes...');
      await clearAllDocuments();
      console.log('✅ Base limpia\n');
    }

    // 2. Leer documentos del directorio
    const docsDir = path.join(process.cwd(), 'data/documents');

    if (!fs.existsSync(docsDir)) {
      console.error('❌ Directorio data/documents no existe');
      process.exit(1);
    }

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

    if (files.length === 0) {
      console.error('❌ No se encontraron archivos .md en data/documents');
      process.exit(1);
    }

    console.log(`📁 Encontrados ${files.length} archivos markdown:\n`);

    // 3. Procesar cada archivo en chunks
    const documentsToAdd: Array<{
      content: string;
      metadata: Record<string, unknown>;
    }> = [];

    for (const file of files) {
      const filePath = path.join(docsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      console.log(`   📄 ${file} (${content.length} chars)`);

      // Chunking: dividir por párrafos
      const chunks = content
        .split('\n\n')
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 50); // Solo chunks con contenido significativo

      console.log(`      → ${chunks.length} chunks generados`);

      // Agregar cada chunk como documento individual
      for (let i = 0; i < chunks.length; i++) {
        documentsToAdd.push({
          content: chunks[i],
          metadata: {
            filename: file,
            source: file.replace('.md', ''),
            chunk_index: i,
            total_chunks: chunks.length,
            type: 'markdown'
          }
        });
      }
    }

    console.log(`\n📦 Total de chunks a procesar: ${documentsToAdd.length}\n`);

    // 4. Cargar documentos en la base vectorial
    console.log('⚙️  Generando embeddings y cargando en Supabase...');
    console.log('   (esto puede tomar unos segundos)\n');

    const { count, success } = await addDocumentsBatch(documentsToAdd);

    if (success) {
      console.log(`\n✅ ¡Carga completada exitosamente!`);
      console.log(`   📊 ${count} documentos agregados\n`);

      // Verificar total
      const total = await countDocuments();
      console.log(`📚 Total de documentos en la base: ${total}\n`);
    }

  } catch (error) {
    console.error('\n❌ Error durante la carga:', error);
    console.error('\nPosibles causas:');
    console.error('1. VOYAGE_API_KEY no configurada en .env.local');
    console.error('2. Supabase no disponible o mal configurado');
    console.error('3. Tabla document_embeddings no existe (ejecutar migración SQL)');
    console.error('\n💡 Verifica:');
    console.error('   - Variables de entorno en .env.local');
    console.error('   - Migración SQL ejecutada en Supabase');
    console.error('   - Conexión a internet (Voyage AI)\n');
    process.exit(1);
  }
}

// Ejecutar
loadDocuments().catch(console.error);