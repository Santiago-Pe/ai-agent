import { execSync } from 'child_process';

console.log('🚀 Setting up deployment...');

const requiredEnvs = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL', 
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('✅ Checking environment variables...');
const missing = requiredEnvs.filter(env => !process.env[env]);
if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing);
  process.exit(1);
}

console.log('✅ Building project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build failed', error);
  process.exit(1);
}

console.log('✅ Initializing documents in Chroma...');
try {
  execSync('npm run init-docs', { stdio: 'inherit' });
} catch (error) {
  console.warn('⚠️  Document initialization failed, continuing...', error);
}

console.log('🎉 Deployment ready!');