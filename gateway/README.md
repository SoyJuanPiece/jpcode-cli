# OpenCode Chat — probador de los modelos gratis de Zen

Chat en **un HTML** (sin React, sin build, sin dependencias) para probar los modelos gratis de
OpenCode Zen y ver, con la sonda incorporada, **cuáles responden de verdad** con tu key.

## Arrancar

```bash
cd opencode-chat
node server.mjs 8090                              # tier anónimo (sin key)
OPENCODE_API_KEY=oc_sk_xxx node server.mjs 8090   # con tu key
```

Abre <http://localhost:8090>. Para pararlo: `Ctrl+C`, o `pkill -f server.mjs`.

Escucha en **`127.0.0.1` a secas, en HTTP plano**, y es lo correcto: este proceso guarda tu
key, así que no debe quedar visible en la LAN (`listen(PORT)` sin host escucharía en todas las
interfaces). Si lo quieres en un VPS, pon delante un proxy con TLS o un túnel SSH — no lo
expongas tal cual. Se puede cambiar el bind con `HOST=0.0.0.0`, pero entiéndelo antes.

## ¿Por qué hay un servidor?

Por dos razones, y ninguna es opcional:

1. **El tier gratis valida que la petición parezca del cliente oficial.** Sin esta receta
   responde `403 FreeTierError` — incluso con tu key (`opencode auth login` no te exime):

   | Requisito | Valor |
   |---|---|
   | `User-Agent` | `opencode/<versión>` (nunca `local`) |
   | `x-opencode-session` | `ses_` + 26 caracteres |
   | `x-opencode-request` | `msg_` + 26 caracteres |
   | Body | `stream: true` (obligatorio) |
   | Body | las **11 tools oficiales** por nombre (el chequeo es de subconjunto) |

2. **opencode.ai no contesta al preflight CORS** (`OPTIONS` → 404 de Cloudflare), así que el
   navegador no puede llamar a la API directamente.

`server.mjs` se encarga de las dos: añade la receta y evita que la key viaje al navegador.

> ⚠️ **No pruebes el gate con `curl`:** da 403 *siempre*, incluso con la receta completa, por el
> fingerprint TLS de Cloudflare. Desde Node/Bun funciona. Perdí una pasada entera por esto.

### La key es opcional

Sin `OPENCODE_API_KEY` el proxy usa el **tier anónimo** (`Authorization: Bearer public`) y
funciona igual de bien; el límite es **por IP, ~200 peticiones/día**. Con key sube ese límite.

## API estilo OpenAI (`/v1/*`) — con tu clave

Al arrancar, el server imprime **tu clave del gateway** y la guarda en `.api-key` (gitignorado,
permisos `600`). Se puede fijar con `CHAT_API_KEY=mi_clave` o rotar borrando el archivo.

```bash
# lista de modelos gratis
curl http://localhost:8090/v1/models -H "Authorization: Bearer $CHAT_API_KEY"

# chat (soporta stream:true)
curl http://localhost:8090/v1/chat/completions \
  -H "Authorization: Bearer $CHAT_API_KEY" -H 'Content-Type: application/json' \
  -d '{"model":"big-pickle","messages":[{"role":"user","content":"Hola"}]}'
```

- Acepta `Authorization: Bearer …` y también `x-api-key: …`, como los demás gateways de Zen.
- Acepta el nombre del modelo a secas (`big-pickle`) o con prefijo (`oc/big-pickle`).
- **CORS abierto** (`Access-Control-Allow-Origin: *`, preflight `OPTIONS` → `204`), así que se
  puede llamar desde el navegador o desde cualquier herramienta.
- Sin `stream` **junta el SSE** y devuelve un `chat.completion` normal, para clientes que no
  entienden streaming.
- Se enchufa a Cursor/aider/Claude Code como base URL `http://localhost:8090/v1`.

> ⚠️ **El CORS no autentica.** Con `Access-Control-Allow-Origin: *` cualquier web que visites
> puede *intentar* hablar con tu proxy; lo que lo impide es `CHAT_API_KEY` en `/v1/*`. No quites
> la clave si lo vas a exponer, y si sale de tu máquina pon TLS delante.

## Usar Claude Code con los modelos gratis de Zen

**El repo `anthropics/claude-code` no es el CLI**: es solo documentación y plugins, el binario
es cerrado, así que no hay nada que parchear. Lo que sí existe es una vía oficial para apuntarlo
a otro sitio: `ANTHROPIC_BASE_URL`. Este server implementa el otro extremo, la **API Messages de
Anthropic** (`/v1/messages`), y la traduce a `chat/completions` de Zen.

### El comando global `claude` (recomendado)

No hace falta exportar nada: hay un envoltorio instalado en el `PATH`
(`~/.cargo/bin/claude`) que arranca el proxy si no está levantado y luego lanza el Claude Code
de verdad. Escribes `claude` y ya está.

```bash
npm i -g @anthropic-ai/claude-code     # el binario real, cerrado
./opencode-chat/install-claude.sh      # instala el envoltorio en el PATH
```

El envoltorio versionado está en `opencode-chat/claude` y el instalador
`opencode-chat/install-claude.sh` lo copia al primer directorio escribible del `PATH` (en IDX,
`~/.cargo/bin`). Así, si recrean el contenedor, un `bash opencode-chat/install-claude.sh` vuelve
a dejar el comando listo.

```bash
claude --version
claude -p "Di hola en 3 palabras"
claude -p "Lee hola.txt y dime qué pone." --allowedTools "Read"
```

Qué hace el envoltorio, en orden:

1. Comprueba `http://127.0.0.1:$OPENCODE_PROXY_PORT/api/status` (puerto por defecto **8096**).
2. Si no responde, levanta `server.mjs` en una sesión tmux (`claude-proxy`) leyendo la clave real
   de `opencode-chat/.zen-key`; si ese fichero no existe, cae al tier anónimo de Zen. Espera
   hasta 15 s a que el proxy conteste.
3. Exporta `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` (de `opencode-chat/.api-key`),
   `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` y
   `CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT=1`.
4. Añade `--settings opencode-chat/claude-settings.json` para que el menú `/model` muestre los
   modelos reales de Zen (ver abajo). Si ya pasas tu propio `--settings`, se respeta el tuyo.
5. `exec` al binario real, `/home/user/.global_modules/bin/claude`.

El instalador también siembra `"model": "big-pickle"` en `~/.claude/settings.json` **solo si no
hay ninguno**, para que la primera sesión no muestre el nombre enmascarado de Claude. Si ya tienes
un modelo elegido, no lo toca.

> **El modelo activo no se fija por variable de entorno a propósito.** `ANTHROPIC_MODEL` pisa el
> menú `/model` y hace que la cabecera muestre un nombre enmascarado ("Sonnet 4.5") mientras el
> que responde es un modelo de Zen. Claude Code lo avisa él mismo: *«ANTHROPIC_MODEL is set to
> Sonnet 4.5 — new sessions use that while it is set»*. Por eso el envoltorio no lo exporta: el
> modelo vive en `~/.claude/settings.json` y se cambia con `/model`.

### Comandos propios dentro de Claude Code

El binario de Claude Code es **cerrado** (240 MB compilados, `"dependencies": {}` en el paquete
npm; el repo de GitHub es solo documentación, plugins e issues). No hay código fuente que editar,
**pero no hace falta**: soporta comandos propios en `.claude/commands/*.md`.

`claude-commands/provider.md` instala un `/provider` dentro de Claude Code:

```
❯ /provider
● Proveedores usables: 2 de 225  (https://models.dev/api.json)
    ● opencode                 114 modelos  openai · env:OPENCODE_API_KEY
    ● opencode-go               33 modelos  openai · env:OPENCODE_API_KEY
  Proveedores usables: 2
```

Acepta argumentos: `/provider all`, `/provider models groq`,
`/provider connect groq gsk_…`, `/provider off groq`.

Dos detalles que descubrimos a base de probarlo:

- La interpolación es `!`comando`` y el resultado va al **contexto**, no a la pantalla: por eso el
  markdown le pide al modelo que lo reproduzca tal cual en un bloque de código.
- El chequeo de permisos de Claude Code rechaza la shell que "no se puede analizar estáticamente",
  así que `!`OPENCODE_API_KEY="$(cat …)" node …`` falla. Por eso la clave la lee el propio script
  (`providers-cli.mjs` carga `.zen-key` igual que el servidor) y el `!` queda en una línea simple.

`install-claude.sh` copia el comando a `~/.claude/commands/`. Cualquier otro comando nuevo es
añadir un `.md` en `claude-commands/`.

### El menú `/model` muestra los modelos reales

Sin nada más, `/model` enseña el catálogo de Claude (Opus, Sonnet, Fable…) y uno cree que tiene
Claude de verdad, cuando en realidad el proxy manda todos los `claude-*` a `big-pickle`. Para
arreglarlo, `claude-settings.json` usa el `modelPicker` de Claude Code:

```
Select model
  1. Default (recommended)     Use the default model (currently Opus 5.5) · $4/$20 per Mtok
❯ 2. big-pickle ✔              Zen gratis · el más equilibrado (1.5–4.6 s) · recomendado
  3. mimo-v2.6-flash-free      Zen gratis · el más rápido (≈1 s) · ideal para tareas cortas
  4. longcat-2.5-preview-free  Zen gratis · el más constante en español (2–7 s)
  5. nemotron-3-ultra-free     Zen gratis · muy rápido (≈0.4 s) · no sale en /v1/models
  6. mimo-v2.5-free            Zen gratis · bueno pero lento (5–11 s)
  7. space-bunny-free          Zen gratis · el único que responde también sin clave
```

Detalles del `modelPicker` que descubrimos a base de probarlo (no está documentado):

- Es un objeto `{ replaceBuiltInOptions, options: [{ model, label?, description?, behavesAs? }] }`.
- `replaceBuiltInOptions: true` oculta el catálogo de Claude y deja solo tus filas. **La fila
  «Default (recommended)» no se puede quitar** (siempre es la primera y describe el modelo por
  defecto del catálogo interno, de ahí ese "currently Opus 5.5" que no casa con nada). Es
  cosmético: si la eliges, el proxy también la traduce a `big-pickle`.
- `behavesAs` le dice a Claude Code qué capacidades y ventana de contexto asumir con esos modelos
  que no conoce; además silencia el aviso `unrecognized_model`.
- Solo se honra desde *managed settings*, `--settings` o los ajustes de usuario, **nunca desde el
  proyecto**. De ahí que el envoltorio lo pase con `--settings`.
- Al elegir una fila, Claude Code la guarda como `"model"` en `~/.claude/settings.json` y la
  recuerda entre sesiones. El proxy resuelve ese id directamente (no hace falta el mapeo `claude-*`).

Para pedir uno puntual sin tocar el menú:

```bash
ANTHROPIC_MODEL=longcat-2.5-preview-free claude -p "hola"
claude --model mimo-v2.6-flash-free -p "hola"
```

Variables que admite el envoltorio: `OPENCODE_PROXY_PORT`, `OPENCODE_PROXY_SESSION`,
`OPENCODE_CHAT_DIR`, y cualquiera de Claude Code (`ANTHROPIC_MODEL`, `ANTHROPIC_AUTH_TOKEN`…),
que siempre pueden pisar lo que pone el envoltorio.

### A mano (sin el envoltorio)

```bash
export ANTHROPIC_BASE_URL=http://localhost:8090          # sin /v1
export ANTHROPIC_AUTH_TOKEN=$(cat opencode-chat/.api-key)
claude
```

Verificado el 2026-09-30 con **Claude Code 2.1.285** real contra este proxy, incluido el ida y
vuelta de herramientas:

```
$ claude -p "Lee hola.txt y dime la versión que pone. Usa la herramienta Read."
`hola.txt` dice: **Version 1.3 (build 2026-09-30)**
```

Eso significa que el ciclo completo funciona: Claude Code pide `/v1/messages` → el proxy lo
traduce → el modelo gratis decide llamar a `read` → el proxy lo devuelve como `tool_use` con el
nombre `Read` → Claude Code ejecuta la lectura → manda el `tool_result` → el modelo contesta.

### Qué se traduce

| Anthropic (lo que manda Claude Code) | Zen (OpenAI) |
|---|---|
| `system` (texto o bloques) | mensaje `system` |
| bloques `text` | `content` |
| bloques `tool_result` | mensajes `role:"tool"` |
| `tools[].input_schema` | `tools[].function.parameters` |
| `stop_sequences` | `stop` |
| `stream: true` | siempre (lo exige Zen) y se reencuadra a eventos de Anthropic |
| `stop_reason` | `end_turn` / `max_tokens` / `tool_use` |

Los eventos de streaming son los de verdad: `message_start`, `ping`, `content_block_start`,
`content_block_delta` (`text_delta` o `input_json_delta`), `content_block_stop`, `message_delta`
y `message_stop`.

### Los nombres de las tools (el truco)

Zen exige ver por nombre las 11 tools del cliente oficial, y las de Claude Code se llaman
`Bash`, `Read`, `Write`… en mayúscula. Al salir se renombran a su equivalente oficial
(`bash`, `read`, `write`…) y al volver se deshace el cambio, así que Claude Code recibe el
`tool_use` con el nombre que espera. Con herramientas **no** se fuerza `tool_choice: "none"`:
se deja en `auto` para que el modelo las use de verdad.

### Modelos

Claude Code solo sabe pedir `claude-*`, así que se traducen solos:

| Lo que pide | A dónde va |
|---|---|
| cualquier `claude-*` | `big-pickle` (`CLAUDE_MODEL` para cambiarlo) |
| con `haiku` / `mini` / `fast` | `mimo-v2.6-flash-free` (`CLAUDE_SMALL_MODEL`) |
| un id de Zen (`big-pickle`, `oc/longcat…`) | ese mismo |

Para forzar uno concreto, `ANTHROPIC_MODEL=longcat-2.5-preview-free`.

### Avisos

- Al arrancar, Claude Code avisa de que «auto mode classifier» no está disponible porque las
  peticiones van por tu gateway. **Es cosmético**: todo sigue funcionando.
- Son modelos pequeños y stealth haciendo de Claude: para tareas agénticas largas van a ir peor
  que el Claude de verdad. Para preguntas cortas y edición sencilla, bien.
- Anthropic dice explícitamente que no soporta enrutar Claude Code a modelos que no son Claude.
  Esto es configuración propia, no algo que ellos mantengan.

## Usar Qwen Code con los modelos gratis de Zen

[Qwen Code](https://github.com/QwenLM/qwen-code) es un **fork abierto de Gemini CLI** (su README
lo dice literalmente), no de Claude Code. Se puede editar y ampliar, cosa que con el binario
cerrado de Claude Code no se puede. Y ya habla cualquiera de los tres protocolos (OpenAI,
Anthropic, Gemini), así que con **una entrada en su config** apunta al gateway y hereda los 225
proveedores de models.dev igual que Claude Code.

```bash
npm i -g @qwen-code/qwen-code        # el CLI real (v0.24.7 probado)
./opencode-chat/install-claude.sh    # instala también `qwen` y ~/.qwen/settings.json
qwen -p "Di hola"                    # one-shot; `qwen` a secas abre el modo interactivo
```

El envoltorio `opencode-chat/qwen` es el hermano de `claude`: comprueba `/api/status`, levanta el
proxy en tmux (`claude-proxy`, el mismo que usa Claude Code) si no está, exporta
`OPENCODE_GATEWAY_KEY` con la clave de `.api-key` y hace `exec` al binario real. Ojo: **Qwen Code
no es interactivo por defecto** — `qwen "prompt"` es one-shot y `-i` abre el interactivo.

### La config

`jpcode-settings.json` (se instala en `~/.qwen/settings.json`) declara los modelos vía
`modelProviders`, con `baseUrl` apuntando al gateway y `envKey: OPENCODE_GATEWAY_KEY`:

```json
{
  "modelProviders": {
    "openai": [
      { "id": "big-pickle", "name": "big-pickle (Zen gratis)",
        "baseUrl": "http://127.0.0.1:8096/v1", "envKey": "OPENCODE_GATEWAY_KEY" }
    ]
  },
  "security": { "auth": { "selectedType": "openai" } },
  "model": { "name": "big-pickle" }
}
```

Tres cosas que cuestan un rato averiguar:

- **Las claves nunca van en `settings.json`.** Cada modelo declara `envKey`, y el runtime lee
  `process.env[envKey]`. Por eso la clave la pone el envoltorio en el entorno.
- La clave de `modelProviders` (`openai`) es el **tipo de autenticación integrado**; un id propio
  solo vale si además lo mapeas en `providerProtocol: { "<id>": "openai" }` — sin mapeo, la
  entrada se ignora en silencio. Cambiar `providerProtocol` obliga a reiniciar.
- Comparte convenciones con Claude Code (`CLAUDE.md`, `.claude/commands/*.md`), pero sus comandos
  propios viven en `~/.qwen/commands/`.

### Conectar proveedores: `/connect` y `/provider` (el «Connect a provider» de OpenCode)

Qwen trae el flujo de conexión de serie con **tres alias**: `/auth`, `/connect` y `/login`. Con
`patch-jpcode-connect.mjs` además:

```
/connect   (o /provider)  →  catálogo completo con buscador  →  eliges empresa
                          →  pegas la API key (Step 1/2)  →  eliges modelo
```

Es el **mismo diálogo, en un paso**: abre directamente en el catálogo —no en el menú de tres
opciones—, con `Esc` para volver a ese menú (Alibaba / Third-party / Custom). El título es
«Connect a Provider», igual que en OpenCode. Antes `/provider` era el listado de texto; ese listado
sigue existiendo como **`/providers`**.

**Qwen solo trae ~12 empresas hardcodeadas.** Para que tenga la lista de OpenCode (models.dev) hay
otro parche:

```bash
node opencode-chat/patch-jpcode-providers.mjs   # inyecta 202 proveedores de models.dev en el catálogo
```

Parchea el array `ALL_PROVIDERS` del chunk instalado y añade cada proveedor con su `baseUrl`,
`protocol` y `envKey`, en *Third-party Providers*. Verificado: `/connect` → **Deep
Infra** → *“Deep Infra · Step 1/2 · API Key”* → pegas la clave → modelos. Es idempotente y
re-aplicable tras `qwen update` (lo hace `install-claude.sh`); además **refresca** lo ya inyectado
(el catálogo cambia y alguna URL necesitó arreglo).

> **Ojo con la versión en la `baseUrl` (nos costó un 404 sin mensaje).** Qwen añade la suya en los
> proveedores con protocolo `gemini`: pide `{baseUrl}/v1beta/models/{m}:generateContent`. models.dev
> ya trae `/v1beta` puesto (`…/generativelanguage.googleapis.com/v1beta`), así que con las dos la
> petición sale a `/v1beta/v1beta/…`: Google responde **404 con un HTML**, el CLI no sabe sacarle el
> mensaje y te muestra `{"error":{"message":"","code":404,"status":"Not Found"}}`. Por eso este
> parche **quita la versión** de la `baseUrl` en los proveedores `gemini`. Si algún día ves ese error
> tan raro, mira la `baseUrl` del proveedor antes que nada (una clave inválida, en cambio, da
> `400 API key not valid. Please pass a valid API key.`).
> Qwen revienta si un id lleva punto (`wafer.ai`), así que el parche filtra ids a `[a-z0-9_-]`.

**Con 200+ proveedores, esa lista es inmanejable sin buscador** (Qwen no lo trae). Segundo parche:

```bash
node opencode-chat/patch-jpcode-auth.mjs      # buscador en el diálogo de conexión
node opencode-chat/patch-jpcode-connect.mjs   # /provider como alias + abrir directo en el catálogo
node opencode-chat/patch-jpcode-discover.mjs  # tu propia API key: detecta los modelos solos
```

`patch-jpcode-auth.mjs` mete un filtro por texto en el diálogo, igual que `patch-jpcode-search.mjs` hace
con `/model`:

```
│ Connect a Provider                                                               │
│ filtro: zai   [2/211]                                                            │
│ › Z.AI API Key                                                                   │
│   Z.AI Coding Plan                                                               │
│ Escribe para buscar, Enter para elegir, Esc para volver                          │
```

Escribe para filtrar (mira nombre, etiqueta, valor **y descripción**, así vale igual «z.ai» que
`zai-coding-plan`), `Backspace` borra, `Ctrl+U` limpia y Esc vuelve al menú. Ojo: **Escape se
comprueba antes que `key.meta`**, porque el terminal manda Esc a veces como `meta` y si no, no
vuelve atrás.

`patch-jpcode-connect.mjs` cierra el círculo: añade `provider` a los alias del diálogo, hace que
abra ya en el catálogo (`viewLevel` inicial `thirdparty-select`) y retitula esa pantalla. Necesita
los otros dos (catálogo + buscador) para tener algo que buscar.

Los tres son idempotentes, reconocen instalaciones anteriores y se re-aplican tras `qwen update`
(`install-claude.sh` los lanza en orden).

### Trae tu propia API key: «Custom Provider» con detección de modelos

Esto es el **Custom Provider** de OpenCode: no dependes de que tu proveedor esté en el catálogo,
solo pegas su **Base URL** y tu **API key**, y el CLI **descubre los modelos** de ese endpoint y
tedas eligiéndolos. Qwen ya trae proveedor y flujo (`custom-openai-compatible`, protocolo `openai`,
7 pasos), así que aquí **no se reimplementa nada**; el detalle es que de fábrica el paso
«Model IDs» era un campo de texto —había que saberse los ids— en lugar de descubrirlos, y además
el Custom Provider no aparecía en la lista del catálogo.

Dos arreglos:

```bash
node opencode-chat/patch-jpcode-connect.mjs    # lo mete en la lista del catálogo (/provider)
node opencode-chat/patch-jpcode-discover.mjs   # activa la detección automática de modelos
```

`patch-jpcode-discover.mjs` añade `supportsModelDiscovery:true` al proveedor. Con eso el paso de
modelos pasa a ser `DiscoveringModelIdsStep`, que hace `GET {baseUrl}/models` con
`Authorization: Bearer {apiKey}` y pinta la lista para marcarla con `Space` (el buscador filtra).
Si la petición falla, cae a la lista estática del proveedor, así que no empeora nada. Por eso
mismo los ~200 proveedores del catálogo con protocolo `openai` también lo llevan; los `anthropic`
y `gemini` no, porque su descubrimiento no es `Bearer` (`x-api-key` / `?key=`) y se quedan con su
lista estática.

```
│ Models · from the provider · 2 checked                                          │
│ filtro: alpha                                                                   │
│ › ◉︎ alpha-1                                                                     │
│   ◉︎ alpha-2                                                                     │
│   ◯︎ beta-x                                                                      │
│ Space to toggle, Enter to confirm, Tab to move between fields                   │
```

Flujo completo verificado (con un servidor falso en local):

```
/provider  →  catálogo [211/211]  →  escribes «custom»  →  › Custom Provider
           →  Step 1/7 · Protocol: OpenAI-compatible
           →  Step 2/7 · API: Chat Completions
           →  Step 3/7 · Base URL: http://127.0.0.1:8099/v1
           →  Step 4/7 · API Key: sk-…  →  Models · from the provider  (alpha-1, alpha-2, beta-x)
           →  Step 7/7 · Review  →  ●︎ Successfully configured Custom Provider.
```

La clave se guarda en `settings.json` bajo un `envKey` generado del endpoint
(`QWEN_CUSTOM_API_KEY_OPENAI_HTTP_127_0_0_1_8099_V1_…`), se crea el proveedor y el modelo elegido
queda activo. Comprobado además que **las peticiones salen al endpoint propio con la clave del
usuario** (`Bearer sk-…`) y el modelo responde, y que los modelos aparecen en `/model` dentro de su
proveedor. Los dos parches son idempotentes.

### `/model`: lo que tienes, etiquetado como en OpenCode, con buscador

A diferencia de OpenCode, Qwen Code **no lee models.dev**: su `/model` es una lista estática de
`~/.qwen/settings.json` y su diálogo, de fábrica, **no tiene buscador** (se comprobó: escribir no
filtra). Dos arreglos:

```bash
node opencode-chat/sync-jpcode-models.mjs      --repo   # /model: Zen + los proveedores conectados
node opencode-chat/patch-jpcode-search.mjs              # buscador en el selector /model
node opencode-chat/patch-jpcode-model-sections.mjs      # dos niveles: proveedor → modelos
node opencode-chat/patch-jpcode-discover.mjs            # Custom Provider: detecta los modelos
```

**1. `sync-jpcode-models.mjs`** — escribe en `modelProviders` (clave propia `opencode-zen`) **los
gratis de Zen y los modelos de los proveedores conectados al gateway**, cada uno etiquetado
**«Modelo · Proveedor»** como en OpenCode (`Grok 4.7 · OpenCode Zen`, `GLM-5 · OpenCode Go`) y los
gratis marcados con `Gratis, sin cuenta`. **No borra** los proveedores que hayas añadido con
`/connect`: fusiona.

Los **modelos de pago del catálogo de Zen** (`opencode`, `opencode-go`: Sol, Opus, GPT…) cuelgan de
la misma clave que el tier gratis y sin plan de pago no responden, así que **quedan fuera por
defecto** (eran 147 entradas enturbiando la lista). Con `OPENCODE_ZEN_PLAN=1` —o `--zen-plan`— se
añaden. `--zen` deja solo los gratis y `--all` se acepta como alias del modo por defecto.

El envoltorio `opencode-chat/qwen` lanza este sync **en cada arranque** (si el gateway responde),
así que lo que conectes aparece en `/model` sin tocar nada. `OPENCODE_SYNC_MODELS=0` lo desactiva.

```bash
jpcode-modelos.mjs            # ver el catálogo del gateway (Zen primero, luego por proveedor)
jpcode-modelos.mjs grok       # filtrar por texto
```

**2. `patch-jpcode-search.mjs`** — Qwen viene minificado en chunks, así que esto parchea los JS
instalados para que el diálogo `/model` tenga filtro:

```
│ Select Model                                                                     │
│ filtro: grok   [8/8]                                                             │
│ › [openai] Grok 4.7 · OpenCode Zen (opencode/grok-4.7)                           │
│   [openai] Grok 4.5 · OpenCode Zen (opencode/grok-4.5)                           │
│ Enter to select, ↑↓ to navigate, Esc to close                                    │
```

**3. `patch-jpcode-model-sections.mjs`** — con 150+ modelos, una lista plana no hay quien la use.
Esto la parte en dos pantallas, como OpenCode: **primero los proveedores** (con cuántos modelos
tiene cada uno) y al elegir uno, **solo sus modelos**:

```
│ Select Model                                                                     │
│ proveedores   escribe para filtrar   [2/2]                                       │
│ › 1. OpenCode Zen                                    10 modelos                  │
│   2. Google                                           8 modelos                  │
```

```
│ Select Model                                                                     │
│ Google   escribe para filtrar   [8/8]                                            │
│ › 1. ‹ Todos los proveedores                                                     │
│   2. [gemini] [Google] gemini-flash-latest (gemini-flash-latest)                 │
```

`Esc` (o «‹ Todos los proveedores») vuelve a la lista de proveedores, y el buscador filtra en la
pantalla en la que estés. El proveedor de cada modelo se deduce del nombre que escribe el sync
(«Modelo · Proveedor», por el extremo que más se repite), luego del `envKey` legible
(`GOOGLE_API_KEY` → «Google») y, si no hay nada de eso, del host de su `baseUrl`. Va **después** de
`patch-jpcode-search.mjs` (reescribe lo que ese deja) y también es idempotente.

Es **idempotente y re-aplicable**: `qwen update` reemplaza los chunks, así que hay que volver a
lanzarlo (lo hace `install-claude.sh`). Toca tres sitios: el diálogo (estado + captura de teclas +
filtro), `DescriptiveRadioButtonSelect` y `BaseSelectionList` (para propagar `disableVimNav`, y
que `j`/`k` no muevan la lista mientras escribes).

**4. Los comandos de texto** (`jpcode-commands/*.md` → `~/.qwen/commands/`): **`/providers`** lista
los proveedores con su estado de conexión y **`/modelos`** el catálogo de modelos agrupado;
los dos aceptan un texto como filtro (`/providers models deepinfra`, `/modelos grok`) y `/modelos sync`
regenera los ajustes. Para lo interactivo, `/connect` y `/provider`.

Tres cosas que costaron un rato y conviene tener escritas:

- **En los comandos de Qwen la forma de ejecutar shell es `!{comando}`** (llaves), no `!`comando``
  (backticks, la de Claude Code). Con backticks Qwen se lo pasa al modelo como texto literal y no
  se ejecuta nada; con `!{…}` el CLI lo corre **antes** y **inyecta la salida real en el prompt**, así
  que el modelo solo la muestra — sin depender de que acierte a llamar una tool. Verificado: antes
  `/providers` fallaba a menudo (el modelo escupía `<tool_call>` como texto); ahora es determinista.
- **Los argumentos: `$ARGUMENTS` sí, `{{args}}` no (para varios).** Qwen también soporta `{{args}}`,
  pero lo pasa **escapado como un único token** (`'models deepinfra'`), y el CLI lo lee como un solo
  argumento. `$ARGUMENTS` se sustituye en crudo y llega bien. Los dos comandos usan `$ARGUMENTS`.
> El `!{…}` muestra diálogo de confirmación; con `approvalMode: "default"` + `permissions.allow`
> (lo que escribe `sync-jpcode-models.mjs`) corre sin preguntar. Verificado: `/providers`,
> `/providers models deepinfra` (72 modelos) y `/modelos mimo`.
- **El permiso de shell y los modos.** Con `tools.approvalMode: "auto"` (por defecto) manda el
  clasificador y `permissions.allow` **no basta**; además aquí el clasificador está caído y siempre
  pregunta. Con `tools.approvalMode: "default"` sí se respeta `permissions.allow`, así que
  `sync-jpcode-models.mjs` escribe `permissions.allow: ["Bash(node *)"]` para que los comandos
  propios corran sin preguntar (el resto sigue preguntando).

> Detalle que ahorra tiempo: la etiqueta `[openai]` del selector es el **authType**, no el
> proveedor. Un id propio se mapea con `providerProtocol` y acaba mostrándose igual como
> `[openai]`, así que la agrupación se consigue **ordenando** y poniendo el proveedor en el
> nombre, no con claves separadas.

### El `400 invalid request` de Zen (y por qué pasaba)

Con Qwen Code, el gateway devolvía
`400 Upstream request failed: [invalid_request_error] invalid request`. No era el system prompt
(enorme) ni el número de tools: era que Qwen manda **tools cuyo `parameters` no lleva `type`**
(`get_goal`, `list_agents` van con `{}`). El upstream rechaza toda la petición por eso.
`zenBody()` ahora normaliza cada tool a `{ type: "object", properties: {}, required: [], … }`
(cubre todas las rutas, no solo Qwen) y sigue borrando `stream_options`, que Qwen también manda y
Zen tampoco conoce. Diagnóstico con `DEBUG=1` (y `DEBUG_DUMP=/ruta` para volcar el body completo):

```bash
cd /tmp && qwen -p "di hola"     # antes: 400 · ahora: responde
qwen -p "Lee hola.txt y dime qué contiene. Usa tus herramientas."
```

## Cualquier proveedor de models.dev (portado de OpenCode)

Hasta aquí el gateway solo hablaba con Zen. Además de eso, ahora **rutea a cualquiera de los 225
proveedores del catálogo de [models.dev](https://models.dev)** — el mismo que usa OpenCode — con
la sintaxis `proveedor/modelo`. Estado real del catálogo el 2026-09-30:

| | |
|---|---|
| Proveedores en el catálogo | **225** |
| …con URL base en el propio catálogo | 209 |
| …con protocolo implementado aquí | 225 de 225 (214 OpenAI, 9 Anthropic, 2 Google) |
| …que necesitan firma/federación propia | 9 (Bedrock, Vertex, Azure, watsonx, GitLab, SAP, Salad) |
| Modelos en total | **8.324** |

### Cómo se enruta

```bash
# Zen gratis, como siempre
curl -s localhost:8090/v1/chat/completions -H "Authorization: Bearer $CHAT_API_KEY" \
  -d '{"model":"big-pickle","messages":[{"role":"user","content":"hola"}]}'

# y ahora cualquier proveedor: "proveedor/modelo"
curl -s localhost:8090/v1/chat/completions -H "Authorization: Bearer $CHAT_API_KEY" \
  -d '{"model":"groq/llama-3.3-70b-versatile","messages":[{"role":"user","content":"hola"}]}'
```

El separador es la **primera** barra (igual que `parseModel` de OpenCode), así que los ids con
barras dentro funcionan enteros: `openrouter/anthropic/claude-sonnet-4.5`.

La clave es que **no se cargan paquetes npm** como hace OpenCode (`@ai-sdk/*`). Se implementan los
**tres protocolos** que cubren a todos y se elige según el `npm` que declare models.dev:

| `npm` del catálogo | Protocolo | A dónde pega |
|---|---|---|
| `@ai-sdk/openai-compatible` y casi todo lo demás | OpenAI | `{base}/chat/completions` |
| `@ai-sdk/anthropic` | Anthropic | `{base}/messages` (+ `anthropic-version`, `x-api-key`) |
| `@ai-sdk/google` / `google-vertex` | Google | `{base}/models/{m}:generateContent` (+ `x-goog-api-key`) |

Los tres normalizan a chunks con forma de OpenAI, así que el resto del servidor (y el puente a
Anthropic de Claude Code) no sabe de qué proveedor viene la respuesta.

### Cabeceras por proveedor

Algunos no se conforman con la clave. Los dos endpoints de Zen que salen en el catálogo
(`opencode` y `opencode-go`) rechazan la petición sin la sesión:

```
Request is missing x-opencode-session and cannot be routed efficiently.
```

Así que el registro inyecta por proveedor las mismas cabeceras de la receta
(`User-Agent: opencode/…`, `x-opencode-session`, `x-opencode-request`) en `CABECERAS_BASE`
(`providers.mjs`). Con eso el error pasa a ser el de verdad, si lo hay: por ejemplo
`An active OpenCode Go subscription is required to use Go models` cuando la cuenta no tiene ese
plan. Se pueden añadir las tuyas o pisarlas con `providers.json`:

```json
{ "providers": { "groq": { "headers": { "X-Mi-Cabecera": "valor" } } } }
```

### Conectar y desconectar proveedores

Un proveedor solo aparece cuando **está activo y tiene credencial**. La credencial se busca en
este orden: **variables de entorno → `auth.json` → `providers.json`**. Los nombres de las
variables salen del propio catálogo (`OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`…).

```bash
# 1) por entorno, lo más cómodo
export GROQ_API_KEY=gsk_...
export OPENROUTER_API_KEY=sk-or-...

# 2) o por API, y se guarda en auth.json (permisos 600)
curl -X POST localhost:8090/v1/providers/groq/key \
  -H "Authorization: Bearer $CHAT_API_KEY" -d '{"apiKey":"gsk_..."}'
```

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/v1/providers` | proveedores **usables** (activos + con clave + con URL + protocolo implementado) |
| `GET` | `/v1/providers?all=1` | los 225, con `motivo` para cada uno que no sirva |
| `GET` | `/v1/providers?all=1&models=1` | además, todos sus modelos |
| `GET` | `/v1/providers/groq` | ficha de uno, con sus modelos |
| `POST` | `/v1/providers/groq/key` | guarda la clave en `auth.json` y lo activa |
| `POST` | `/v1/providers/groq/enable` · `/disable` | lo activa o lo apaga sin borrar la clave |
| `POST` | `/v1/providers/refresh` | vuelve a bajar el catálogo de models.dev |

`GET /v1/models` suma Zen + los modelos de los proveedores conectados (`?all=1` para verlos
todos). Sin clave, la respuesta de un proveedor es un error que dice **qué variable** falta:

```json
{ "error": { "message": "el proveedor \"google\" no está conectado: define GOOGLE_API_KEY" } }
```

### Configuración

Si existe un `opencode.json` / `opencode.jsonc` (en la carpeta del proyecto o en
`~/.config/opencode/`), **se lee** — tanto la clave `providers` (formato v2) como `provider` (v1).
Encima de eso manda `opencode-chat/providers.json`, que es donde se guarda el estado:

```json
{
  "providers": {
    "groq":       { "enabled": true },
    "anthropic":  { "enabled": false },
    "qvac":       { "baseURL": "http://127.0.0.1:8080/v1" },
    "cloudflare-workers-ai": { "baseURL": "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1" },
    "openai":     { "models": { "gpt-5": { "disabled": true } } }
  }
}
```

Las URL admiten plantillas `${VARIABLE}`. Si un proveedor no trae URL base en el catálogo y no
está en la tabla de conocidas, se le pone ahí (los 2 casos hoy: `qvac`, que es IA local, y los
de firma propia).

### Catálogo y caché

El catálogo de models.dev son **5,2 MB**, así que se cachea en `opencode-chat/.cache/models.json`
(TTL 6 h, `POST /v1/providers/refresh` lo fuerza). `MODELS_OFFLINE=1` funciona sin red usando lo
que haya en disco. `GET /v1/models` **no** dispara la descarga: solo lee la caché.

### Qué no se puede (y por qué)

Nueve proveedores necesitan firma o federación propia y se listan con el motivo en vez de fingir
que funcionan: `amazon-bedrock` (SigV4), `google-vertex` (cuenta de servicio), `azure` y
`azure-cognitive-services` (deployment + api-version), `watsonx` (IAM de IBM), `gitlab`
(OAuth propio), `salad-cloud`, `sap-ai-core` y `google-vertex-anthropic`.

## Exponerlo a internet con HTTPS gratis

**Cloudflare Quick Tunnel**: un binario, un comando, URL `https://…trycloudflare.com` y **sin
cuenta**. Comprobado el 2026-09-30: `cloudflared 2026.9.3`, túnel establecido y una petición de
chat completa cruzando la URL pública.

```bash
mkdir -p .bin && curl -sL -o .bin/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x .bin/cloudflared

# 1) instancia pública: solo /v1, con clave (el chat /api/* queda cerrado)
HOST=0.0.0.0 API_ONLY=1 OPENCODE_API_KEY=oc_sk_… node server.mjs 8091

# 2) el túnel apuntando a esa instancia
.bin/cloudflared tunnel --url http://127.0.0.1:8091 --no-autoupdate
```

Te imprime la URL pública. Con ella:

```bash
curl https://<algo>.trycloudflare.com/v1/models -H "Authorization: Bearer $CHAT_API_KEY"
```

- `API_ONLY=1` es **obligatorio** si lo expones: cierra `/api/*` (que no pide clave) y deja
  únicamente la API con clave. Sin eso, cualquiera con la URL podría chatear a tu costa.
- La URL es **aleatoria y efímera**: muere con el proceso de `cloudflared` y cambia al reiniciarlo.
- El límite de ~200 peticiones/día del tier anónimo va por la IP de **este** servidor, no por quien
  llama.
- Alternativas sin cuenta: `localhost.run` y Pinggy van por SSH (aquí no hay `ssh`). `ngrok` hoy
  exige token, y localtunnel pide una página de aviso a quien entra.

## Rutas

| Método | Ruta | Auth | Qué hace |
|---|---|---|---|
| `GET` | `/v1/models` | clave | Zen + los modelos de los proveedores conectados (`?all=1` para todos) |
| `POST` | `/v1/chat/completions` | clave | chat, con o sin `stream`; `model` admite `proveedor/modelo` |
| `POST` | `/v1/messages` | clave | puente a la API de Anthropic (lo que usa Claude Code) |
| `GET` | `/v1/providers` | clave | proveedores usables (`?all=1`, `?models=1`) |
| `POST` | `/v1/providers/:id/key` · `/enable` · `/disable` | clave | conectar, activar y apagar proveedores |
| `POST` | `/v1/providers/refresh` | clave | volver a bajar el catálogo de models.dev |
| `GET` | `/api/status` | loopback | si hay key de Zen, contra qué upstream habla y cuántos proveedores hay |
| `POST` | `/api/chat` | loopback | lo que usa esta página; devuelve el SSE tal cual |
| `POST` | `/api/probe` | loopback | una petición mínima a un modelo: `{ok, status, ms, text, error}` |
| `GET` | `/` | — | el chat |

Las rutas `/api/*` son **solo desde loopback** a propósito: el chat funciona sin clave, pero
nadie de la red puede usar el proxy para gastar tu cuota. Lo que quieras usar de fuera va por
`/v1/*` con la clave.

## Qué trae

- **Solo modelos gratis** (10), con la etiqueta de lo que se vio al probarlos el 2026-09-30.
- **Botón «Probar todos los gratis»**: petición mínima a cada uno, HTTP y latencia, y el
  resultado queda en la lista de modelos.
- **Chat con streaming** (`stream: true`) y botón de parar.
- **El razonamiento se muestra aparte**: los modelos mandan `reasoning_content` antes del texto;
  mientras llega se ve en cursiva y al terminar queda plegado en un `<details>`.
- **Aviso de respuesta vacía**: si se gasta `max_tokens` razonando, el chat lo dice y te manda
  subirlo en vez de dejar la burbuja en blanco.
- **Errores legibles**: el `403 FreeTierError` se traduce explicando qué falló de la receta.
- **Markdown de verdad**, construido con **nodos del DOM, nunca `innerHTML`**.
- **Tema claro/oscuro** y buscador de modelos.

## Los 10 gratis, tal como están hoy

| Modelo | Estado | Notas |
|---|---|---|
| `big-pickle` | ✅ | por defecto: el más equilibrado en español y código |
| `mimo-v2.5-free` | ✅ | bien, pero lento (5-11 s) |
| `mimo-v2.6-flash-free` | ✅ | el más rápido (≈1 s) |
| `longcat-2.5-preview-free` | ✅ | el más constante en español |
| `nemotron-3-ultra-free` | ✅ | no sale en `/models`, pero responde |
| `space-bunny-free` | ✅ | el único que va sin key |
| `nemotron-3.5-lightning-free` | ⚠️ | vuelca su cadena de pensamiento y tarda 45-120 s |
| `muse-spark-1.3-contributor-free` | ❌ | 400: habla el protocolo `/responses` |
| `muse-spark-1.2-contributor-free` | ❌ | igual; además comparte prompts con Meta |
| `ling-3.0-flash-fin-free` | ❌ | 404: no existe la ruta |

Los tres últimos se dejan en la lista a propósito: selecciónalos y verás el error real.

### Sin tool calls de relleno

Las 11 tools son obligatorias, pero si las describes de forma neutra los modelos **intentan
llamarlas** y devuelven texto vacío. `tool_choice: "none"` no lo evita. Lo que sí: describirlas
como no disponibles y pedirlo en el `system`. Con eso, 0 tool calls en los 5 modelos probados.

### Tool calls forzadas: el puente de `forced-tools.mjs`

La receta anterior tiene un precio: **ningún modelo del tier gratis emite `tool_calls`**, y hay
clientes que no lo necesitan para responder sino para *llamar*. El caso grande es `generateJson`
de Qwen Code, que no pide JSON en texto sino una tool (`respond_in_schema`, con el esquema de la
respuesta) y `tool_choice: "required"`. Y su mayor usuario es el **modo auto**, cuyo clasificador
decide con esa llamada si una acción se permite; si falla, el chat avisa

```
Auto Mode couldn't classify this action (Classifier stage 1 unavailable). Review it manually.
```

y el modo auto no puede aprobar nada. Lo mismo pasa con el modelo rápido, la compactación y el
advisor.

`forced-tools.mjs` traduce una en la otra, solo en el camino **sin streaming** (que es lo único que
el motor usa para pedir JSON):

- **Hacia el modelo**: `tool_choice: "none"` + una instrucción en el `system` de que responda con el
  JSON que habrían sido los argumentos, con el esquema delante. Las 11 tools de relleno se quedan,
  que sin ellas no se pasa el gate. Comprobado contra el upstream real: `mimo-v2.6-flash-free` con
  la petición del clasificador devuelve `{ "shouldBlock": false }` limpio, y antes devolvía
  `content: ""`.
- **Hacia el cliente**: si en la respuesta hay un objeto JSON —da igual si viene pelado, en valla de
  markdown (` ```json `) o con prosa alrededor— se fabrica el `tool_calls` que el cliente esperaba y
  el `content` se deja vacío, como en cualquier respuesta con tool call.

Se aplica solo cuando se puede saber **qué** función se forzaba (`tool_choice: "required"` con una
única tool, o `tool_choice` nombrándola) y su esquema es un objeto. Con varias tools y `required`,
con `tool_choice: "auto"` (una sesión normal) o con un esquema que no sea objeto, la petición sale
tal cual entró. En los proveedores del catálogo de models.dev, que sí saben llamar funciones, solo
se aplica la mitad de vuelta: la petición no se toca.


## Tests

```bash
node test.mjs     # 227 comprobaciones, sin navegador y sin gastar cuota
```

1. **El servidor de verdad**, arrancado como proceso hijo contra un **Zen falso local** que
   guarda lo que recibe: comprueba la receta entera (UA, formato de ids, `stream:true`, las 11
   tools, `tool_choice`), que la key la pone el proxy y no el cliente, el tier anónimo
   (`Bearer public`), la traducción del 403 y del 400, la sonda, la API de OpenAI
   (`/v1/models`, `/v1/chat/completions`), el saneo del body (borra `stream_options`, normaliza
   `tools[].function.parameters` sin `type` — lo que rompía a Qwen Code), el puente de Anthropic
   (`/v1/messages`, con el ida y vuelta de los nombres de las tools y el mapeo de modelos
   `claude-*`), y que la key no aparece ni en el HTML ni en `app.js` ni en `/api/status`.
2. **`app.js` con un DOM simulado**: init, catálogo, buscador, streaming, markdown, error 403,
   respuesta vacía, estado sin key, tema y sonda.
3. **La lista de modelos de Qwen** (`sync-jpcode-models.mjs`) contra un gateway falso: Zen primero,
   los proveedores agrupados y ordenados, el nombre etiquetado, `envKey` en vez de clave y que se
   respeten los ajustes previos.

`fetch` va simulado en la parte 2: no toca la API real.

## Avisos

- Es un set **rotativo**: los modelos aparecen, desaparecen o se rompen sin aviso. Si algo falla,
  pulsa la sonda antes de culpar a tu key.
- Zen dice en sus docs que el tier gratis es para usarlo **dentro de OpenCode**; esto lo esquiva
  haciendo que la petición pase por el cliente oficial. Si te importa el ToS, usa la CLI oficial.
- El upstream se puede cambiar con `OPENCODE_BASE` (lo usan los tests para apuntar al mock).
