# jpcode

Tu CLI de código, con la pinta de Claude Code, sobre **Qwen Code (Apache-2.0)** y el gateway de
`opencode-chat` (modelos gratis de Zen + el catálogo de models.dev).

## Instalación

No hace falta nada más que **Node ≥ 22**: el motor viaja dentro del paquete, así que no hay que
instalar Qwen Code aparte.

```bash
npm install -g @juanpiecedev/jpcode
jpcode
```

Y desde el código, si prefieres tenerlo a mano para tocar cosas:

```bash
git clone https://github.com/SoyJuanPiece/jpcode-cli.git
cd jpcode-cli
bash install.sh            # motor + piezas nativas + config + tema + binario
jpcode                     # interactivo
jpcode "explica esto"      # one-shot
```

Ojo con la expectativa: **minificar no es proteger**. El paquete de npm va minificado, pero el
código tiene que ejecutarse en la máquina de quien instala, así que viaja entero dentro; un
`strings` lo devuelve a la superficie. Quita los comentarios y los nombres, y ya. Como cortina
vale; como caja fuerte, no.

### Publicar una versión

```bash
npm login          # una vez
bash publish-npm.sh
```

`build-dist.sh` minifica y corre las **227 aserciones** sobre el resultado antes de que se suba
nada: si la minificación rompe algo, no se publica.

En CI lo hace `.github/workflows/publish-npm.yml` por OIDC, sin tokens ni secretos. La primera
publicación de un paquete nuevo tiene que ser a mano: el Trusted Publisher se configura sobre un
paquete que ya existe.

**Clónalo siempre en una carpeta permanente.** `install.sh` enlaza el binario a la carpeta desde la
que se ejecuta: si lo lanzas en `/tmp`, tu `jpcode` apunta a `/tmp` y se rompe cuando se vacíe.

### Si en Windows te da `EBUSY` al instalar o actualizar

```
npm error code EBUSY
npm error syscall rename
npm error path C:\Users\...\AppData\Roaming\npm\node_modules\@juanpiecedev\jpcode\gateway
```

No es un fallo de Windows ni del paquete: **Windows no deja renombrar una carpeta que está en
uso**, y npm renombra la suya en cada instalación. Lo normal es que tengas jpcode (o su gateway)
todavía vivo en segundo plano, o el Explorer/el antivirus mirando ahí dentro. En un PowerShell
nuevo:

```powershell
Stop-Process -Name node,jpcode -Force -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:APPDATA\npm\node_modules\@juanpiecedev" -ErrorAction SilentlyContinue
npm i -g @juanpiecedev/jpcode
```

`npm uninstall -g` **no** mata el proceso, así que no sirve de atajo: da el mismo error. Y
`npm update -g` tampoco, porque por dentro hace exactamente el mismo rename.

Desde la **0.1.5** el gateway ya no se arranca con el directorio de trabajo dentro del paquete
(`cwd: ~/.jpcode` + `OPENCODE_CHAT_DIR`), así que esto no vuelve a pasar. Si venías de una versión
anterior, hay que matar el proceso viejo **una sola vez**.

### Si el chat se llena de errores de herramientas

Dos cosas distintas, y ninguna es «la interfaz»:

- **`[tool_call bridge refused] params must have required property 'arguments'`** y
  `ToolSearch {"pattern":…}` en bucle. De fábrica el motor esconde casi todas las herramientas
  detrás de dos: `ToolSearch` para descubrirlas y `tool_call` para invocarlas. Un modelo que se
  pierde con ese esquema se lía con el puente y el chat se llena de rechazos. jpcode sube
  `tools.toolSearch.threshold` al **20 % de la ventana de contexto**, y con eso el motor declara
  todas las herramientas de entrada: el modelo las llama por su nombre y el puente no se usa.
  Comprobado en una sesión real: el modelo llama a `read_file` directo y `tool_search` /
  `tool_call` no aparecen ni una vez en el registro de la sesión.
  - **`EPERM: operation not permitted, mkdir 'C:\Users\.qwen'`** (en Linux, `EACCES`). El motor
    guarda estado de proyecto en `<carpeta actual>/.qwen` — ajustes de workspace, *welcome-back*,
    temporales. Si abres jpcode donde no puedes escribir (`C:\Users`, la raíz de un disco, `/`), esa
    `mkdir` falla y el error sale dentro de una respuesta del chat. Ábrelo **dentro de la carpeta del
    proyecto**.

### Si la terminal parpadea cuando el modelo está pensando

**jpcode lo arregla por config: `ui.useTerminalBuffer` va a `false`** (lo pone `sync-jpcode.mjs` en
cada arranque, y se respeta si ya lo has elegido a mano).

El motor trae dos formas de pintar el historial, y la diferencia es justo el parpadeo:

- **Con `useTerminalBuffer: true`** (lo que trae el motor de fábrica) la conversación se pinta
  **dentro de la app**, en la pantalla alternativa, y entra en el cuadro que se repinta. El spinner
  y el contador de tokens cambian unas **12 veces por segundo**, y el cuadro **crece con la
  conversación**: al principio son 8 líneas, al final son 40. El coste del repintado crece conforme
  bajas el chat, y en un terminal lento —la consola clásica de Windows, la que abre
  `powershell.exe`, va bastante por detrás de Windows Terminal— eso se ve como la pantalla
  quedándose en negro y volviéndose a pintar.
- **Con `useTerminalBuffer: false`** el motor envuelve el historial en `<Static>`: se escribe
  **una vez** en el scrollback del terminal y no se vuelve a pintar nunca. Cada cuadro repinta solo
  la zona viva —pie, spinner, indicador de trabajo—, así que el coste **deja de crecer al bajar**.
  Y no hace falta pantalla alternativa ni secuencias de scroll: es el modo que entiende cualquier
  terminal.

Lo que se pierde: el scrollback interno y la selección con ratón pasan a ser los del terminal. Es un
intercambio consciente — se cambia cómo se navega el historial por cómo se ve la sesión—, y va en la
dirección de que **la misma jpcode se comporte igual en cualquier terminal**, en vez de degradarse
según cuál.

Aun así el renderizador en sí sigue siendo el **estándar** de ink, que no diffing: en cada cuadro
borra todas las líneas del anterior y las reescribe enteras. Ahora bien, con el historial fuera del
cuadro ese repintado es de unas pocas líneas y no se nota; donde el pintado va por red —el terminal
web de VS Code, Cloud Workstations— es donde todavía puede notarse.

Hay un segundo renderizador en el motor que **sí** compara línea a línea y solo reescribe lo que
cambia, así que escribiría 7-10 veces menos. Se puede encender con `JPCODE_INCREMENTAL_RENDER=1`,
pero es **experimental y no se recomienda**: cuando el chat crece más que la ventana, escribir el
cuadro desplaza la pantalla y las filas físicas dejan de coincidir con lo que el motor cree que
tiene pintado. Como solo reescribe las líneas que cambian, **el error no se cura solo**: sale una
fila duplicada de la de arriba, una línea de estado vieja que nunca se borra (`◐ Thinking…` y
`◓ Pondering…` a la vez) o líneas cortadas a medias.

Comprobado con un emulador de terminal que reconstruye la pantalla cuadro a cuadro (100×30, cuatro
mensajes largos seguidos para que el chat crezca), contando filas enfermas de verdad:

| variante | cuadros | cuadros con filas enfermas | racha más larga | último cuadro |
| --- | --- | --- | --- | --- |
| **estándar (por defecto)** | 1 798 | **0** | **0** | limpio |
| incremental, sin guarda | 1 659 | **706** (43 %) | 294 | **roto** |
| incremental, con la guarda del parche | 1 545 / 1 788 | 0 / 118 | 0 / 40 | limpio |

`patch-jpcode-render.mjs` deja el incremental **apagado salvo que lo pidas** (`==="1"`, no
`!=="0"`) y le añade una guarda para que el modo experimental se rompa lo menos posible: si el
cuadro no cabe en la pantalla, o si el contenido se ha desplazado respecto al cuadro anterior, ese
cuadro no se diffea sino que se borra y se reescribe entero. Con la guarda el desastre es unas seis
veces menor y sale limpio en algunas sesiones, pero **no en todas**: por eso sigue apagado por
defecto.

### Si el modo auto dice que no está disponible

```
Auto Mode couldn't classify this action (Classifier stage 1 unavailable).
Review it manually. Switching to Default Mode is recommended if you want to
continue without the classifier.
```

No es un fallo del modo ni de tu configuración: **es el gateway**. El modo auto no pregunta «¿me
das permiso?» — le pide a un modelo que **clasifique** cada acción, y para eso el motor llama a
`generateJson`, que no pide JSON en texto sino una **llamada a función forzada** (`respond_in_schema`
con `tool_choice: "required"`). El tier gratis de Zen no emite tool calls: es la receta que hace
pasar el gate (las 11 tools oficiales tienen que estar en el cuerpo, y si se describen como
llamables los modelos las llaman y contestan con texto vacío). Comprobado contra el upstream real:
con `tool_choice: "required"` el modelo devuelve `content: ""` o frases en prosa; con
`tool_choice: "none"` devuelve `{ "shouldBlock": false }` limpio.

`gateway/forced-tools.mjs` traduce una en la otra: al modelo se le pide el JSON (con el esquema
delante, `tool_choice: "none"` y las tools de relleno intactas, que el gate necesita) y de vuelta se
fabrica el `tool_calls` que el cliente esperaba, aunque el JSON venga en valla de markdown o con
prosa alrededor. Verificado contra `big-pickle`, `mimo-v2.6-flash-free` y `deepseek-v4.1-flash-free`
con la petición real del clasificador: antes `tool_calls: null`; después, la llamada con
`{"shouldBlock":false}` para una acción segura y `{"shouldBlock":true}` para una peligrosa.

Lo mismo arregla todo lo demás que va por `generateJson` (modelo rápido, compactación, advisor).
Solo toca peticiones **sin streaming**, que es lo único que el motor usa para pedir JSON; las demás
salen byte a byte como antes.


## Qué incluye

- **Paquete propio** (`package.json`, bin `jpcode`, licencia Apache-2.0).
- **Config propia en `~/.jpcode`** (vía `QWEN_HOME`), heredando `~/.qwen` la primera vez.
- **Marca visual**:
  - Tema `jpcode` — fondo **negro** (`#000000`) con la paleta oscura de Claude Code: acento
    **naranja Claude** (`#d77757`), grises `#888888` / `#505050`, degradado de banner
    `#d77757 → #eb9f7f`. Todo el color vive en `theme.json`: cámbialo ahí y vuelve a lanzar
    `sync-jpcode.mjs`.

    El motor nombra sus colores de otra forma, así que las claves de `theme.json` se traducen
    (`createCustomTheme` en `engine/chunks/chunk-UOLLXC6M.js`):

    | clave en `theme.json` | dónde se ve |
    | --- | --- |
    | `AccentPurple` | texto de acento — **aquí va el naranja** |
    | `AccentCyan` | color de acento de la paleta heredada (el spinner usa `AccentPurple`) |
    | `Gray` | texto secundario, **borde del prompt** y símbolos (`ui.symbol`) |
    | `AccentBlue` | enlaces y borde enfocado |
    | `LightBlue` | código en línea |
    | `GradientColors` | degradado del banner |
    | `DiffAdded` / `DiffRemoved` | fondo de líneas en los diffs |

    `DiffModified` está en la documentación del motor pero **no lo lee**: se deja por si una
    versión futura lo usa. Y ojo con una trampa: en un tema `custom` el motor saca los símbolos
    (`ui.symbol`) de `Gray`, no de `AccentCyan` — el nombre engaña.
  - Banner ASCII `JPCODE` (grande) / `JPC` (compacto), título propio y **sin subtítulo**: jpcode
    se presenta como lo que es, no como derivado de otro CLI. La atribución del motor
    (Apache-2.0) vive donde toca, en `engine/LICENSE` y `engine/NOTICE-jpcode.md`.
  - **Indicador de trabajo** propio: el spinner se dibuja en el color de acento (antes blanco) y
    las frases son del mismo tono seco que las de Claude Code — *Thinking…, Pondering…, Musing…,
    Synthesizing…, Determining…, Percolating…* — en lugar de los chistes del motor
    (*Reticulating splines…*, *Warming up the AI hamsters…*), que rotaban cada 15 s y hacían que
    la línea pareciera rota. Las frases se cambian en `sync-jpcode.mjs` (`FRASES_TRABAJO`).
    Y los frames del spinner son **◐ ◓ ◑ ◒** (U+25D0…U+25D3) en lugar del braille del motor:
    el rango *Braille Patterns* no está en **Cascadia Mono** ni en **Consolas**, las fuentes por
    defecto de Windows Terminal, y ahí en lugar del spinner se veía un cuadro con un
    interrogante. Los elegidos salen del bloque *Geometric Shapes*, el mismo del ◆/●/○ que la
    interfaz ya dibuja bien en esas fuentes.

    Queda un caso aparte: la **consola clásica de Windows** (conhost, la que abre
    `powershell.exe`), que no tiene ni braile ni formas geométricas y donde hasta el ◐ sale en
    cuadro. Cuando jpcode detecta Windows **sin** Windows Terminal (`WT_SESSION`) ni el terminal
    de VS Code (`TERM_PROGRAM`), degrada solo ahí a frames **ASCII puros** — `| / -` — que
    dibuja cualquier fuente. En Windows Terminal y en el terminal de VS Code se conservan los
    geométricos.
  - **Historial al scrollback del terminal** (`ui.useTerminalBuffer: false`). El motor lo pinta por
    defecto dentro de la app, en la pantalla alternativa, y eso mete toda la conversación en el
    cuadro que se repinta: como el spinner gira ~12 veces por segundo, el parpadeo **crece conforme
    bajas el chat**, y duele más en la consola clásica de Windows que en Windows Terminal. Con la
    clave a `false` el historial se escribe una vez (va en `<Static>`) y solo se repinta la zona
    viva, así que el coste deja de crecer al bajar — y sin pantalla alternativa ni secuencias de
    scroll, que es lo que lo hace portable a cualquier terminal. Pierdes el scrollback interno y
    la selección de ratón, que pasan a ser los del terminal. A diferencia del resto de claves de
    este bloque, **se respeta si ya la has elegido**: poner `true` a mano en
    `~/.jpcode/settings.json` la deja como está. Ver
    [Si la terminal parpadea](#si-la-terminal-parpadea-cuando-el-modelo-está-pensando).
  - **Auto-update del motor apagado** (`general.enableAutoUpdate: false`). El motor traía el suyo
    encendido y creía ser `@qwen-code/qwen-code@0.24.7`: leía `engine/package.json` y, al ver una
    versión nueva en npm, podía lanzar en segundo plano un `npm i -g` de **otro** paquete. jpcode
    se actualiza a mano:

    ```bash
    npm i -g @juanpiecedev/jpcode@latest
    ```

    Ese `npm i -g` a mano es también el que hace el *rename* de la carpeta del paquete; con el
    arreglo de la 0.1.5 (el gateway ya no corre con el `cwd` dentro del paquete) no da `EBUSY`
    aunque tengas jpcode abierto. Aun así, lo limpio en Windows es cerrar jpcode antes.
  - **Título de ventana** del terminal: `jpcode - <carpeta>`.
  - **La versión que se anuncia es la de jpcode**: la cabecera, `/about`, `/bug`, el item
    `qwen-version` de la línea de estado y `jpcode --version` dicen `0.2.0`, no la del motor.
    Antes el motor la traía escrita en su código (`0.24.7`, la suya) y no había forma de
    cambiarla por config —`customBannerTitle` siempre le pega el sufijo de versión—, así que
    era un parche: `bin/jpcode.mjs` exporta `JPCODE_CLI_VERSION` al motor y su
    `getCliVersion()` la usa si está. Sin la variable sigue la del motor. La del motor se
    conserva en `engine/package.json` (y sale en el parche del aviso de licencia), por si hay
    que reportar un bug contra él.
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
| `sync-jpcode.mjs` | Fusiona tema, banner y `ui.useTerminalBuffer: false` en `~/.jpcode/settings.json` (idempotente). |
| `patch-jpcode-brand.mjs` | Rebrandea el motor: título de ventana, cadenas visibles y color del spinner. |
| `patch-jpcode-clipboard.mjs` | Cambia el aviso de pegado de imagen por uno veraz y accionable. |
| `img-bridge.mjs` | Puente: servidor + página para pegar la imagen desde el navegador. |
| `patch-jpcode-image-watch.mjs` | Adjunta sola en el prompt la imagen que llega del puente. |
| `patch-jpcode-render.mjs` | Render de ink: deja el incremental **apagado por defecto** (rompe el desplazamiento del chat) y le pone una guarda por si lo activas con `JPCODE_INCREMENTAL_RENDER=1`. |
| `theme.json` | Paleta del tema `jpcode`. |
| `install.sh` | Instalación desde el código: trae el motor, piezas nativas, config, tema y binario. |
| `gateway/` | El gateway (proxy + catálogo + envoltorio `qwen`), sin dependencias. |
| `sync-gateway.sh` | Refresca `gateway/` desde tu copia de trabajo de opencode-chat. |
| `vendor-engine.sh` | Trae el motor a `engine/` y le aplica los 10 parches de jpcode en la construcción. |
| `build-dist.sh` | Minifica y prueba el paquete (227 aserciones). Es el gate antes de publicar. |
| `publish-npm.sh` | Publica en npm lo que dejó `build-dist.sh`, con npm o con `--bun`. |

La parte «tipo OpenCode» son los parches que `vendor-engine.sh` aplica al motor al traerlo:
`patch-jpcode-providers.mjs` (catálogo completo de models.dev),
`patch-jpcode-auth.mjs` (buscador en el diálogo de conexión), `patch-jpcode-connect.mjs`
(`/provider` como alias y abrir directo en el catálogo), `patch-jpcode-search.mjs`
(buscador en `/model`), `patch-jpcode-model-sections.mjs` (`/model` por proveedores, en dos
niveles) y `patch-jpcode-discover.mjs` (**Custom Provider**: pegas tu Base URL y tu API key y los
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

El branding **no parchea binarios**: Qwen expone tema, banner y frases por ajustes
(`ui.customThemes`, `ui.customAsciiArt`, `ui.customBannerTitle`, `ui.customWittyPhrases`) y lo que
escribe en código se reescribe al vendorizar el motor (`patch-jpcode-brand.mjs`).

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
node gateway/test.mjs                     # pruebas del gateway (227 aserciones)
QWEN_HOME=~/.jpcode node sync-jpcode.mjs
bash build-dist.sh                        # minifica y prueba (no publica)
bash publish-npm.sh                       # y esto lo sube a npm
```

## Tarea abierta: 0.2.0 está commiteada y subida, pero NO publicada en npm

> Esto es un informe para quien venga a terminar el trabajo (humano o IA). Está aquí
> porque el bloqueo es concreto y ya está diiagnosticado; no hace falta volver a
> investigarlo desde cero.

### Qué pasa

`bash publish-npm.sh` construye, minifica y corre la suite completa del paquete **antes** de
subir nada. La suite falla y el guard corta, que es lo que debe hacer:

```
✗ las pruebas fallan en el paquete minificado — NO se publica
  ❌ solo se enseña el proveedor conectado — google, groq
  ❌ con ?all=1 salen todos pero `usables` dice la verdad — data=5 usables=2
  ❌ tras conectar anthropic ya se enseña — anthropic, google, groq
  ❌ desactivado deja de aparecer aunque tenga clave
  ❌ y se vuelve a activar
  ❌ y NO los de los que no lo están
  ❌ Google: autentica con x-goog-api-key
❌ 7 comprobación(es) fallida(s)
```

7 de 226. Todas del bloque **«catálogo de proveedores y estado»** de `gateway/test.mjs`. Las
otras 219 pasan, incluidas las de Anthropic, Google, enrutado a cada proveedor, streaming, tokens
y `sync-qwen-models`.

### Causa raíz: las pruebas no son herméticas

**No es un bug del gateway. Es una fuga de claves reales del entorno de quien las corre.**

`gateway/providers.mjs:249` — `credencial()` lee el **`process.env` del proceso**, no el entorno
que el test le pasa al servidor:

```js
export function credencial(id, prov, cfg) {
  for (const nombre of prov?.env || []) {
    const v = process.env[nombre];          // ← ambient, no el del test
    if (v) return { key: v, source: `env:${nombre}` };
  }
  if (cfg?.auth?.[id] …) return …;           // auth.json va DESPUÉS
```

El test (`gateway/test.mjs:874-902`) levanta el servidor con un catálogo de 5 proveedores de
prueba y un `PROVIDERS_FILE`/`PROVIDERS_AUTH_FILE` nuevos en un temporal, y espera que
`credencial()` solo vea las claves que él pasa:

```js
startServer(zen2.port, 8098, true, {
  MODELS_CACHE_FILE: cacheFile,
  PROVIDERS_FILE:     join(dir, "providers.json"),
  PROVIDERS_AUTH_FILE: join(dir, "auth.json"),
  GROQ_API_KEY: "gsk_de_prueba",
  SIN_API_KEY:  "x",
});
```

El catálogo de prueba declara `google` con `env: ["GOOGLE_API_KEY"]`. Si esa variable está puesta
en la shell de quien corre las pruebas, `credencial()` la encuentra **antes** que `auth.json`, y
`google` pasa a estar «conectado» para todo el bloque. De ahí los 7 fallos, uno a uno:

| Comprobación | Espera | Obtiene | Por qué |
| --- | --- | --- | --- |
| `solo se enseña el proveedor conectado` (`test.mjs:910`) | `["groq"]` | `google, groq` | google cuenta como conectado |
| `?all=1 … usables dice la verdad` (`test.mjs:913`) | `usables === 1` | `usables === 2` | idem, suma google |
| `tras conectar anthropic ya se enseña` (`test.mjs:931`) | 2 proveedores | 3 | idem |
| `desactivado deja de aparecer` (`test.mjs:935`) | 1 | 2 | idem |
| `y se vuelve a activar` (`test.mjs:937`) | 2 | 3 | idem |
| `y NO los de los que no lo están` (`test.mjs:943`) | que `google/gemini-2.5-flash` **no** esté | sí está | sus modelos ya se listan |
| `Google: autentica con x-goog-api-key` (`test.mjs:977`) | `"goog-de-prueba"` | la clave real de la shell | el test la guarda por `POST /v1/providers/google/key`, pero `credencial()` prefiere `process.env` |

`sinapi` **no** falla y no debe tocarse: el fixture no le da `api`, así que `usable` sale falso
por `Boolean(urlBase)` (`providers.mjs:294`). Eso es correcto y es justo lo que el test comprueba.

### Cómo reproducirlo (30 segundos)

Con la variable puesta en la shell, el bloque falla:

```bash
cd gateway && node test.mjs 2>&1 | grep -E "❌|comprobación"
```

Sin ella, **la suite entera pasa**:

```bash
cd gateway && env -u GOOGLE_API_KEY node test.mjs | tail -1
# ✅ todo bien
```

Eso lo comprobó, y es la prueba de que la causa es el entorno y no el gateway. También:

```bash
env | grep GOOGLE_API_KEY    # si esto imprime algo, el bloque falla
```

Por eso esto sale en unas máquinas y en otras no, y por eso **no se debe «arreglar» el gateway**:
el gateway hace bien lo que hace.

### Arreglo recomendado

Que el test no dependa de la shell de quien lo corre. Dos vías, en este orden de preferencia:

1. **Aislar el entorno en el test** (lo menos invasivo). En `gateway/test.mjs`, antes de
   `startServer`, guardar y limpiar las variables de proveedor que el catálogo de prueba declara, y
   restaurarlas en el `finally` que ya hay. Lo que hay que cubrir es, como mínimo,
   `GOOGLE_API_KEY`, `GROQ_API_KEY`, `SIN_API_KEY`, `ANTHROPIC_API_KEY` y `AWS_ACCESS_KEY_ID`
   (esta última la mira `amazon-bedrock`, que también sale en el catálogo de prueba).
2. **Que `credencial()` no lea el entorno ambient** — por ejemplo que `startServer` inyecte las
   variables que recibe en un objeto y que `credencial()` lo consulte primero. Es el arreglo de
   raíz, pero toca el runtime del gateway y es un cambio de más alcance: **no lo hagas sin
   motivo**.

Lo que **no** hay que hacer es tocar las aserciones para que esperen `google`: el test tiene razón,
el entorno es que miente.

### Publicar, una vez en verde

```bash
bash publish-npm.sh --dry-run     # construye y prueba, sin subir nada
bash publish-npm.sh               # construye, prueba y publica
```

Hace falta `npm login` con la cuenta del paquete (`juanpiecedev`). La 0.2.0 está libre y el
árbol ya está limpio y subido a `main`, así que no hay nada más que commitear.

### Qué lleva la 0.2.0 (no lo toques al publicar)

- `ui.useTerminalBuffer: false` — el historial va al scrollback del terminal en vez de entrar en el
  cuadro que se repinta, que es lo que hacía crecer el parpadeo al bajar. Sale en `sync-jpcode.mjs`
  y se respeta si el usuario ya lo había elegido.
- La versión que se anuncia es la de jpcode (`JPCODE_CLI_VERSION`), no la del motor.

Un par de comprobaciones rápidas para confirmar que la 0.2.0 es la que quieres subir:

```bash
npm view @juanpiecedev/jpcode versions --json | tail -3   # 0.2.0 no debe aparecer todavía
node -p "require('./package.json').version"                # debe decir 0.2.0
```

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

- Logo ASCII definitivo con tu diseño.
- Completar el rebranding de la UI (menús, `/help`, `/status`).

## ⚠️ Reglas críticas para Asistentes de IA y Desarrolladores

Si eres una IA o un desarrollador modificando este repositorio, **debes seguir estrictamente estas reglas** para evitar romper funcionalidades existentes:

1. **Parches del motor (`patch-jpcode-*.mjs`)**:
   - **Cuidado con las constantes en bucles**: Al modificar bucles de streaming (como `for await (const rawChunk of stream)`), NUNCA intentes reasignar variables declaradas como `const`. Usa una nueva constante local (`const chunk = ...`).
   - **Idempotencia y sintaxis**: Todos los scripts de parche sobre `engine/chunks/` deben ser idempotentes y pasar la comprobación de sintaxis `node --check <chunk>`.
   - **Registro de parches**: Todo parche nuevo debe añadirse al bucle de parches en `vendor-engine.sh`, `build-dist.sh` y al arreglo `"files"` de `package.json`.

2. **Parser de herramientas MiniMax / OpenCode Zen (`patch-jpcode-minimax-plan.mjs` y `gateway/server.mjs`)**:
   - **Soporte multiformato de XML**: Los modelos gratuitos de Zen/MiniMax emiten llamadas a herramientas incrustadas en texto XML (`<tool_call>`, `<invoke>`, etc.) y caracteres invisibles de ancho cero (`\u200B`).
   - **No remover la limpieza de texto**: Mantén siempre la función de extracción y limpieza (`extraerToolCallsDeTexto`) para evitar que basura de protocolo como `]<]minimax>[` o XML crudo se impriman en la pantalla del usuario.

3. **Modo Plan y Flujo de Interacción**:
   - El `modo plan` opera paso a paso de forma deliberada para permitir inspección segura del espacio de trabajo. No alteres los controles de renderizado (`useTerminalBuffer`) ni modifiques la pausa entre turnos que espera interacción del usuario.

4. **Hermetismo en Pruebas y Publicación**:
   - Antes de publicar una versión, ejecuta `bash build-dist.sh` o `bash publish-npm.sh --dry-run` para verificar que las 227+ aserciones de prueba pasen correctamente.

