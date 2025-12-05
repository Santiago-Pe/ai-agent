# AI Agent - Product Engineer Challenge

Asistente IA con autenticación conversacional, RAG, y herramientas integradas.

## 🚀 Demo Live

**URL:** [https://ai-agent-challenge.vercel.app](https://ai-agent-challenge.vercel.app)
**Código demo:** `DEMO123`

## 🛠 Features

- ✅ **Autenticación conversacional** - Sin formularios, solo lenguaje natural
- ✅ **Streaming en tiempo real** - Respuestas token-by-token con SSE
- ✅ **RAG con Chroma** - Búsqueda semántica en documentos
- ✅ **3 Herramientas integradas:**
  - 🔍 Búsqueda en documentos
  - 💾 Guardar información en DB
  - 🧮 Calculadora matemática
- ✅ **Transparencia total** - Visualización de tool executions
- ✅ **Error handling robusto** - Recovery graceful de fallos
- ✅ **Mobile responsive** - Funciona en todos los dispositivos

## 🏗 Arquitectura

```
Frontend (Next.js) ←→ API Routes ←→ OpenAI GPT-4
                          ↓
                    ┌─────────────┐
                    │ Tool Router │
                    └─────────────┘
                          ↓
              ┌─────────────────────────┐
              │  Chroma  │  Supabase   │
              │ (Vector) │ (Postgres)  │
              └─────────────────────────┘
```

## 🚀 Quick Start

```bash
# 1. Clone & Install
git clone [repo-url]
npm install

# 2. Setup Environment
cp .env.example .env.local
# Configurar variables en .env.local

# 3. Initialize
npm run init-docs  # Cargar documentos demo
npm run dev        # Desarrollo local
```

## 🌍 Deploy to Production

```bash
# Vercel (recomendado)
vercel --prod

# Variables de entorno requeridas:
# - OPENAI_API_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

## 🎯 Usage Examples

**Autenticación:**

> "Soy María, mi código es DEMO123"

**RAG Query:**

> "¿Qué dice sobre estrategias de marketing digital?"

**Save Data:**

> "Guardá este cliente: Juan Pérez, email juan@test.com, teléfono 123-456"

**Calculate:**

> "Calculá el 15% de descuento sobre $1200"

---

**Stack:** Next.js 14, OpenAI GPT-4, Supabase, Chroma, Vercel AI SDK
**Author:** [Tu nombre]
**Challenge:** Laburen.com Product Engineer Position
