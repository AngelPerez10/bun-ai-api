# 🤖 Multi-AI API Gateway

API Gateway que distribuye requests entre múltiples proveedores de IA usando round-robin, construida con Bun y TypeScript.

## 🚀 Características

- ✅ **Round-robin automático** entre 5 proveedores de IA
- ✅ **Streaming de respuestas** en tiempo real
- ✅ **Autenticación con API keys** para control de acceso
- ✅ **Rate limiting** configurable por usuario
- ✅ **Validación robusta** de requests
- ✅ **Logging estructurado** con timestamps
- ✅ **Métricas** de uso por servicio
- ✅ **Health checks** para monitoreo
- ✅ **CORS** habilitado para uso desde frontend
- ✅ **Manejo de errores** centralizado
- ✅ **Listo para deployment público**

## 🎯 Servicios Integrados

1. **Groq** - Kimi K2 Instruct
2. **Cerebras** - GLM 4.6
3. **OpenRouter** - DeepSeek R1 (free)
4. **Google Gemini** - Gemini 3 Flash Preview
5. **Hugging Face** - Llama 3.1 8B Instruct

## 📦 Instalación

```bash
# Clonar el repositorio
git clone <tu-repo>
cd bun-ai-api-main

# Instalar dependencias
bun install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus API keys
```

## 🔑 Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# API Keys (requeridas)
GROQ_API_KEY=tu_groq_api_key
CEREBRAS_API_KEY=tu_cerebras_api_key
OPENROUTER_API_KEY=tu_openrouter_api_key
GEMINI_API_KEY=tu_gemini_api_key
HF_TOKEN=tu_huggingface_token

# Configuración del servidor
PORT=3000
DEBUG=false
CORS_ORIGINS=*

# Autenticación (para deployment público)
REQUIRE_AUTH=true
MASTER_API_KEY=sk_master_tu_key_segura_aqui
PUBLIC_API_KEYS=sk_public_key1,sk_public_key2

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=60000
```

### Cómo obtener las API Keys

- **Groq**: https://console.groq.com/keys
- **Cerebras**: https://cloud.cerebras.ai/
- **OpenRouter**: https://openrouter.ai/keys
- **Gemini**: https://aistudio.google.com/app/apikey
- **Hugging Face**: https://huggingface.co/settings/tokens

## 🏃 Uso

### Iniciar el servidor

```bash
# Modo desarrollo (con hot reload)
bun run dev

# Modo producción
bun start
```

### Endpoints disponibles

#### 1. POST `/chat` - Chat con IA (requiere autenticación si está habilitada)

Envía mensajes y recibe respuestas streaming de los modelos de IA.

**Request (con autenticación):**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_API_KEY" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "¿Qué es la inteligencia artificial?"
      }
    ]
  }'
```

**O usando X-API-Key header:**
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TU_API_KEY" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "¿Qué es la inteligencia artificial?"
      }
    ]
  }'
```

**Formato de mensajes:**
```typescript
{
  "messages": [
    { "role": "system", "content": "Eres un asistente útil" },
    { "role": "user", "content": "Hola" },
    { "role": "assistant", "content": "¡Hola! ¿Cómo puedo ayudarte?" },
    { "role": "user", "content": "Explícame algo" }
  ]
}
```

**Response:**
- Content-Type: `text/event-stream`
- Streaming de texto en tiempo real

**Errores comunes:**
```json
// Sin API key
{
  "error": "API key required. Use Authorization: Bearer YOUR_KEY or X-API-Key header",
  "status": 401
}

// API key inválida
{
  "error": "Invalid or disabled API key",
  "status": 403
}

// Rate limit excedido
{
  "error": "Rate limit exceeded",
  "resetAt": "2026-01-20T05:23:45.123Z",
  "status": 429
}

// Validación fallida
{
  "error": "messages must be an array",
  "status": 400
}
```

#### 2. GET `/health` - Health Check

Verifica el estado del servidor y servicios disponibles.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "services": [
    "Groq",
    "Cerebras",
    "OpenRouter (DeepSeek)",
    "Gemini 3 Flash",
    "Hugging Face Llama 3.1 8B"
  ],
  "authEnabled": true,
  "rateLimitEnabled": true,
  "timestamp": "2026-01-20T04:23:45.123Z"
}
```

#### 3. GET `/metrics` - Métricas de Uso

Obtiene estadísticas de uso de cada servicio.

**Request:**
```bash
curl http://localhost:3000/metrics
```

**Response:**
```json
{
  "uptime": 3600,
  "totalRequests": 150,
  "services": {
    "Groq": {
      "requests": 30,
      "errors": 1,
      "avgDuration": 1234,
      "lastUsed": "2026-01-20T04:23:45.123Z",
      "successRate": "96.67%"
    },
    "Cerebras": {
      "requests": 30,
      "errors": 0,
      "avgDuration": 987,
      "lastUsed": "2026-01-20T04:23:40.123Z",
      "successRate": "100.00%"
    }
  }
}
```

#### 4. POST `/admin/keys` - Crear API Key (requiere master key)

Crea una nueva API key para un usuario.

**Request:**
```bash
curl -X POST http://localhost:3000/admin/keys \
  -H "Authorization: Bearer TU_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Usuario Juan"}'
```

**Response:**
```json
{
  "success": true,
  "apiKey": "sk_abc123..."
}
```

#### 5. GET `/admin/keys` - Listar API Keys (requiere master key)

**Request:**
```bash
curl -X GET http://localhost:3000/admin/keys \
  -H "Authorization: Bearer TU_MASTER_KEY"
```

**Response:**
```json
{
  "success": true,
  "keys": [
    {
      "key": "sk_abc123...",
      "name": "Usuario Juan",
      "createdAt": "2026-01-20T04:23:45.123Z",
      "lastUsed": "2026-01-20T04:25:00.123Z",
      "requestCount": 42,
      "enabled": true
    }
  ]
}
```

#### 6. DELETE `/admin/keys` - Revocar API Key (requiere master key)

**Request:**
```bash
curl -X DELETE http://localhost:3000/admin/keys \
  -H "Authorization: Bearer TU_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key":"sk_abc123..."}'
```

**Response:**
```json
{
  "success": true
}
```

---

## 🔐 Autenticación

### Para Usuarios de la API

Si la API tiene autenticación habilitada (`REQUIRE_AUTH=true`), necesitas una API key para usar el endpoint `/chat`.

**Obtener tu API key:**
1. Contacta al administrador de la API
2. El administrador generará una key para ti usando `/admin/keys`
3. Usa la key en tus requests:
   ```bash
   -H "Authorization: Bearer TU_API_KEY"
   ```

### Para Administradores

**Generar una Master Key segura:**
```bash
node -e "console.log('sk_master_' + require('crypto').randomBytes(32).toString('hex'))"
```

**Gestionar API keys de usuarios:**
- Crear: `POST /admin/keys` con tu master key
- Listar: `GET /admin/keys` con tu master key
- Revocar: `DELETE /admin/keys` con tu master key

---

## ⏱️ Rate Limiting

Por defecto, cada API key tiene un límite de:
- **10 requests por minuto**
- Configurable vía `RATE_LIMIT_MAX` y `RATE_LIMIT_WINDOW_MS`

**Headers de respuesta:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2026-01-20T05:23:45.123Z
```

**Cuando excedes el límite:**
```json
{
  "error": "Rate limit exceeded",
  "resetAt": "2026-01-20T05:23:45.123Z",
  "status": 429
}
```

---

## 📊 Validaciones

La API valida automáticamente:

- ✅ `messages` debe ser un array no vacío
- ✅ Máximo 50 mensajes por request
- ✅ Cada mensaje debe tener `role` válido (`user`, `assistant`, `system`)
- ✅ Cada mensaje debe tener `content` como string
- ✅ Máximo 10,000 caracteres por mensaje

## 🔄 Round-Robin

Los requests se distribuyen automáticamente entre servicios:

```
Request 1 → Groq
Request 2 → Cerebras
Request 3 → OpenRouter
Request 4 → Gemini
Request 5 → Hugging Face
Request 6 → Groq (reinicia el ciclo)
```

## 📝 Logging

Los logs están en formato JSON estructurado:

```json
{
  "level": "info",
  "message": "Chat request completed",
  "timestamp": "2026-01-20T04:23:45.123Z",
  "service": "Groq",
  "duration": "1234ms"
}
```

Para habilitar logs de debug:
```bash
DEBUG=true bun run dev
```

## 🛠️ Desarrollo

### Estructura del proyecto

```
bun-ai-api-main/
├── services/          # Implementaciones de cada proveedor
│   ├── groq.ts
│   ├── cerebras.ts
│   ├── openrouter.ts
│   ├── gemini.ts
│   └── huggingface.ts
├── utils/             # Utilidades
│   ├── logger.ts      # Sistema de logging
│   ├── validation.ts  # Validación de requests
│   └── metrics.ts     # Recolección de métricas
├── config.ts          # Configuración centralizada
├── types.ts           # Tipos TypeScript
├── index.ts           # Servidor principal
└── README.md
```

### Agregar un nuevo servicio

1. Crea un archivo en `services/`:

```typescript
// services/miservicio.ts
import type { AIService, ChatMessage } from '../types';

export const miServicio: AIService = {
  name: 'Mi Servicio',
  async chat(messages: ChatMessage[]) {
    // Tu implementación aquí
    return (async function* () {
      yield 'respuesta del modelo';
    })();
  },
};
```

2. Importa y agrega en `index.ts`:

```typescript
import { miServicio } from './services/miservicio';

const services: AIService[] = [
  groqService,
  cerebrasService,
  // ... otros servicios
  miServicio,
];
```

## 🔒 Seguridad

- ✅ **Autenticación con API keys** - Control de acceso por usuario
- ✅ **Rate limiting** - Prevención de abuso y control de costos
- ✅ **Master key** para gestión administrativa
- ✅ **Variables de entorno** para API keys (nunca en código)
- ✅ **Validación de inputs** - Prevención de inyecciones
- ✅ **Límites de tamaño** de mensajes
- ✅ **CORS configurable** - Control de orígenes permitidos
- ✅ **Logging estructurado** - Auditoría de requests
- ✅ **Manejo de errores** sin exponer detalles internos

### ⚠️ Importante para Deployment Público

1. **Siempre usa `REQUIRE_AUTH=true` en producción**
2. **Genera una `MASTER_API_KEY` segura y única**
3. **No compartas tu master key con usuarios**
4. **Monitorea las métricas regularmente**
5. **Revoca API keys comprometidas inmediatamente**

## 🚀 Deployment

Para desplegar esta API públicamente, consulta la **[Guía de Deployment](./DEPLOYMENT.md)** que incluye:

- ✅ Instrucciones paso a paso para Railway, Render, Fly.io
- ✅ Configuración de variables de entorno
- ✅ Gestión de API keys en producción
- ✅ Checklist de seguridad
- ✅ Monitoreo y troubleshooting

**Plataformas recomendadas:**
- **Railway** - Más fácil, deploy automático desde GitHub
- **Render** - Free tier generoso
- **Fly.io** - Edge deployment global
- **VPS** - Control total (para usuarios avanzados)

---

## 📈 Próximas Mejoras

- [x] Rate limiting por API key
- [x] Autenticación con API keys
- [x] Gestión de API keys
- [ ] Persistencia de API keys en base de datos
- [ ] Cache de respuestas
- [ ] Retry automático en caso de fallo
- [ ] Selección manual de servicio por request
- [ ] Webhooks para notificaciones
- [ ] Tests unitarios e integración
- [ ] Panel de administración web

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

MIT

## 🆘 Troubleshooting

### Error: "Cannot find name 'Bun'"
```bash
bun install
# Asegúrate de tener @types/bun instalado
```

### Error: "Missing environment variables"
Verifica que todas las API keys estén en tu `.env`:
```bash
cat .env
```

### Servicio específico falla
Revisa los logs y las métricas:
```bash
curl http://localhost:3000/metrics
```

---

**Construido con ❤️ usando Bun + TypeScript**
