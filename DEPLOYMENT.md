# 🚀 Deployment Guide

Esta guía te ayudará a desplegar tu Multi-AI API Gateway en diferentes plataformas.

## 📋 Pre-requisitos

Antes de desplegar, asegúrate de tener:

1. ✅ Todas las API keys de los servicios de IA
2. ✅ Una `MASTER_API_KEY` segura generada
3. ✅ Configuración de autenticación decidida (`REQUIRE_AUTH=true` recomendado)
4. ✅ Límites de rate limiting configurados

## 🔑 Generar Master API Key Segura

```bash
# En tu terminal local
node -e "console.log('sk_master_' + require('crypto').randomBytes(32).toString('hex'))"
```

O usa cualquier generador de strings aleatorios seguros.

## 🌐 Opciones de Deployment

### 1. Railway (Recomendado - Más fácil)

**Ventajas:**
- ✅ Deploy automático desde GitHub
- ✅ Variables de entorno fáciles de configurar
- ✅ Free tier generoso
- ✅ HTTPS automático

**Pasos:**

1. **Conecta tu repositorio:**
   - Ve a [railway.app](https://railway.app)
   - Click en "Start a New Project"
   - Selecciona "Deploy from GitHub repo"
   - Autoriza y selecciona tu repositorio

2. **Configura variables de entorno:**
   En el dashboard de Railway, ve a "Variables" y agrega:
   ```
   GROQ_API_KEY=tu_key
   CEREBRAS_API_KEY=tu_key
   OPENROUTER_API_KEY=tu_key
   GEMINI_API_KEY=tu_key
   HF_TOKEN=tu_token
   MASTER_API_KEY=sk_master_tu_key_segura
   REQUIRE_AUTH=true
   RATE_LIMIT_ENABLED=true
   RATE_LIMIT_MAX=10
   RATE_LIMIT_WINDOW_MS=60000
   ```

3. **Deploy:**
   - Railway detectará automáticamente que es un proyecto Bun
   - El deploy se iniciará automáticamente
   - Obtendrás una URL pública tipo: `https://tu-proyecto.up.railway.app`

4. **Genera tu primera API key de usuario:**
   ```bash
   curl -X POST https://tu-proyecto.up.railway.app/admin/keys \
     -H "Authorization: Bearer sk_master_tu_key_segura" \
     -H "Content-Type: application/json" \
     -d '{"name":"Mi Primera Key"}'
   ```

---

### 2. Render

**Ventajas:**
- ✅ Free tier disponible
- ✅ Deploy desde GitHub
- ✅ SSL automático

**Pasos:**

1. **Crea un nuevo Web Service:**
   - Ve a [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Conecta tu repositorio de GitHub

2. **Configuración:**
   - **Name:** `multi-ai-api`
   - **Runtime:** Docker
   - **Build Command:** `bun install`
   - **Start Command:** `bun run index.ts`

3. **Variables de entorno:**
   Agrega las mismas variables que en Railway

4. **Deploy:**
   - Click "Create Web Service"
   - Render construirá y desplegará automáticamente

---

### 3. Fly.io

**Ventajas:**
- ✅ Muy rápido
- ✅ Edge deployment global
- ✅ Free tier disponible

**Pasos:**

1. **Instala Fly CLI:**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login y setup:**
   ```bash
   fly auth login
   fly launch
   ```

3. **Configura secrets:**
   ```bash
   fly secrets set GROQ_API_KEY=tu_key
   fly secrets set CEREBRAS_API_KEY=tu_key
   fly secrets set OPENROUTER_API_KEY=tu_key
   fly secrets set GEMINI_API_KEY=tu_key
   fly secrets set HF_TOKEN=tu_token
   fly secrets set MASTER_API_KEY=sk_master_tu_key_segura
   fly secrets set REQUIRE_AUTH=true
   fly secrets set RATE_LIMIT_ENABLED=true
   ```

4. **Deploy:**
   ```bash
   fly deploy
   ```

---

### 4. VPS (DigitalOcean, Linode, AWS EC2, etc.)

**Para usuarios avanzados:**

1. **Instala Bun en el servidor:**
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clona el repositorio:**
   ```bash
   git clone tu-repo.git
   cd bun-ai-api-main
   ```

3. **Configura .env:**
   ```bash
   cp .env.example .env
   nano .env  # Edita con tus keys
   ```

4. **Instala dependencias:**
   ```bash
   bun install
   ```

5. **Usa PM2 para mantenerlo corriendo:**
   ```bash
   npm install -g pm2
   pm2 start "bun run index.ts" --name multi-ai-api
   pm2 save
   pm2 startup
   ```

6. **Configura Nginx como reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name tu-dominio.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🔐 Gestión de API Keys Post-Deployment

### Crear una nueva API key para un usuario

```bash
curl -X POST https://tu-api.com/admin/keys \
  -H "Authorization: Bearer TU_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Usuario Juan"}'
```

**Respuesta:**
```json
{
  "success": true,
  "apiKey": "sk_abc123..."
}
```

### Listar todas las API keys

```bash
curl -X GET https://tu-api.com/admin/keys \
  -H "Authorization: Bearer TU_MASTER_KEY"
```

### Revocar una API key

```bash
curl -X DELETE https://tu-api.com/admin/keys \
  -H "Authorization: Bearer TU_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key":"sk_abc123..."}'
```

---

## 📊 Monitoreo Post-Deployment

### Health Check

```bash
curl https://tu-api.com/health
```

### Métricas de uso

```bash
curl https://tu-api.com/metrics
```

---

## 🔒 Seguridad en Producción

### ✅ Checklist de Seguridad

- [ ] `REQUIRE_AUTH=true` está activado
- [ ] `MASTER_API_KEY` es una string aleatoria segura (mínimo 32 caracteres)
- [ ] Rate limiting está habilitado
- [ ] Las API keys de servicios están en variables de entorno (no en código)
- [ ] CORS está configurado apropiadamente (no uses `*` en producción si es posible)
- [ ] Logs están siendo monitoreados
- [ ] Tienes backups de tus API keys

### 🚨 Qué hacer si tu MASTER_API_KEY se compromete

1. Genera una nueva `MASTER_API_KEY`
2. Actualiza la variable de entorno en tu plataforma
3. Reinicia el servicio
4. Revoca todas las API keys de usuarios existentes
5. Notifica a tus usuarios para que soliciten nuevas keys

---

## 📈 Escalamiento

### Cuando tu API crece:

1. **Aumenta los límites de rate limiting:**
   ```env
   # Por ejemplo, 100 requests por minuto
   RATE_LIMIT_MAX=100
   RATE_LIMIT_WINDOW_MS=60000
   ```

2. **Considera usar una base de datos para API keys:**
   - Actualmente las keys están en memoria
   - Para producción seria, usa PostgreSQL/Redis

3. **Implementa caching:**
   - Cache respuestas comunes
   - Reduce llamadas a APIs externas

4. **Monitoreo avanzado:**
   - Integra con Sentry para error tracking
   - Usa Prometheus + Grafana para métricas

---

## 🆘 Troubleshooting

### Error: "Missing environment variables"

Verifica que todas las variables estén configuradas en tu plataforma de deployment.

### Error: "Rate limit exceeded"

El usuario ha excedido su límite. Espera a que se resetee o aumenta `RATE_LIMIT_MAX`.

### Error: "Invalid or disabled API key"

La API key del usuario es inválida o fue revocada. Genera una nueva.

### Logs no aparecen

Asegúrate de que `DEBUG=true` esté configurado si necesitas logs detallados.

---

## 📞 Soporte

Si tienes problemas con el deployment:

1. Revisa los logs de tu plataforma
2. Verifica el endpoint `/health`
3. Revisa las métricas en `/metrics`
4. Consulta la documentación de tu plataforma de deployment

---

**¡Tu API está lista para el mundo! 🌍**
