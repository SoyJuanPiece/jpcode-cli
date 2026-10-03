---
description: Catálogo de modelos del gateway, ordenado y agrupado por proveedor
argument-hint: "[texto a filtrar | --count | sync]"
allowed-tools: run_shell_command
when_to_use: cuando el usuario pregunte qué modelos hay disponibles, cuáles están conectados o quiera buscarlos
disable-model-invocation: true
---

Qwen ya ha ejecutado el catálogo de modelos con tus argumentos; esta es su salida real:

```text
!{node __CHAT_DIR__/jpcode-modelos.mjs $ARGUMENTS}
```

Muestra esa salida **tal cual**, dentro de un bloque de código, sin resumirla ni reformatearla.

Debajo, una sola línea recordando que **para cambiar de modelo se usa `/model`**: ahí aparece cada
modelo etiquetado con su proveedor («Modelo · Proveedor») y se escribe para filtrar.
