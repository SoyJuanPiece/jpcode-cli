# jpcode

Tu CLI de código, con la pinta de Claude Code, sobre **Qwen Code (Apache-2.0)** y el gateway de
`opencode-chat` (modelos gratis de Zen + el catálogo de models.dev).

```bash
bash jpcode/install.sh     # rebrandea + siembra ~/.jpcode + enlaza el binario
jpcode                     # interactivo
jpcode "explica esto"      # one-shot
```

## Qué incluye

- **Paquete propio** (`package.json`, bin `jpcode`, licencia Apache-2.0).
- **Config propia en `~/.jpcode`** (vía `QWEN_HOME`), heredando `~/.qwen` la primera vez.
- **Marca visual**:
  - Tema `jpcode` — fondo **negro** (`#000000`) con acento **azul oscuro** (`#1d4ed8` / `#1e3a8a`).
    Todo el color vive en `theme.json`: cámbialo ahí y vuelve a lanzar `sync-jpcode.mjs`.
  - Banner ASCII `JPCODE` (grande) / `JPC` (compacto), título y subtítulo propios.
  - **Título de ventana** del terminal: `jpcode - <carpeta>`.
- **Todo lo del gateway**, con la misma experiencia que OpenCode:
  - **`/connect`** (y **`/provider`**) abren *«Connect a Provider»* directamente en el catálogo
    completo —211 proveedores de models.dev— con **buscador**; `Esc` vuelve al menú de Qwen.
  - **`/model`** está **en dos niveles, como OpenCode**: primero los proveedores con cuántos
    modelos tiene cada uno (`OpenCode Zen 10 modelos`, `Google 8 modelos`) y al elegir uno, **solo
    sus modelos**; `Esc` vuelve. Los gratuitos van marcados y los modelos de pago de Zen (Sol,
    Opus…) quedan fuera salvo que tengas plan (`OPENCODE_ZEN_PLAN=1`).
  - **`/providers`** y **`/modelos`** son las listas de texto (con filtro por argumento).
  - Los **modelos gratis de Zen** venían de serie en la configuración.
- **Imágenes**: el terminal web no puede pegar (`Ctrl+V`) imágenes, así que trae un **puente**:
  pegas la captura en una página servida por el propio workstation y jpcode la adjunta sola. (Y
  siempre queda arrastrar el fichero al terminal o pegar `@imagen.png`.)
  Ver [Imágenes: el puente del navegador](#imágenes-el-puente-del-navegador).

## Cómo funciona

| Pieza | Qué hace |
| --- | --- |
| `bin/jpcode.mjs` | Prepara config/identidad y arranca por el envoltorio del gateway. |
| `sync-jpcode.mjs` | Fusiona tema y banner en `~/.jpcode/settings.json` (idempotente). |
| `patch-jpcode-brand.mjs` | Rebrandea los textos en código: título de ventana y cadenas visibles. |
| `patch-jpcode-clipboard.mjs` | Cambia el aviso de pegado de imagen por uno veraz y accionable. |
| `img-bridge.mjs` | Puente: servidor + página para pegar la imagen desde el navegador. |
| `patch-jpcode-image-watch.mjs` | Adjunta sola en el prompt la imagen que llega del puente. |
| `theme.json` | Paleta del tema `jpcode`. |
| `install.sh` | Instala, aplica los parches de comportamiento y re-aplica tras `qwen update`. |

La parte «tipo OpenCode» son los parches del gateway (en `opencode-chat/`), que `install.sh`
aplica sobre el Qwen Code instalado: `patch-qwen-providers.mjs` (catálogo completo),
`patch-qwen-auth.mjs` (buscador en el diálogo de conexión), `patch-qwen-connect.mjs`
(`/provider` como alias y abrir directo en el catálogo), `patch-qwen-search.mjs`
(buscador en `/model`), `patch-qwen-model-sections.mjs` (`/model` por proveedores, en dos
niveles) y `patch-qwen-discover.mjs` (**Custom Provider**: pegas tu Base URL y tu API key y los
modelos se detectan solos, como en OpenCode). El envoltorio del gateway refresca la lista de
`/model` en cada arranque.

El branding **no parchea binarios** salvo los textos: Qwen expone tema, banner y subtítulo por
ajustes (`ui.customThemes`, `ui.customAsciiArt`, `ui.customBannerTitle/Subtitle`).

### Imágenes: el puente del navegador

Pegar una imagen con `Ctrl+V` en el terminal **no puede funcionar** en el terminal web de VS Code /
Cloud Workstations, y el aviso de Qwen lo explicaba mal («reinstala»). Los dos motivos, comprobados:

- El terminal de VS Code Web pega **solo texto**: `TerminalInstance.paste()` llama a
  `clipboardService.readText()`, sin rama de imagen. Al pegar una imagen llega un *paste* vacío.
- Entonces el CLI mira el portapapeles del sistema y en Linux eso significa `xclip` (X11) o
  `wl-paste` (Wayland); aquí no hay ninguno, ni `DISPLAY`. El módulo nativo (`@teddyzhu/clipboard`)
  carga bien pero al usarlo responde `Failed to create clipboard context: $DISPLAY variable not set`.
  La rama del módulo nativo es solo macOS/Windows.

`patch-jpcode-clipboard.mjs` reescribe ese aviso para que diga la verdad.

Y tampoco hay canal: la imagen vive en el portapapeles de **tu navegador** y jpcode corre en el
workstation; por el PTY solo cruza texto. La única forma de leerla es **que la lea el navegador** —
y para eso no hace falta ninguna extensión, porque el proxy de puertos de Cloud Workstations publica
**cualquier** puerto como `https://<puerto>-<WEB_HOST>/` (pide la cookie de sesión que el navegador
ya tiene).

`jpcode/img-bridge.mjs` es eso: un servidor minúsculo (sin dependencias) que sirve una página y
guarda lo que recibe en `~/.jpcode/tmp/clipboard/bridge-*.png`.

```
[jpcode]                            navegador
  img-bridge.mjs ───── GET / ──────►  página: pegas la captura
       ▲                                     │
       └──────── POST /img (imagen) ─────────┘
       │
  ~/.jpcode/tmp/clipboard/bridge-*.png
       │   (patch-jpcode-image-watch.mjs mira la carpeta cada 1,2 s)
       ▼
  jpcode → «Attachments: [bridge-….png]»
```

`patch-jpcode-image-watch.mjs` mete en el prompt un vigilante que añade a los adjuntos el
`bridge-*.png` nuevo en cuanto aparece: **pegas en la página y en jpcode ya está**, sin tocar el
terminal. Los `bridge-*` que ya existían al arrancar se ignoran (no resucitan capturas viejas) y el
vigilante se apaga con `JPCODE_IMG_WATCH=0`.

`bin/jpcode.mjs` levanta el puente al arrancar —si no hay ya uno escuchando— y te dice la URL. A mano:

```bash
node jpcode/img-bridge.mjs                 # 8097; imprime la URL que hay que abrir
JPCODE_IMG_PORT=9000 node jpcode/img-bridge.mjs
```

En la página vale `Ctrl+V`, arrastrar la imagen, el botón *Leer el portapapeles* o elegir un fichero.
Y si algún día ejecutas jpcode en un terminal local (X11/Wayland con `xclip`/`wl-paste`), el `Ctrl+V`
normal funciona igual, sin puente.

También sigue el atajo de siempre: **arrastra el fichero al terminal** (o pega su ruta,
`@imagen.png`): Qwen lo reconoce por extensión y lo adjunta como imagen.

```bash
node jpcode/sync-jpcode.mjs --print      # ver qué se escribiría en settings.json
node jpcode/patch-jpcode-brand.mjs       # re-aplicar la marca tras `qwen update`
node jpcode/patch-jpcode-clipboard.mjs   # aviso de pegado de imagen veraz
node jpcode/patch-jpcode-image-watch.mjs # que jpcode adjunte lo que llega del puente
QWEN_HOME=~/.jpcode node jpcode/sync-jpcode.mjs
bash jpcode/install.sh                   # todo: marca + parches de comportamiento + binario
```

## Base legal

Se construye sobre **Qwen Code**, publicado bajo **Apache-2.0**: abierto, editable y
redistribuible. De Claude Code se toma únicamente el **estilo visual** (patrones de UI: paleta,
cajas, barra de estado), no su código ni su marca.

## Variables

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `JPCODE_HOME` | `~/.jpcode` | Directorio de configuración. |
| `OPENCODE_CHAT_DIR` | `~/studio/opencode-chat` | Gateway (proxy + claves). |
| `OPENCODE_PROXY_PORT` | `8096` | Puerto del proxy. |
| `OPENCODE_SYNC_MODELS` | `1` | `0` desactiva el refresco de `/model` al arrancar. |
| `JPCODE_IMG_BRIDGE` | `1` | `0` no levanta el puente de imágenes al arrancar. |
| `JPCODE_IMG_PORT` | `8097` | Puerto del puente de imágenes. |
| `JPCODE_IMG_WATCH` | `1` | `0` desactiva el vigilante que adjunta lo que llega del puente. |
| `QWEN_HOME` | — | Si se define, lo usa el CLI en vez de `~/.jpcode`. |

## Siguientes pasos

- Spinners y frases de "pensando" propias.
- Logo ASCII definitivo con tu diseño.
- Completar el rebranding de la UI (menús, `/help`, `/status`).
