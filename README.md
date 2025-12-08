# AI Agent - Product Engineer Challenge

Asistente IA con autenticación conversacional, RAG sobre documentos, y herramientas integradas.

## 🚀 Demo Live

**URL:** [https://ai-agent-challenge.vercel.app](https://ai-agent-challenge.vercel.app)
**Código demo:** `DEMO123`

Probá escribiendo: _"Soy Juan, mi código es DEMO123"_

---

## 📋 Tabla de Contenidos

- [Features](#-features)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Variables de Entorno](#-variables-de-entorno)
- [Inicialización de Base de Datos](#-inicialización-de-base-de-datos)
- [Cargar Documentos RAG](#-cargar-documentos-rag)
- [Correr el Proyecto](#-correr-el-proyecto)
- [Deploy a Producción](#-deploy-a-producción)
- [Uso del Chat](#-uso-del-chat)
- [Arquitectura](#-arquitectura)
- [Documentación Técnica](#-documentación-técnica)

---

## ✨ Features

- ✅ **Autenticación conversacional** - Sin formularios, solo lenguaje natural
- ✅ **Streaming en tiempo real** - Respuestas token-by-token con Server-Sent Events
- ✅ **RAG con VoyageAI** - Búsqueda semántica sobre documentos
- ✅ **3 Herramientas integradas:**
  - 🔍 **search_documents** - Búsqueda semántica en base vectorial
  - 💾 **save_data** - Guardar información estructurada en PostgreSQL
  - 🧮 **calculator** - Evaluación segura de expresiones matemáticas
- ✅ **Transparencia total** - Visualización en tiempo real de tool executions
- ✅ **Error handling robusto** - Recovery graceful de fallos con retry logic
- ✅ **Sesiones persistentes** - JWT httpOnly cookies + PostgreSQL
- ✅ **Mobile responsive** - Optimizado para todos los dispositivos

---

## 🛠 Stack Tecnológico

### Frontend

- **Next.js 16.0.7** (App Router)
- **React 19.2.0** (Server Components)
- **TypeScript**
- **Tailwind CSS**
- **Lucide Icons**

### Backend

- **Next.js API Routes** (Edge Functions)
- **Anthropic Claude 3.5 Sonnet** (LLM)
- **Supabase** (PostgreSQL + pgvector)
- **VoyageAI** (Embeddings - 1024 dimensiones)
- **Jose** (JWT Authentication)

### Infrastructure

- **Vercel** (Hosting + Edge Network)

---

## 🚀 Instalación y Configuración

### Prerequisitos

- **Node.js** 18+ y npm
- Cuentas en:
  - [Supabase](https://supabase.com) (necesario pgvector habilitado)
  - [Anthropic](https://console.anthropic.com)
  - [VoyageAI](https://www.voyageai.com)

---

### 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/tu-usuario/ai-agent-challenge.git
cd ai-agent-challenge
```

---

### 2️⃣ Instalar Dependencias

```bash
npm install
```

---

### 3️⃣ Configurar Servicios Externos

#### **A. Crear Proyecto en Supabase**

1. Andá a [Supabase](https://supabase.com) y creá un nuevo proyecto
2. Esperá a que se inicialice (1-2 minutos)
3. Guardá estas credenciales (las vas a necesitar):
   - **Project URL**: `Settings → API → Project URL`
   - **anon/public key**: `Settings → API → anon public`
   - **service_role key**: `Settings → API → service_role` (⚠️ secreta)

#### **B. Obtener API Key de Anthropic**

1. Andá a [Anthropic Console](https://console.anthropic.com)
2. Creá una cuenta o iniciá sesión
3. Andá a `API Keys` y creá una nueva key
4. Copiá la key (empieza con `sk-ant-...`)

#### **C. Obtener API Key de VoyageAI**

1. Andá a [VoyageAI](https://www.voyageai.com)
2. Creá una cuenta
3. Andá a tu dashboard y copiá la API key

#### **D. Generar JWT Secret**

Ejecutá este comando para generar un secret aleatorio:

```bash
openssl rand -base64 32
```

O usá Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔐 Variables de Entorno

Creá un archivo `.env.local` en la raíz del proyecto:

```bash
cp .env.example .env.local
```

Completá con tus credenciales:

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# JWT Authentication
JWT_SECRET=tu_secret_generado_con_openssl

# VoyageAI (para embeddings)
VOYAGE_API_KEY=pa-xxxxx

```

---

## 🗄️ Inicialización de Base de Datos

### 1. Habilitar pgvector en Supabase

Primero necesitás habilitar la extensión pgvector:

1. Andá a tu proyecto en Supabase
2. **SQL Editor** (menú izquierdo)
3. Ejecutá esta query:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Crear Tablas y Schema

Ejecutá las migraciones en orden:

#### **Migración 1: Tablas principales**

```sql
-- Crear tablas
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  access_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tools_used JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE saved_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  data_type TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar usuario demo
INSERT INTO users (name, access_code)
VALUES ('Demo User', 'DEMO123')
ON CONFLICT (access_code) DO NOTHING;
```

#### **Migración 2: Setup de Vector Search**

```sql
-- Tabla para almacenar embeddings de documentos
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding vector(1024), -- Voyage AI usa 1024 dimensiones
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsqueda vectorial (cosine distance)
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx
ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Índice para búsqueda por metadata
CREATE INDEX IF NOT EXISTS document_embeddings_metadata_idx
ON document_embeddings
USING gin (metadata);

-- Función para buscar documentos similares
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_embeddings_updated_at
  BEFORE UPDATE ON document_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**💡 Tip:** También podés copiar y pegar directamente los archivos de `supabase/migrations/` en el SQL Editor.

---

## 📚 Cargar Documentos para RAG

El sistema usa **VoyageAI** para generar embeddings y **Supabase (pgvector)** como vector store.

### 1. Preparar tus documentos

1. Creá el directorio `data/documents/` en la raíz del proyecto:

```bash
mkdir -p data/documents
```

2. Agregá tus archivos `.md` (Markdown) en ese directorio:

```bash
data/documents/
├── marketing-digital.md
├── estrategias-ventas.md
└── guia-productos.md
```

**Formato recomendado:**

```markdown
# Título del Documento

## Sección 1

Contenido del párrafo 1 con información relevante...

## Sección 2

Contenido del párrafo 2 con más información...
```

### 2. Ejecutar el script de carga

Una vez que tengas tus documentos `.md` listos:

```bash
npm run init-vector-db
```

**Qué hace este script:**

1. Lee todos los archivos `.md` de `data/documents/`
2. Divide cada documento en chunks (por párrafos)
3. Genera embeddings con VoyageAI (1024 dimensiones)
4. Almacena los embeddings en Supabase con pgvector

**Salida esperada:**

```
🚀 Iniciando carga de documentos...

📁 Encontrados 3 archivos markdown:

   📄 marketing-digital.md (2450 chars)
      → 8 chunks generados
   📄 estrategias-ventas.md (1820 chars)
      → 6 chunks generados
   📄 guia-productos.md (3100 chars)
      → 10 chunks generados

📦 Total de chunks a procesar: 24

⚙️  Generando embeddings y cargando en Supabase...
   (esto puede tomar unos segundos)

✅ ¡Carga completada exitosamente!
   📊 24 documentos agregados

📚 Total de documentos en la base: 24
```

### 3. (Opcional) Limpiar y recargar

Si querés borrar todos los documentos y empezar de nuevo:

```bash
npm run init-vector-db -- --clear
```

### 4. Verificar la carga

Podés verificar en Supabase SQL Editor:

```sql
-- Ver total de documentos
SELECT COUNT(*) FROM document_embeddings;

-- Ver algunos ejemplos
SELECT
  id,
  LEFT(content, 100) as preview,
  metadata->>'filename' as filename
FROM document_embeddings
LIMIT 10;
```

---

## 🏃 Correr el Proyecto

### Modo Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

### Build de Producción (local)

```bash
npm run build
npm start
```

---

## 🌍 Deploy a Producción

### Deploy en Vercel (Recomendado)

#### 1. Instalar Vercel CLI (opcional)

```bash
npm i -g vercel
```

#### 2. Conectar con GitHub

1. Subí tu código a GitHub
2. Andá a [Vercel](https://vercel.com)
3. Click en **"New Project"**
4. Importá tu repositorio de GitHub
5. Vercel detectará automáticamente Next.js

#### 3. Configurar Variables de Entorno en Vercel

En el dashboard de Vercel:

1. **Settings → Environment Variables**
2. Agregá **todas** las variables del `.env.local`:

   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `VOYAGE_API_KEY`

3. Asegurate de que estén marcadas para **Production**, **Preview**, y **Development**
