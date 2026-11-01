# Windows: `EBUSY` al instalar o actualizar jpcode

Hoja de trabajo para copiar y pegar desde el editor. Todo lo de aquí es de una instalación real
bloqueada el 2026-10-01 (PowerShell 7.6.6, `@juanpiecedev/jpcode@0.1.4`).

---

## 1. El error

```
npm error code EBUSY
npm error syscall rename
npm error path C:\Users\Usuario\AppData\Roaming\npm\node_modules\@juanpiecedev\jpcode\gateway
npm error dest C:\Users\Usuario\AppData\Roaming\npm\node_modules\@juanpiecedev\.jpcode-gnBHCMpY\gateway
npm error errno -4082
npm error EBUSY: resource busy or locked, rename '...\jpcode\gateway' -> '...\.jpcode-gnBHCMpY\gateway'
```

**No es un fallo de Windows, ni de npm, ni del paquete.** Es una **carpeta en uso**.

---

## 2. Qué está haciendo npm exactamente (leído en su código)

El nombre `.jpcode-gnBHCMpY` es **idéntico en cada intento** porque no es aleatorio: es un hash
**determinista** de la ruta.

```js
// npm/node_modules/@npmcli/arborist/lib/retire-path.js
const pathSafeHash = s =>
  crypto.createHash('sha1').update(s).digest('base64').replace(/[^a-zA-Z0-9]+/g, '').slice(0, 8)

const retirePath = from => resolve(dirname(from), `.${basename(from)}-${pathSafeHash(from)}`)
```

Y el `EBUSY` sale de aquí:

```js
// npm/node_modules/@npmcli/fs/lib/move-file.js
try { await fs.rename(source, destination) }
catch (error) {
  if (error.code === 'EXDEV' || error.code === 'EPERM') {
    // npm mueve la carpeta entrada por entrada…
    for (const file of await fs.readdir(source))
      moveFile(join(source, file), join(destination, file), ...)
  } else {
    throw error          // ← EBUSY NO se maneja: se propaga tal cual
  }
}
```

Secuencia real:

1. npm intenta renombrar `...\@juanpiecedev\jpcode` → `...\.jpcode-gnBHCMpY` (para retirar la
   versión vieja antes de poner la nueva).
2. El rename falla con `EPERM` (en Windows, "algo la tiene abierta" suele salir como `EPERM`).
3. npm cae al plan B: mover **entrada por entrada**. Mueve unas cuantas.
4. Al llegar a `gateway`, esa carpeta sí está bloqueada de verdad → `EBUSY` → **aborta**.

Consecuencia importante: **la carpeta queda a medio mover**. `...\jpcode` se queda sin algunas
entradas y `...\.jpcode-gnBHCMpY` se queda con las demás. Por eso reintentar `npm i` no arregla
nada: vuelve a chocar con las ruinas del intento anterior, y cada intento mueve unas cuantas
entradas más.

### Por qué precisamente `gateway`

En la **0.1.4** el gateway se arrancaba así:

```js
spawn(process.execPath, [server], { detached: true, cwd: GATEWAY, ... }).unref()
//                                                  ^^^^^^^^^^^ dentro del paquete
```

`detached` + `unref()` significa que **sobrevive a jpcode**, y su directorio de trabajo se queda
dentro del paquete. En Windows, una carpeta que es el `cwd` de un proceso vivo **no se puede
renombrar ni borrar**. Ese era el candado.

Esto lo arregla la **0.1.5**: el gateway arranca con `cwd` en `~/.jpcode` y recibe su casa por
`OPENCODE_CHAT_DIR`. A partir de ahí el paquete nunca vuelve a quedar en uso.

---

## 3. Limpieza y reinstalación

PowerShell **como Administrador** (ayuda si el que sujeta es Defender o un servicio).
**No lances `npm i` hasta el final.**

```powershell
# 1) Ver quién está vivo
Get-Process node,jpcode,esbuild,rg -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Path

# 2) Matarlos
Stop-Process -Name node,jpcode,esbuild,rg -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# 3) Estado actual: aquí se ven las ruinas del medio-movido
Get-ChildItem "$env:APPDATA\npm\node_modules\@juanpiecedev" -Force | Select-Object Name,LastWriteTime

# 4) Borrar AMBOS: el paquete roto y el .jpcode-XXXX del retiro
Remove-Item -Recurse -Force "$env:APPDATA\npm\node_modules\@juanpiecedev" -ErrorAction Continue

# 5) Comprobar. TIENE que dar False
Test-Path "$env:APPDATA\npm\node_modules\@juanpiecedev"

# 6) Solo si el paso 5 dio False:
npm i -g @juanpiecedev/jpcode
```

Después, para confirmar que ya tienes la buena:

```powershell
npm view @juanpiecedev/jpcode version os
jpcode
```

Debe responder:

```
version = '0.1.5'
os = [ 'linux', 'darwin', 'win32' ]
```

---

## 4. Si el paso 4 falla

### "The process cannot access the file because it is being used by another process"

El candado no era un `node`. Dos caminos:

**a) Reiniciar Windows** y ejecutar el paso 6 como **primerísimo comando**, sin abrir nada más
(ni Explorer, ni VS Code, ni terminales extra). Un reinicio libera cualquier handle, y ahí ya
instalas la 0.1.5, que no vuelve a dejar nada dentro del paquete.

**b) Averiguar quién sujeta.** Abre **Monitor de recursos** (`resmon`) → pestaña **CPU** →
*Asociar identificadores* → busca `gateway`. Ahí sale el proceso y su PID.

### Plan B: instalar en otro sitio, sin tocar la carpeta atascada

```powershell
npm i -g @juanpiecedev/jpcode --prefix "$env:LOCALAPPDATA\jpcode-npm"
$env:PATH += ";$env:LOCALAPPDATA\jpcode-npm"
jpcode
```

Para dejarlo permanente, añade `%LOCALAPPDATA%\jpcode-npm` al `PATH` del usuario.

---

## 5. Lo que NO sirve (comprobado)

| Intento | Por qué no funciona |
|---|---|
| `npm uninstall -g @juanpiecedev/jpcode` | npm **no mata procesos**. Y borrar la carpeta de un `cwd` vivo da el mismo `EBUSY`. |
| `npm update -g @juanpiecedev/jpcode` | Por dentro hace **exactamente el mismo rename**. Mismo `EBUSY`. |
| `npm i -g ... --force` | `--force` no salta un `EBUSY` de rename. |
| `npm cache clean --force` | La caché no tiene nada que ver: el bloqueo es el sistema de ficheros. |

---

## 6. Errores concretos y qué significan

| Mensaje | Lectura |
|---|---|
| `EBUSY ... rename ...\jpcode\gateway` | Un proceso vivo tiene `gateway` como `cwd` (la 0.1.4) o un handle dentro. |
| `EPERM ... rename ...\jpcode` | Windows se negó a mover el paquete; casi siempre algo lo tiene abierto. Es el paso previo al `EBUSY`. |
| `EBUSY ...\jpcode\engine` | jpcode está **abierto** en ese momento y el motor tiene cargadas sus piezas nativas. Cierra jpcode y reintenta. |
| Access denied al borrar | Explorer abierto en esa carpeta, antivirus, o falta de permisos: prueba como Administrador. |

---

## 7. Si algo falla, qué mandarme

1. El bloque de error **completo**, tal cual, con sus rutas y el nombre `.jpcode-XXXXXXXX`.
2. Si el paso 4 falló: el mensaje exacto de `Remove-Item`.
3. La salida de:
   ```powershell
   Get-Process | Where-Object { $_.Path -like "*jpcode*" } | Select-Object Id,Path
   Get-ChildItem "$env:APPDATA\npm\node_modules\@juanpiecedev" -Force
   ```

El nombre `.jpcode-XXXXXXXX` me dice en qué versión del árbol estaba; el mensaje del paso 4 me dice
si el que sujeta es `node`, Defender o Explorer.
