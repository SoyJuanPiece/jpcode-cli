---
description: Proveedores del catálogo (models.dev) del gateway de OpenCode
argument-hint: "[list | all | models <id> | connect <id> <clave> | on|off <id> | refresh]"
allowed-tools: Bash(node:*)
# Campos que confirmamos leyendo la implementación de qwen-code (un fork abierto
# de Gemini CLI que usa el mismo formato de comandos):
#   disable-model-invocation → solo lo puede lanzar el usuario, no el modelo
#   when_to_use              → cuándo el modelo debería sugerirlo
when_to_use: cuando el usuario pregunte qué proveedores hay, cuáles están conectados o quiera conectar uno nuevo
disable-model-invocation: true
---

!`node /home/user/studio/opencode-chat/providers-cli.mjs $ARGUMENTS`

Enséñame la salida de arriba **tal cual**, dentro de un bloque de código, sin resumirla ni
reformatearla. Debajo, una sola línea con cuántos proveedores son usables.

No ejecutes ningún otro comando. Si el usuario pidió `connect` sin la clave, dile que se la da la
consola de ese proveedor y que la pase así: `/provider connect <id> <clave>`.
