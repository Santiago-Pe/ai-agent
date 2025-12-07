#!/bin/bash

# 🚀 Quick Start - AI Agent Challenge
# Script para verificar y configurar el proyecto

echo "🚀 AI Agent Challenge - Quick Start"
echo "=================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Node modules
echo "📦 Verificando dependencias..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules instalado${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules no encontrado${NC}"
    echo "   Ejecutando: npm install"
    npm install
fi

# Check 2: Variables de entorno
echo ""
echo "🔑 Verificando variables de entorno..."

check_env() {
    if grep -q "^$1=" .env.local 2>/dev/null && [ -n "$(grep "^$1=" .env.local | cut -d'=' -f2)" ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 - FALTA CONFIGURAR${NC}"
        return 1
    fi
}

ENV_OK=true
check_env "ANTHROPIC_API_KEY" || ENV_OK=false
check_env "NEXT_PUBLIC_SUPABASE_URL" || ENV_OK=false
check_env "SUPABASE_SERVICE_ROLE_KEY" || ENV_OK=false
check_env "VOYAGE_API_KEY" || ENV_OK=false
check_env "JWT_SECRET" || ENV_OK=false

if [ "$ENV_OK" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Algunas variables faltan. Edita .env.local${NC}"
    echo ""
    echo "Para generar JWT_SECRET:"
    echo "  node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    echo ""
    echo "Para obtener VOYAGE_API_KEY:"
    echo "  https://www.voyageai.com/"
fi

# Check 3: Supabase pgvector
echo ""
echo "🗄️  Para configurar Supabase:"
echo "   1. Ve a https://supabase.com/dashboard"
echo "   2. SQL Editor → Ejecuta: supabase/migrations/001_setup_pgvector.sql"

# Check 4: Cargar documentos
echo ""
echo "📚 Para cargar documentos en vector DB:"
echo "   npm run init-vector-db"

# Check 5: Iniciar servidor
echo ""
echo "🚀 Para iniciar el servidor:"
echo "   npm run dev"

echo ""
echo "=================================="
echo "✅ Verificación completada"
echo ""
echo "📖 Lee SETUP.md para instrucciones detalladas"
echo ""
