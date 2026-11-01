# JpCode v2.1

**JpCode** es un CLI propio con diseño inspirado en Claude Code, potenciado
nativamente por el motor de [opencode](https://opencode.ai): tu interfaz, su
inteligencia.

A diferencia de la v1 (que era un tema sobre el TUI de opencode), la v2 es un
**cliente independiente**: lanza el motor opencode como backend local y le habla
por su API. Sin `tui.json`, sin parches — funciona igual en Windows, macOS y Linux.

## Novedades de la 2.1

- Compatible con **opencode 2.x** (probado con **2.2.5**). La v2 renombró sus
  paquetes (`opencode-ai` → `@opencode/cli`) y cambió el API a `/api/*` con
  autenticación Basic; jpcode ya habla ese protocolo.
- Sin dependencias npm: usa `fetch` nativo, así que funciona con **Node 18+**
  (el SDK oficial v2 exige Node 24 por `await using`).
- Modelo **gratuito** de OpenCode Zen por defecto:
  `opencode/deepseek-v4.1-flash-free`.

## Instalación

```bash
npm install -g @juanpiecedev/jpcode
```

Necesitas el motor instalado (jpcode también lo detecta si está en el PATH):

```bash
npm install -g @opencode/cli@2.2.5
```

## Uso

```bash
jpcode                  # REPL interactivo
jpcode "explica esto"   # respuesta one-shot
jpcode --version
```

Comandos dentro del REPL:

- `/new` — sesión nueva
- `/model` — ver el modelo actual
- `/model provider/id` — cambiar de modelo (abre sesión nueva)
- `/clear` — limpiar pantalla
- `/help` — ayuda
- `/exit` — salir

## Modelos gratuitos

El tier gratuito de OpenCode Zen incluye (`opencode models | grep free`):

```
opencode/beam-free
opencode/big-pickle
opencode/deepseek-v4.1-flash-free
opencode/flint-40b-free
opencode/glm-5.3-flash-free
opencode/mimo-v2.6-flash-free
opencode/nemotron-3.5-lightning-free
opencode/nemotron-3.5-super-vl-free
```

Cambia el modelo por defecto con la variable de entorno:

```bash
JPCODE_MODEL=opencode/glm-5.3-flash-free jpcode
```

Si aparece `Free usage limit reached`, el cupo gratuito de la instalación se
agotó: cambia con `/model` a otro gratuito o conecta un provider
(`opencode auth login`).

## Arquitectura

```
┌──────────────────┐   HTTP /api/* (Basic auth)   ┌──────────────────┐
│   jpcode CLI     │ ───────────────────────────▶ │  motor opencode  │──▶ providers
│  (tu diseño)     │ ◀─────────────────────────── │ serve (local)    │    (zen, etc.)
└──────────────────┘        SSE /api/event        └──────────────────┘
```

- Interfaz: 100% jpcode (banner, prompt, streaming de texto)
- Motor: 100% opencode (sesiones, tools, providers, free tier)

Rutas usadas: `POST /api/session`, `POST /api/session/{id}/prompt`,
`GET /api/event` (SSE), `GET /api/info` (readiness).

## Licencia

MIT
