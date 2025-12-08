# Mejoras y Features Futuras

Roadmap de mejoras técnicas y funcionales priorizadas para el proyecto AI Agent.

---

## 🔧 DevOps & CI/CD

### Pipeline de Deploy

- **Deploy solo en merge a main**: Configurar Vercel para deployar únicamente cuando se hace merge a `main`
- **Protección de branch main**: Requerir PR reviews antes de merge
- **Tests en CI**: Pipeline de tests unitarios (Jest) que bloquee merge si fallan

### Quality & Seguridad

- **Pre-commit hooks**: Husky + lint-staged para ejecutar linting antes de commit

---

## 📊 Observabilidad

### Logging

- **Structured logging**: Winston/Pino con formato JSON estructurado
- **Error tracking**: Sentry para capturar errores con stack traces
- **Request tracing**: Correlation IDs para seguir requests end-to-end

### Métricas de Negocio

- **Dashboard de costos**:

  - Consumo de tokens de Anthropic por día/semana
  - Costo estimado por conversación
  - Alertas cuando se excede threshold mensual

- **Métricas de uso**:
  - Conversaciones por día
  - Mensajes por conversación (promedio)
  - Tools más utilizadas
  - Tasa de error por endpoint

---

## 🚀 Features Funcionales

### Mejoras de Chat

- **Historial de conversaciones**: Sidebar con conversaciones pasadas
- **Regenerar respuesta**: Editar mensaje anterior y regenerar desde ahí
- **Export de conversación**: Descargar chat como Markdown o PDF
- **Compartir conversación**: Link público para compartir chat

### Gestión de Documentos

- **Upload de archivos**: Subir PDFs/DOCX y indexarlos automáticamente
- **Chunking mejorado**: Implementar semantic chunking (LangChain)
- **Metadata filtering**: Filtrar búsquedas por fecha, autor, categoría

### Herramientas Nuevas

- **Web scraping**: Tool para leer y analizar contenido de URLs
- **Integración con Notion**: Crear/leer páginas de Notion
- **Speech-to-Text**: Input por voz con Whisper API

### Autenticación & Usuarios

- **Roles**: Admin, Editor, Viewer con permisos diferenciados
- **Teams**: Espacios de trabajo compartidos

---

## 💾 Infraestructura

### Base de Datos

- **Connection pooling**: PgBouncer para optimizar conexiones a Supabase
- **Índices optimizados**: Analizar query plans y agregar índices necesarios
- **Backup automático**: Backups diarios con retention de 7 días

### Caching

- **Redis**: Cache para:
  - Sesiones de usuario
  - Resultados de búsquedas vectoriales frecuentes
  - Embeddings de queries repetidas

### Performance

- **Response caching**: Cache de respuestas idénticas del LLM (24hs)
- **Background workers**: Queue (BullMQ) para tareas pesadas:
  - Generación de embeddings
  - Procesamiento de archivos largos
  - Export de conversaciones

---

## 📱 UX

### UI/UX

- **Dark mode**: Toggle para tema oscuro
- **Command palette**: Cmd+K para acciones rápidas

### Onboarding

- **Tutorial interactivo**: Guía de 3 pasos al primer uso
- **Example prompts**: Sugerencias de qué preguntar
- **Templates**: Plantillas para casos comunes (ventas, soporte, investigación)

## 🔒 Compliance

- **GDPR**: Derecho al olvido + export de datos personales
- **Data retention**: Borrado automático de datos > 90 días
- **Audit logs**: Log de acciones de admin
- **Content moderation**: Filtro de contenido inapropiado (PerspectiveAPI)
