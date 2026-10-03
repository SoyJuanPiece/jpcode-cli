---
description: Lista de texto de los proveedores del catálogo (models.dev) del gateway
argument-hint: "[list | all | models <id> | connect <id> <clave> | on|off <id> | refresh]"
allowed-tools: run_shell_command
when_to_use: cuando el usuario pregunte qué proveedores hay, cuáles están conectados o quiera conectar uno nuevo
disable-model-invocation: true
---

Qwen ya ha ejecutado el CLI de proveedores con tus argumentos; esta es su salida real:

```text
!{node __CHAT_DIR__/providers-cli.mjs $ARGUMENTS}
```

Muestra esa salida **tal cual**, dentro de un bloque de código, sin resumirla ni reformatearla.

Debajo, esta nota en una línea (no la sustituyas por otra cosa):

> Para conectar un proveedor **desde la interfaz** usa **`/connect`** o **`/provider`**: abren el
> catálogo completo con buscador (escribes para filtrar, *Enter* para elegir, *Esc* para volver).
> Desde aquí puedes conectarlo sin salir del chat: `/providers connect <id> <clave>`.
