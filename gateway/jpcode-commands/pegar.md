---
description: Pega la imagen que tienes en el portapapeles directamente en jpcode, sin abrir el navegador.
---

# /pegar — Pegar imagen del portapapeles

jpcode incluye un **watcher del portapapeles** que se activa automáticamente al arrancar.

## Cómo funciona

1. **Haz una captura de pantalla** (Win+Shift+S, PrtScn, Snipping Tool, etc.) o **copia una imagen** (clic derecho → Copiar imagen).
2. La imagen aparece **automáticamente** como adjunto en jpcode en 1-2 segundos.
3. Escribe tu pregunta normalmente — la imagen ya está adjunta.

## Si no apareció sola

El watcher puede estar inactivo. Actívalo copiando la imagen primero y luego ejecutando:

```
node %APPDATA%\npm\node_modules\@juanpiecedev\jpcode\clipboard-watch.mjs --once
```

O reinicia jpcode: el watcher arranca con cada sesión.

## Desactivar el watcher

Si prefieres no tener el watcher en segundo plano:

```powershell
$env:JPCODE_CLIP_WATCH="0"; jpcode
```

## Notas

- El watcher detecta **cambios** en el portapapeles: si copias la misma imagen dos veces, solo se adjunta una vez.
- Las imágenes se guardan en `%USERPROFILE%\.jpcode\tmp\clipboard\` como `clip-*.png`.
- En Linux/macOS también funciona si tienes `wl-paste`, `xclip` o `pngpaste` instalados.
