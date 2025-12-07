# DOCUMENTACIÓN TÉCNICA - AI AGENT CHALLENGE

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Justificación de Tecnologías](#justificación-de-tecnologías)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Dependencias Principales](#dependencias-principales)

---

## Visión General

Este proyecto es un **AI Agent conversacional** que implementa:

- **RAG (Retrieval-Augmented Generation)** con búsqueda semántica real
- **Streaming** de respuestas en tiempo real
- **Tool calling** para ejecutar acciones reales (búsqueda, cálculos, guardar datos)
- **Autenticación no tradicional** con lenguaje natural
- **Persistencia de sesiones** con JWT

```bash
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND + BACKEND                    │
│                      Next.js 16                          │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │   React 19      │  │   API Routes (Node.js)       │ │
│  │   - UI Chat     │  │   - /api/chat/stream         │ │
│  │   - Components  │  │   - /api/auth/*              │ │
│  │   - SSE Client  │  │   - Server-Sent Events       │ │
│  └─────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────┴───────────────┐
        ↓                               ↓
┌──────────────────┐          ┌──────────────────┐
│   Anthropic API  │          │    Supabase      │
│  Claude 3.5      │          │  ┌─────────────┐ │
│  - Streaming     │          │  │ PostgreSQL  │ │
│  - Tool Calling  │          │  └─────────────┘ │
└──────────────────┘          │  ┌─────────────┐ │
        ↓                      │  │  pgvector   │ │
┌──────────────────┐          │  └─────────────┘ │
│   Voyage AI      │          └──────────────────┘
│  - Embeddings    │
│  - 1024 dims     │
└──────────────────┘
```

---

## Stack Tecnológico

| Componente     | Tecnología                       | Versión   |
| -------------- | -------------------------------- | --------- |
| **Framework**  | Next.js                          | 16.0      |
| **UI Library** | React                            | 19.0      |
| **Language**   | TypeScript                       | 5.x       |
| **LLM**        | Anthropic Claude                 | 3.5 Haiku |
| **Embeddings** | Voyage AI                        | voyage-2  |
| **Database**   | Supabase (PostgreSQL + pgvector) | -         |
| **Styling**    | Tailwind CSS                     | 4.0       |
| **Auth**       | JWT (jose)                       | 6.1.3     |

---

## Justificación de Tecnologías

### 1. Next.js 16 + TypeScript + Node.js

**¿Por qué Next.js?**

- **Full-stack unificado**: Frontend y backend en un solo proyecto
- **API Routes nativas**: No necesita servidor separado
- **Streaming nativo**: Soporte para Server-Sent Events (SSE) con Suspense
- **Deployment atómico**: Un solo build para todo el proyecto
- **Shared types**: TypeScript compartido entre frontend y backend
- **Vercel deployment**: Deployment automático y optimizado

**¿Qué resuelve?**

- Elimina complejidad de tener proyectos separados (React + Express)
- Reduce duplicación de código (tipos, interfaces)
- Facilita el desarrollo y deployment
- Optimización automática de SSR/SSG
- Built-in support para streaming de respuestas AI

**Archivos clave:**

- `src/app/page.tsx` - Página principal del chat
- `src/app/api/chat/stream/route.ts` - Endpoint de streaming
- `src/app/api/auth/verify/route.ts` - Autenticación

---

### 2. React 19

**¿Por qué React 19?**

- **Concurrent features**: Suspense para streaming
- **Hooks avanzados**: `useCallback`, `useRef` para optimizaciones
- **Error Boundaries**: Manejo robusto de errores
- **Server Components**: Renderizado eficiente

**¿Qué resuelve?**

- UI reactiva y fluida para streaming de mensajes
- Componentes reutilizables y mantenibles
- Performance optimizada con virtual DOM
- Ecosistema maduro de librerías

**Componentes principales:**

- `src/app/components/message/Message.tsx` - Componente de mensaje
- `src/app/components/chatInput/ChatInput.tsx` - Input del chat
- `src/app/hooks/useStreamingChat.ts` - Hook para streaming

---

### 3. Anthropic Claude 3.5 Haiku

**¿Por qué Claude?**

- **Streaming nativo excelente**: Soporte first-class para streaming
- **Tool calling robusto**: Ejecución de herramientas externas
- **Latencia baja**: Respuestas rápidas (crítico para chat)
- **SDK oficial**: `@anthropic-ai/sdk` bien documentado
- **Ventana de contexto grande**: 200K tokens

**¿Qué resuelve?**

- Respuestas inteligentes y coherentes
- Ejecución de tools (búsqueda, cálculos, guardar datos)
- Streaming palabra por palabra (mejor UX)
- Soporte multi-turn conversation

**Modelo usado:** `claude-3-5-haiku-20241022`

**Archivo clave:**

- `src/lib/claude.ts` - Cliente y system prompt

---

### 4. Supabase (PostgreSQL + pgvector)

**¿Por qué Supabase?**

```
Supabase = PostgreSQL (relacional)
         + pgvector (búsqueda vectorial)
         + Auth (autenticación)
         + Storage (archivos)
         + Realtime (subscriptions)
         + Edge Functions
```

**Beneficios:**

- **Todo-en-uno**: Base de datos + vectores + auth
- **pgvector nativo**: Búsqueda vectorial en PostgreSQL
- **RESTful API automática**: Acceso directo desde frontend
- **Migrations fáciles**: Control de versiones del schema
- **Free tier generoso**: Ideal para desarrollo y POCs

**¿Qué resuelve?**

- Almacenamiento relacional (usuarios, mensajes, conversaciones)
- Búsqueda vectorial semántica (RAG real)
- Funciones SQL personalizadas (match_documents)
- Escalabilidad y performance

**Tablas principales:**

- `users` - Usuarios del sistema
- `conversations` - Sesiones de chat
- `messages` - Historial de mensajes
- `document_embeddings` - Vectores para RAG
- `saved_data` - Datos guardados por el usuario

**Migrations:**

- `supabase/migrations/001_setup_default.sql` - Schema base
- `supabase/migrations/002_setup_pgvector.sql` - Extensión pgvector

---

### 5. Voyage AI (Embeddings)

**¿Por qué Voyage AI?**

[Documentación oficial de Anthropic sobre RAG](https://www.anthropic.com/engineering/contextual-retrieval)

**Problema:**

- Anthropic Claude es excelente para LLM
- Pero **NO** ofrece API de embeddings propios
- RAG requiere embeddings para búsqueda semántica

**Solución: Voyage AI**

1. **Recomendado por Anthropic** en su documentación oficial
2. **Optimizado para RAG** (mejor recall que OpenAI Embeddings)
3. **Free tier generoso** (1000 requests/día gratis)
4. **Dimensiones óptimas** (1024 = balance entre precisión y storage)
5. **Compatible con pgvector** (soporta hasta 2000 dimensiones)

**¿Qué resuelve?**

- Convierte texto en vectores numéricos (embeddings)
- Permite búsqueda semántica (no solo keywords)
- Entiende significado, no solo palabras exactas
- Ejemplo: "aumentar ventas" encuentra "mejorar ingresos"

**Modelo usado:** `voyage-2` (1024 dimensiones)

**Archivo clave:**

- `src/lib/voyage.ts` - Cliente Voyage AI
- `src/lib/vector-search.ts` - Búsqueda semántica

---

### 6. mathjs (Calculadora Segura)

**¿Qué resuelve?**

✅ Evaluación matemática **100% segura**
✅ Previene inyección de código
✅ Soporta operaciones avanzadas (sqrt, sin, cos, etc.)
✅ Parsing de lenguaje natural ("15% de 1200")

**Archivo clave:**

- `src/lib/tools.ts` - Función `handleCalculate`

---

### 7. jose (JWT)

**¿Por qué jose?**

- **Alternativa moderna a jsonwebtoken**: Más seguro y performante
- **Compatible con Edge Runtime**: Funciona en Vercel Edge
- **TypeScript nativo**: Tipado completo
- **Estándares web**: Usa Web Crypto API

**¿Qué resuelve?**

- Sesiones persistentes con JWT
- httpOnly cookies (seguras contra XSS)
- Duración de 7 días
- Verificación en cada request

**Archivo clave:**

- `src/lib/auth.ts` - Funciones de sesión

---

## Arquitectura del Sistema

### Flujo de una Consulta con RAG

```
1. Usuario: "¿Qué dice sobre marketing digital?"
   ↓
2. Frontend envía mensaje a /api/chat/stream
   ↓
3. Backend:
   - Recibe mensaje
   - Claude analiza y decide usar tool "searchDocuments"
   ↓
4. Tool Execution:
   - Voyage AI genera embedding de "marketing digital"
   - Supabase busca documentos similares con pgvector
   - Retorna top 3 documentos
   ↓
5. Claude recibe resultados y genera respuesta
   ↓
6. Streaming de respuesta palabra por palabra
   ↓
7. Frontend actualiza UI en tiempo real
```

### Estructura de Carpetas

```
/ai-agent-challenge/
├── /src/
│   ├── /app/
│   │   ├── /api/              # Backend (Next.js API Routes)
│   │   │   ├── /auth/         # Autenticación
│   │   │   └── /chat/         # Streaming de chat
│   │   ├── /components/       # Componentes React (18 archivos)
│   │   ├── /hooks/            # Custom hooks
│   │   └── /types/            # TypeScript types
│   └── /lib/                  # Servicios compartidos
│       ├── claude.ts          # Cliente Claude + prompt
│       ├── tools.ts           # Tools disponibles
│       ├── vector-search.ts   # Búsqueda semántica
│       ├── voyage.ts          # Cliente Voyage AI
│       └── auth.ts            # Manejo de JWT
├── /supabase/
│   └── /migrations/           # Migraciones SQL
├── /scripts/
│   └── init-vector-db.ts      # Carga de documentos
└── /data/
    └── /documents/            # Documentos para RAG
```

## Recursos y Documentación

### Documentación Oficial

- [Voyage AI](https://docs.voyageai.com/docs/introduction)
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [React](https://react.dev/)
- [Claude API](https://platform.claude.com/docs/en/home)
- [Node.js](https://nodejs.org/docs/latest/api/)
- [Anthropic - Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)

### Guías Relacionadas

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [mathjs Documentation](https://mathjs.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---
