# jpcode

Tu CLI de código, con la pinta de Claude Code, sobre **Qwen Code (Apache-2.0)** y el gateway de
`opencode-chat` (modelos gratis de Zen + el catálogo de models.dev).

## Instalación

No hace falta nada más que **Node ≥ 22**: el motor viaja dentro del paquete, así que no hay que
instalar Qwen Code aparte.

Con **Homebrew** (macOS y Linux):

```bash
brew install SoyJuanPiece/tap/jpcode
```

La fórmula vive en [SoyJuanPiece/homebrew-tap](https://github.com/SoyJuanPiece/homebrew-tap) y
instala el paquete entero desde la release. Para actualizarla en cada release:

```bash
bash update-tap.sh
```

O de una línea, sin Homebrew. Baja el paquete de la última release, comprueba su SHA256, lo deja
en `~/.jpcode/src` (permanente, nunca `/tmp`) y lanza el `install.sh` de dentro:

```bash
curl -fsSL https://github.com/SoyJuanPiece/jpcode-dist/releases/latest/download/get.sh | bash
```

`jpcode-dist` es un repo **público que solo tiene artefactos**: el código fuente vive aquí, en
privado. Lo llena `build-dist.sh`, que minifica el paquete, le pasa el **juego completo de pruebas
(209 aserciones)** y solo entonces lo publica.

Ojo con la expectativa: **minificar no es proteger**. El código tiene que ejecutarse en la máquina
de quien instala, así que viaja entero dentro del paquete; un `strings` lo devuelve a la superficie.
Quita los comentarios y los nombres, y ya. Como cortina vale; como caja fuerte, no.

Para clavar una versión o cambiar dónde se instala (expórtalas: `VAR=x cmd1 | cmd2` solo se las pasa
a `cmd1`, y `get.sh` se ejecuta en el otro lado del tubo):

```bash
export JPCODE_VERSION=v0.1.1 JPCODE_SRC=~/jpcode
curl -fsSL https://github.com/SoyJuanPiece/jpcode-dist/releases/latest/download/get.sh | bash
```

Y si algún día quieres el paquete del repo privado, con la misma `get.sh`:

```bash
JPCODE_REPO=SoyJuanPiece/jpcode-cli gh release download \
  -R SoyJuanPiece/jpcode-cli -p get.sh -O - | bash
```

Y desde el código, si prefieres tenerlo a mano para tocar cosas:

```bash
git clone https://github.com/SoyJuanPiece/jpcode-cli.git
cd jpcode-cli
bash install.sh            # gateway + config + marca + parches + binario
jpcode                     # interactivo
jpcode "explica esto"      # one-shot
```

Solo necesita **Node ≥ 22**. El motor y el gateway viajan dentro del paquete, así que no hay
dependencias que instalar.

**Clónalo siempre en una carpeta permanente.** `install.sh` enlaza el binario a la carpeta desde la
que se ejecuta: si lo lanzas en `/tmp`, tu `jpcode` apunta a `/tmp` y se rompe cuando se vacíe.

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
| `gateway/` | El gateway (proxy + catálogo + envoltorio `qwen`), sin dependencias. |
| `sync-gateway.sh` | Refresca `gateway/` desde tu copia de trabajo de opencode-chat. |
| `get.sh` | Instalador remoto: baja la release y lanza `install.sh`. |
| `release.sh` | Publica la release del repo privado (tarball + `get.sh` + `SHA256SUMS`). |
| `build-dist.sh` | Minifica, prueba y publica los artefactos en el repo público. |

La parte «tipo OpenCode» son los parches que `install.sh` aplica sobre el Qwen Code instalado:
`patch-qwen-providers.mjs` (catálogo completo de models.dev),
`patch-qwen-auth.mjs` (buscador en el diálogo de conexión), `patch-qwen-connect.mjs`
(`/provider` como alias y abrir directo en el catálogo), `patch-qwen-search.mjs`
(buscador en `/model`), `patch-qwen-model-sections.mjs` (`/model` por proveedores, en dos
niveles) y `patch-qwen-discover.mjs` (**Custom Provider**: pegas tu Base URL y tu API key y los
modelos se detectan solos, como en OpenCode). El envoltorio del gateway refresca la lista de
`/model` en cada arranque.

### El gateway y `gateway/`

`jpcode` no habla con los proveedores directamente: arranca por el envoltorio `qwen` del gateway,
que levanta el proxy en el puerto 8096, le inyecta la clave y refresca la lista de modelos. Por eso
`bin/jpcode.mjs` no puede funcionar sin él, y por eso **viaja dentro del repo, en `gateway/`**:
un clon limpio se instala y arranca sin rutas de nadie.

`install.sh` y `bin/jpcode.mjs` resuelven la carpeta en este orden:

1. `$OPENCODE_CHAT_DIR`, si lo defines — para trabajar contra **tu** copia de opencode-chat.
2. `~/studio/opencode-chat`, si existe: **tu copia de trabajo manda**. Es la que usa el proxy
   que ya esté corriendo y, junto a ella, vive el `.api-key` que el envoltorio exporta.
3. `gateway/` del repo — el caso de un clon limpio, donde (2) no existe.

`gateway/` es una **copia publicada**, no la fuente: desarrollas en tu copia de trabajo y publicas
con `bash sync-gateway.sh`, que la refresca sin arrastrar secretos (`.api-key`, `.zen-key`), la
caché del catálogo (`.cache/`, 9 MB) ni el binario de `cloudflared` (`.bin/`, 39 MB).

La clave del proxy (`.api-key`) **se autogenera** la primera vez que arranca el gateway, con
permisos `600`: no hay nada que configurar ni que compartir.

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
bash install.sh                           # todo: gateway + config + marca + parches + binario
bash sync-gateway.sh                      # refrescar gateway/ desde tu copia de trabajo
node sync-jpcode.mjs --print              # ver qué se escribiría en settings.json
node patch-jpcode-brand.mjs               # re-aplicar la marca tras `qwen update`
node patch-jpcode-clipboard.mjs           # aviso de pegado de imagen veraz
node patch-jpcode-image-watch.mjs         # que jpcode adjunte lo que llega del puente
node gateway/test.mjs                     # pruebas del gateway (209 aserciones)
QWEN_HOME=~/.jpcode node sync-jpcode.mjs
bash build-dist.sh                        # minifica, prueba y publica la release
bash update-tap.sh                        # apunta la fórmula de Homebrew a esa release
```

`release.sh` queda **deprecado**: construía el tarball con `git archive`, que no incluye `engine/`
(está ignorado por git), y publicó una `v0.1.0` sin motor. Ahora solo delega en `build-dist.sh`.

## Base legal

Se construye sobre **Qwen Code**, publicado bajo **Apache-2.0**: abierto, editable y
redistribuible. De Claude Code se toma únicamente el **estilo visual** (patrones de UI: paleta,
cajas, barra de estado), no su código ni su marca.

## Variables

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `JPCODE_HOME` | `~/.jpcode` | Directorio de configuración. |
| `OPENCODE_CHAT_DIR` | `gateway/` del repo | Gateway (proxy + claves). Úsalo para tu propia copia. |
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
