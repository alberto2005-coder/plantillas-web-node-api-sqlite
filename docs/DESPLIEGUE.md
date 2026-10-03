# Guía de despliegue

## Para quién es

Esta guía está dirigida a **quien publica una plantilla en internet**: desde un VPS propio hasta una plataforma PaaS (Render, Railway, Fly.io). No se asumen conocimientos de DevOps avanzados, solo saber abrir una terminal y editar un fichero.

La tabla siguiente resume qué cambia al pasar de **local** a **producción**:

| Variable / aspecto | Local (`.env` por defecto) | Producción (recomendado) | Dónde se configura |
|---|---|---|---|
| `HOST` | `127.0.0.1` | `0.0.0.0` (escucha en todas las interfaces) | `.env` / variables de entorno del proveedor |
| `PORT` | `3000` | La que asigne la plataforma (Render: `10000`, Fly: `8080`, VPS: `3000` detrás de proxy) | `.env` / panel del proveedor |
| `SITE_URL` | `http://localhost:3000` | `https://tudominio.com` (sin barra final) | `.env` / panel del proveedor |
| `ADMIN_TOKEN` | `cambia-esto-en-produccion` | **Token largo y aleatorio** (mín. 32 caracteres, `openssl rand -hex 32`) | `.env` / panel del proveedor (secreto) |
| `CORS` | `1` (abierto para desarrollo) | `0` (cerrado) salvo que otra web consuma la API | `.env` / panel del proveedor |
| `CORS_ORIGEN` | `*` | `https://tudominio.com` (si `CORS=1`) | `.env` / panel del proveedor |
| `TRUST_PROXY` | `0` (no hay proxy en local) | `1` **solo** detrás de proxy inverso (Caddy/nginx/Cloudflare) | `.env` / panel del proveedor |
| `CSP` | Por defecto (recursos propios + Google Fonts) | Personalizada si añades analíticas, formularios o embeds externos; `0` para no enviarla | `.env` / panel del proveedor |
| Correo (`RESEND_API_KEY`, `SMTP_*`) | Vacío → modo demo | Claves reales de Resend / SMTP | `.env` / panel del proveedor (secretos) |
| Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*`) | Vacío → modo demo | Claves **live** (no test) + webhook configurado en Stripe Dashboard | `.env` / panel del proveedor (secretos) |
| HTTPS | No (http://localhost) | **Obligatorio** (certificado válido, HSTS) | Proxy (Caddy/Nginx) o proveedor PaaS |
| Base de datos | `server/data/*.db` (fichero local) | Ruta en **volumen persistente** o `DB_FILE` apuntando a disco duradero | `.env` (`DB_FILE`) + montaje del volumen |

> ⚠️ **Nunca** subas el `.env` real a git. Cada plantilla incluye `.env.example` documentado y `.gitignore` que excluye `.env` y `server/data/*.db*`.

---

## Opción A — VPS (Ubuntu 22.04/24.04, Debian 12, AlmaLinux 9…)

### 1. Requisitos previos

- **Node ≥ 22.13** (recomendado 24 LTS). Verifica: `node -v`.
- Usuario **sin privilegios** (ej. `deploy`), **no** `root`.
- Firewall: puertos **80** y **443** abiertos; el puerto de la app (ej. `3000`) **solo** en localhost.

```bash
# Como root (una sola vez)
apt update && apt install -y curl gnupg2 ca-certificates
# Node 24 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs
node -v   # → v24.x.x
npm -v    # → 10.x.x
```

### 2. Clona el repo y prepara la plantilla

```bash
# Como usuario deploy
git clone https://github.com/tu-usuario/tu-repo.git /home/deploy/plantillas-web
cd /home/deploy/plantillas-web/04-tienda   # elige tu plantilla
cp .env.example .env
```

Edita `.env` con valores de producción:

```dotenv
HOST=127.0.0.1
PORT=3000
SITE_URL=https://tienda.tudominio.com
ADMIN_TOKEN=pon-aqui-un-token-de-64-caracteres-hex
CORS=0
RESEND_API_KEY=re_...
EMAIL_DE=noreply@tudominio.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...
# DB_FILE=/home/deploy/plantillas-web/04-tienda/server/data/tienda.db  # opcional si usas la ruta por defecto
```

> ✅ Genera `ADMIN_TOKEN`: `openssl rand -hex 32` (64 chars hex).

### 3. Systemd (recomendado) — servicio gestionado por el SO

Crea `/etc/systemd/system/tienda.service` (como root):

```ini
[Unit]
Description=NovaTech Store (04-tienda)
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/home/deploy/plantillas-web/04-tienda
EnvironmentFile=/home/deploy/plantillas-web/04-tienda/.env
ExecStart=/usr/bin/node --disable-warning=ExperimentalWarning server/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=false
ReadWritePaths=/home/deploy/plantillas-web/04-tienda/server/data

[Install]
WantedBy=multi-user.target
```

Activa y arranca:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tienda
sudo journalctl -u tienda -f   # logs en vivo
```

### 4. PM2 (alternativa) — gestor de procesos Node

```bash
npm install -g pm2   # o: npm install pm2 --save-dev y usa npx pm2
cd /home/deploy/plantillas-web/04-tienda
pm2 start server/server.js --name tienda --node-args="--disable-warning=ExperimentalWarning"
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
```

### 5. Proxy inverso + HTTPS automático — **Caddy** (recomendado por simplicidad)

```bash
# Instala Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Edita `/etc/caddy/Caddyfile`:

```text
tienda.tudominio.com {
    reverse_proxy 127.0.0.1:3000
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

Recarga: `sudo systemctl reload caddy`. Caddy obtiene y renueva certificados Let's Encrypt **solo**.

**Paso obligatorio: `TRUST_PROXY=1` en `.env` de la plantilla** (y reinicia el
servidor). Detrás de un proxy **todas** las peticiones llegan a Node desde la
misma IP: la del proxy. Si no avisas, el limitador anti-spam contaría los
envíos de **todos** los visitantes en un único contador por IP y cualquiera
agotaría el límite de todos (429 para todo el mundo). Con `TRUST_PROXY=1` el
limitador usa la **primera IP real** del header `X-Forwarded-For` que añade
Caddy.

```dotenv
TRUST_PROXY=1
```

> ⚠️ **Solo con proxy delante.** Si el servidor es público y no hay proxy,
> déjalo en `0` (el defecto): cualquiera podría inventarse un
> `X-Forwarded-For` a su medida y esquivar el límite anti-spam.

> **Nginx** (alternativa): usa `certbot --nginx -d tienda.tudominio.com` y configura `proxy_pass http://127.0.0.1:3000;` con cabeceras equivalentes. Igual que con Caddy, pon `TRUST_PROXY=1` en `.env` para que el límite anti-spam use la IP real del visitante y no la del proxy (si usas Cloudflare delante, lo mismo).

### 6. Firewall (UFW)

```bash
sudo ufw allow 22/tcp   # SSH (cuidado: no te eches fuera)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 7. Verificación

```bash
curl -I https://tienda.tudominio.com/api/salud
# HTTP/2 200 OK
# content-type: application/json
```

---

## Opción B — PaaS (Render / Railway / Fly.io)

| Plataforma | Comando de arranque | Puerto que expone | Volumen persistente | HTTPS |
|---|---|---|---|---|
| **Render** (Web Service) | `node server/server.js` | `PORT` (inyectado, ej. 10000) | **Disk** montado en `/var/data` → `DB_FILE=/var/data/tienda.db` | Automático (`*.onrender.com` o dominio propio) |
| **Railway** | `node server/server.js` | `PORT` (inyectado) | **Volume** montado en `/data` → `DB_FILE=/data/tienda.db` | Automático (`*.up.railway.app` o dominio propio) |
| **Fly.io** | `node server/server.js` | `8080` (configurado en `fly.toml`) | **Volume** `fly volumes create tienda_data --size 1` montado en `/data` → `DB_FILE=/data/tienda.db` | Automático (`*.fly.dev` o dominio propio) |

### Pasos comunes

1. **Un servicio por plantilla**: no intentes meter las 7 en un mismo servicio; cada una tiene su `package.json`, su BD y sus variables.
2. **Variables de entorno** en el panel del proveedor (no `.env` en git):
   - `HOST=0.0.0.0`
   - `PORT` → **no la fijes**; la plataforma la inyecta. El código ya la respeta (`const PUERTO = entero(process.env.PORT, 3000);` en `server/server.js`).
   - `SITE_URL=https://tu-app.onrender.com` (o tu dominio).
   - `ADMIN_TOKEN`, `RESEND_API_KEY`, `STRIPE_*`, etc. → **secrets** del panel.
3. **Disco efímero ⚠️**: por defecto, el sistema de ficheros es **temporal** (se pierde en cada deploy).
   - SQLite vive en `server/data/*.db`. **Obligatorio**: crea un **volumen persistente** y apunta `DB_FILE` a él.
   - Ejemplo Render: `DB_FILE=/var/data/tienda.db` + Add Disk → Mount Path `/var/data`.
   - Si **no** montas volumen, **acepta la pérdida de datos** en cada redeploy (solo válido para demos).
4. **Health check**: todas las plantillas responden `GET /api/salud` → úsalo como readiness probe.
5. **Dominio propio**: añádelo en el panel; el proveedor emite certificado TLS.

### Ejemplo `fly.toml` (04-tienda)

```toml
app = "tienda-novatech"
primary_region = "mad"
[build]
  image = "node:24-alpine"
[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
[env]
  HOST = "0.0.0.0"
  PORT = "8080"
  SITE_URL = "https://tienda-novatech.fly.dev"
[mounts]
  source = "tienda_data"
  destination = "/data"
```

Despliega:

```bash
fly launch --no-deploy   # crea fly.toml, edita si hace falta
fly volumes create tienda_data --size 1
fly secrets set ADMIN_TOKEN=... RESEND_API_KEY=... STRIPE_SECRET_KEY=... STRIPE_WEBHOOK_SECRET=...
fly deploy
```

---

## Base de datos en producción

Todas las plantillas usan **SQLite** (`node:sqlite`, módulo nativo de Node ≥22.13). El fichero `.db` está en `server/data/` por defecto (configurable con `DB_FILE`).

### Backup (copia en frío — servidor **parado**)

```bash
# Systemd
sudo systemctl stop tienda
cp /home/deploy/plantillas-web/04-tienda/server/data/tienda.db \
   /home/deploy/backups/tienda-$(date +%F-%H%M).db
sudo systemctl start tienda
```

Automatiza con `cron` (diario a las 03:00):

```bash
# crontab -e (usuario deploy)
0 3 * * * /home/deploy/scripts/backup-tienda.sh >> /home/deploy/logs/backup.log 2>&1
```

`/home/deploy/scripts/backup-tienda.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
APP=tienda
DIR=/home/deploy/plantillas-web/04-tienda
DEST=/home/deploy/backups
systemctl stop "$APP"
cp "$DIR/server/data/tienda.db" "$DEST/${APP}-$(date +%F-%H%M).db"
systemctl start "$APP"
# Retención 30 días
find "$DEST" -name "${APP}-*.db" -mtime +30 -delete
```

### Restauración

```bash
sudo systemctl stop tienda
cp /home/deploy/backups/tienda-2026-09-15-0300.db \
   /home/deploy/plantillas-web/04-tienda/server/data/tienda.db
sudo systemctl start tienda
```

### Alternativa: Postgres (fuera de alcance)

Si el proyecto crece (escrituras concurrentes altas, réplicas, backups PITR), migra a **PostgreSQL**. Las plantillas usan `node:sqlite` directamente en `server/lib/db.js`; tendrías que sustituir ese módulo por `pg` y adaptar las consultas (SQL estándar, pocas diferencias). **No está cubierto en esta guía**.

---

## Integraciones en producción

### Correo — Resend (recomendado) o SMTP

| Proveedor | Variables en `.env` / panel | Notas |
|---|---|---|
| **Resend** | `RESEND_API_KEY=re_...`<br>`EMAIL_DE=noreply@tudominio.com` | API REST nativa (fetch), **sin instalar nada**. Dominio verificado en Resend. |
| **SMTP** (SendGrid, Mailgun, Mailjet, propio) | `SMTP_HOST=smtp.sendgrid.net`<br>`SMTP_PUERTO=587`<br>`SMTP_USUARIO=apikey`<br>`SMTP_CLAVE=SG....`<br>`EMAIL_DE=noreply@tudominio.com` | Requiere `npm install nodemailer` (opcional, se avisa al arrancar si falta). |

> ✅ Prueba: `curl -X POST https://tudominio.com/api/contacto -H "Content-Type: application/json" -d '{"nombre":"Test","email":"test@correo.com","mensaje":"Prueba de envío"}'`

### Stripe (plantillas 02-saas y 04-tienda)

1. **Claves live** (no test): `STRIPE_SECRET_KEY=sk_live_...` en el panel/secrets.
2. **Precios recurrentes** (02-saas): crea 3 precios en Stripe Dashboard → copia sus `price_...` a `STRIPE_PRICE_ID_BASICO`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_EMPRESA`.
3. **Webhook firmado** (obligatorio en live):
   - En Stripe Dashboard → Developers → Webhooks → Add endpoint.
   - **URL**: `https://tudominio.com/api/stripe/webhook`
   - **Eventos**: 
     - 02-saas: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
     - 04-tienda: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copia el **Signing secret** (`whsec_...`) a `STRIPE_WEBHOOK_SECRET`.
4. **Claves NUNCA en frontend**: el checkout usa `fetch` al backend (`/api/pago/sesion` o `/api/checkout`), el backend llama a Stripe con la clave secreta, y devuelve `client_secret` o `url` al navegador. El front no ve `sk_live_...`.

---

## Content-Security-Policy (CSP)

Las plantillas envían por defecto la cabecera `Content-Security-Policy`
(definida en `server/lib/http.js`): **solo recursos del propio sitio** más
Google Fonts, junto con `Permissions-Policy`. Es la opción más segura, pero se
queda corta en cuanto añades scripts o formularios de otros dominios.

Se gobierna con `CSP` en `.env` (reinicia tras cambiarla):

| Valor en `.env` | Efecto |
|---|---|
| sin definir `CSP` | la CSP por defecto del servidor (recursos propios + Google Fonts) |
| `CSP=0` | no se envía la cabecera |
| `CSP=default-src 'self'; …` | tu política personalizada |

```dotenv
# Desactivar la cabecera
CSP=0

# Personalizar: Plausible + Formspree + vídeos de YouTube
CSP=default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self' https://formspree.io; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://plausible.io; connect-src 'self' https://plausible.io https://formspree.io; frame-src https://www.youtube.com
```

Casos habituales:

- **Analíticas** (Plausible, Umami, GA4) → añade su dominio a `script-src` (y a `connect-src` si envían eventos).
- **Formularios externos** (Formspree, Web3Forms) → su dominio en `form-action` y `connect-src`.
- **Vídeos/incrustados** (YouTube, Vimeo, mapas) → su dominio en `frame-src`.
- **Stripe** (02 y 04) → `https://js.stripe.com` en `script-src` y `connect-src`.

> Verifica con `curl -I https://tudominio.com/` → `content-security-policy`.
> Si algo deja de cargarse en producción (scripts tachados en la consola del
> navegador), te falta ese dominio en la política: amplíala en lugar de
> desactivarla con `CSP=0`.

---

## Checklist antes de abrir (17 puntos verificables)

| # | Verificación | Cómo comprobarlo |
|---|---|---|
| 1 | `ADMIN_TOKEN` es **fuerte** (≥32 chars aleatorios) | `grep ADMIN_TOKEN .env \| cut -d= -f2 \| wc -c` → ≥65 (hex) |
| 2 | `.env` **no se sirve** (403/404) | `curl -I https://tudominio.com/.env` → 403/404 |
| 3 | `CORS=0` (o `CORS_ORIGEN` restrictivo) | `grep ^CORS= .env` |
| 4 | Límites anti-spam activos (`LIMITE_*` > 0) | `grep ^LIMITE_ .env` |
| 5 | Backups programados y probados (restauración test) | Ejecuta script de backup + restaura en staging |
| 6 | **HTTPS** válido (certificado, cadena completa, HSTS) | `curl -I https://tudominio.com` → `Strict-Transport-Security` |
| 7 | Dominio apunta al servidor (A/AAAA o CNAME) | `dig +short tudominio.com` |
| 8 | `SITE_URL` coincide con el dominio real (sin barra final) | `grep ^SITE_URL= .env` |
| 9 | `HOST=0.0.0.0` en PaaS / `127.0.0.1` detrás de proxy VPS | `grep ^HOST= .env` |
| 10 | `PORT` respetada (no hardcodeada) | `grep -r "listen\|PUERTO" server/server.js` |
| 11 | Volumen persistente montado en `server/data` (o `DB_FILE` en disco duradero) | `ls -la /ruta/volumen/tienda.db` |
| 12 | Stripe webhook configurado y secreto guardado | Stripe Dashboard → Webhooks → "Last response: 200" |
| 13 | Correo de prueba llega a bandeja real | Usa formulario de contacto / registro |
| 14 | Rate limits no bloquean tráfico legítimo | Simula 5-10 peticiones seguidas → 200, la 11ª → 429 |
| 15 | Logs accesibles y rotados (systemd/journald, PaaS logs) | `journalctl -u tienda -n 50` / panel PaaS |
| 16 | `TRUST_PROXY=1` **solo** si hay proxy inverso delante (Caddy/nginx/Cloudflare) | `grep ^TRUST_PROXY= .env` → `1` con proxy, `0` sin proxy |
| 17 | `CSP` revisada si añades scripts o formularios externos (analíticas, Formspree, embeds) | `curl -I https://tudominio.com/` → `content-security-policy`; `CSP=0` solo si la quieres apagar |

---

## Problemas típicos

| Síntoma | Causa probable | Arreglo |
|---|---|---|
| `Error: listen EADDRINUSE :::3000` | Puerto ocupado (otro proceso o arranque doble) | `lsof -i :3000` → mata proceso; en systemd: `systemctl restart tienda` |
| `GET /api/salud → 502 / connection refused` | App no arrancó o puerto distinto al del proxy | Revisa logs (`journalctl -u tienda` / panel PaaS); verifica `PORT` y `HOST` |
| `SQLite: database is locked` | Dos procesos escriben a la vez (ej. systemd + PM2) | Una sola instancia; usa `Restart=on-failure` en systemd |
| `BD perdida tras redeploy` (PaaS) | Sin volumen persistente | Crea volume/disk y `DB_FILE` apuntando a él |
| `Webhook Stripe → 401 firma inválida` | `STRIPE_WEBHOOK_SECRET` no coincide / cuerpo modificado por proxy | Usa `cuerpoBruto` (ya implementado); no uses body-parser antes del webhook |
| `Correo no sale (demo)` | `RESEND_API_KEY` / `SMTP_*` vacíos | Rellena variables y **reinicia** la app |
| `CORS bloquea front en otro dominio` | `CORS=0` u origen no permitido | `CORS=1` + `CORS_ORIGEN=https://app.otrodominio.com` |
| `Token admin rechazado (401)` | Header mal escrito / token distinto | Header exacto: `x-admin-token: <valor exacto de ADMIN_TOKEN>` |
| `Node: sqlite module not found` | Node < 22.13 | `node -v` → actualiza a ≥22.13 |
| `Permisos en server/data` (VPS) | Usuario systemd no puede escribir | `ReadWritePaths=/ruta/server/data` en unit file; `chown deploy:deploy server/data` |

---

## Documentación relacionada

- [Guía de usuario](GUIA-USUARIO.md) — uso diario, formularios, bandeja de admin.
- [Guía de desarrollador](GUIA-DESARROLLADOR.md) — arquitectura, librerías compartidas, patrones de extensión.
- [Índice de la API](API.md) — todos los endpoints de las 7 plantillas con códigos y ejemplos `curl`.
- [Personalización](PERSONALIZACION.md) — paleta, textos, datos, `.env` por plantilla, tabla «quiero X → dónde tocar».
- `README.md` de cada plantilla (01-portfolio…07-restaurante) — referencia técnica completa (12 secciones).
- `docs/` de cada plantilla — `GUIA-USUARIO.md` y `GUIA-DESARROLLADOR.md` específicos.
- [LICENSE](../LICENSE) — licencia MIT.

---

*Generado para plantillas-web v1.0 — Copyright (c) 2026 Alberto Ortiz — Licencia MIT*