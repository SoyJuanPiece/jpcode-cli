/**
 * Locale en español de jpcode.
 *
 * ## Por qué un fichero suelto y no un parche del motor
 *
 * El motor trae sus propios catálogos (`de, en, fr, ja, pt, ru, zh, zh-TW`) como
 * chunks empaquetados, pero también mira primero un directorio de locales del
 * usuario: `~/.jpcode/locales/<lang>.js`. Si el fichero está ahí, gana al del
 * paquete. O sea que la traducción **no es un parche**: se instala como un
 * fichero más y sobrevive a `vendor-engine.sh` sin que nadie tenga que volver a
 * picar un chunk.
 *
 * ## Cómo se elige el idioma
 *
 * `detectSystemLanguage()` del motor lee `QWEN_CODE_LANG` y luego `LANG`. Con el
 * sistema en español entra este catálogo; con otro idioma sigue el suyo. Para
 * forzarlo sin tocar la configuración: `QWEN_CODE_LANG=es jpcode`.
 *
 * ## Reglas de las claves
 *
 * - La clave es el texto en inglés, literal. No se renombra nada: el motor pide
 *   `t("Esc to cancel")` y hay que responder a eso.
 * - `{{algo}}` se deja tal cual: el motor lo sustituye. Si se pierde una
 *   interpolación aparece la llave entera en pantalla, así que hay que mirar.
 * - Mayúsculas: en los títulos de menú se mantiene el título en español
 *   ("Configuración"), que es lo que se espera al leerlo.
 *
 * ## Cómo va
 *
 * Traducidas a mano, sin generador. Las que faltan no se inventan: se deja que
 * el motor caiga al inglés. Para ver el progreso:
 *
 *   node jpcode/check-locale-es.mjs
 *
 * Que es de donde sale el porcentaje, y también el aviso de las claves que se
 * quedaron con un `{{...}}` que no coincide con el inglés.
 */
export default {
  /* ---- estados y errores que se ven constantly ---- */
  Error: "Error",
  error: "error",
  "✗ Error:": "✗ Error:",
  "Error:": "Error:",
  "Error: {{error}}": "Error: {{error}}",
  "✗ Error saving subagent:": "✗ Error al guardar el subagente:",

  /* ---- cómo se llama cada herramienta ---- */
  "toolDisplayName.Exec": "Ejecutar",
  "toolDisplayName.Edit": "Editar",
  "toolDisplayName.WriteFile": "Escribir archivo",
  "toolDisplayName.ReadFile": "Leer archivo",
  "toolDisplayName.ZoomImage": "Ampliar imagen",
  "toolDisplayName.Grep": "Buscar",
  "toolDisplayName.Glob": "Listar",
  "toolDisplayName.Shell": "Shell",
  "toolDisplayName.Shell Command": "Comando",
  "toolDisplayName.TodoList": "Lista de tareas",
  "toolDisplayName.Goal": "Objetivo",
  "toolDisplayName.UpdateGoal": "Actualizar objetivo",
  "toolDisplayName.ProposeGoal": "Proponer objetivo",
  "toolDisplayName.SaveMemory": "Guardar memoria",
  "toolDisplayName.ManageMemory": "Gestionar memoria",
  "toolDisplayName.SearchMemory": "Buscar en memoria",
  "toolDisplayName.Agent": "Agente",
  "toolDisplayName.Advisor": "Asesor",
  "toolDisplayName.Artifact": "Artefacto",
  "toolDisplayName.RecordArtifact": "Registrar artefacto",
  "toolDisplayName.RecordSource": "Registrar fuente",
  "toolDisplayName.ReportFindings": "Informar de hallazgos",
  "toolDisplayName.DisplayImage": "Mostrar imagen",
  "toolDisplayName.Skill": "Habilidad",
  "toolDisplayName.EnterPlanMode": "Entrar en modo plan",
  "toolDisplayName.ExitPlanMode": "Salir del modo plan",
  "toolDisplayName.WebFetch": "Traer de la web",
  "toolDisplayName.WebSearch": "Buscar en la web",
  "toolDisplayName.ListFiles": "Listar archivos",
  "toolDisplayName.Lsp": "LSP",
  "toolDisplayName.AskUserQuestion": "Preguntar",
  "toolDisplayName.CronCreate": "Crear tarea programada",
  "toolDisplayName.CronList": "Listar tareas programadas",
  "toolDisplayName.CronDelete": "Borrar tarea programada",
  "toolDisplayName.LoopWakeup": "Despertar del bucle",
  "toolDisplayName.CreateSubSession": "Crear subsesión",
  "toolDisplayName.ListAgents": "Listar agentes",
  "toolDisplayName.TaskCreate": "Crear tarea",
  "toolDisplayName.TaskUpdate": "Actualizar tarea",
  "toolDisplayName.TaskList": "Listar tareas",
  "toolDisplayName.TaskStop": "Parar tarea",
  "toolDisplayName.TeamCreate": "Crear equipo",
  "toolDisplayName.TeamDelete": "Borrar equipo",
  "toolDisplayName.TeamPlanApproval": "Aprobar plan del equipo",
  "toolDisplayName.SendMessage": "Enviar mensaje",
  "toolDisplayName.RequestShutdown": "Pedir cierre",
  "toolDisplayName.StructuredOutput": "Salida estructurada",
  "toolDisplayName.Monitor": "Monitor",
  "toolDisplayName.NotebookEdit": "Editar notebook",
  "toolDisplayName.ToolSearch": "Buscar herramienta",
  "toolDisplayName.ToolCall": "Llamada a herramienta",
  "toolDisplayName.EnterWorktree": "Entrar en worktree",
  "toolDisplayName.ExitWorktree": "Salir del worktree",
  "toolDisplayName.Workflow": "Flujo",
  "toolDisplayName.ReadMcpResource": "Leer recurso MCP",
  "toolDisplayName.ImageGen": "Generar imagen",
  "toolDisplayName.ClipVideo": "Recortar vídeo",
  "toolDisplayName.ClipImage": "Recortar imagen",
  "toolDisplayName.ClipAudio": "Recortar audio",
  "toolDisplayName.CaptionImage": "Describir imagen",
  "toolDisplayName.CaptionAudio": "Describir audio",
  "toolDisplayName.OcrImage": "OCR de imagen",
  "toolDisplayName.UnderstandVideoSegments": "Analizar vídeo",

  /* ---- el pie de la pantalla: ayuda y atajos ---- */
  "Esc to cancel": "Esc para cancelar",
  "Press ? again to close": "Pulsa ? otra vez para cerrar",
  "(shift + tab to cycle)": "(shift + tab para cambiar)",
  "(tab to cycle)": "(tab para cambiar)",
  "(Tab / ←→ to switch)": "(Tab / ←→ para cambiar)",
  "Keyboard Shortcuts:": "Atajos de teclado:",
  "Commands:": "Comandos:",
  "for shell mode": "para el modo shell",
  "for commands": "para los comandos",
  "for file paths": "para las rutas de archivo",
  "to clear input": "para limpiar la entrada",
  "to cycle approvals": "para cambiar las aprobaciones",
  "to expand details": "para desplegar los detalles",
  "Toggle this help display": "Mostrar u ocultar esta ayuda",
  "Toggle shell mode": "Alternar el modo shell",
  "Open command menu": "Abrir el menú de comandos",
  "Add file context": "Añadir archivo al contexto",
  "Reverse search history": "Buscar en el historial hacia atrás",
  "Add context": "Añadir contexto",
  "Attachments: ": "Adjuntos: ",
  "↑ to manage attachments": "↑ para gestionar los adjuntos",
  "↑ more above": "↑ hay más arriba",
  "↓ more below": "↓ hay más abajo",
  "Enter to confirm, Esc to cancel": "Enter para confirmar, Esc para cancelar",
  "Enter to select · Esc to cancel": "Enter para elegir · Esc para cancelar",
  "↑↓ to navigate · Enter to select · Esc to cancel":
    "↑↓ para moverse · Enter para elegir · Esc para cancelar",
  "Press Enter to confirm, Esc to cancel": "Pulsa Enter para confirmar, Esc para cancelar",
  "Y/Enter to confirm · N/Esc to cancel": "Y/Enter para confirmar · N/Esc para cancelar",
  "Press Escape, Ctrl+C, or Ctrl+D to cancel":
    "Pulsa Escape, Ctrl+C o Ctrl+D para cancelar",
  "Loading...": "Cargando...",
  "Loading skills…": "Cargando habilidades…",

  /* ---- modos ---- */
  "Shell mode": "Modo shell",
  "YOLO mode": "Modo YOLO",
  "Auto mode": "Modo auto",
  "plan mode": "modo plan",
  "auto-accept edits": "acepta los cambios solo",
  "Accepting edits": "Aceptando cambios",
  "shell command": "comando",
  "Basics:": "Básico:",
  "Components:": "Componentes:",
  "Examples:": "Ejemplos:",
  "User level": "Nivel de usuario",
  "Project level": "Nivel de proyecto",
  "Global (User Scope)": "Global (ámbito de usuario)",
  "Project (Workspace)": "Proyecto (espacio de trabajo)",
  "Changing scope...": "Cambiando de ámbito...",

  /* ---- permisos y confirmaciones ---- */
  "Ask permissions": "Pedir permiso",
  "Tool Approval Mode": "Modo de aprobación de herramientas",
  "View or change the approval mode for tool usage":
    "Ver o cambiar el modo de aprobación del uso de herramientas",
  "Use classifier to automatically approve safe tool calls":
    "Usar el clasificador para aprobar automáticamente las llamadas seguras",
  "Workspace approval mode exists and takes priority. User-level change will have no effect.":
    "Ya existe un modo de aprobación del espacio de trabajo y tiene prioridad. El cambio a nivel de usuario no tendrá efecto.",
  "Workspace is untrusted; workspace settings are ignored by the merged config. Run /trust first to persist skills changes here, or edit ~/.qwen/settings.json directly to manage skills at user scope.":
    "El espacio de trabajo no es de confianza, así que la configuración combinada ignora sus ajustes. Ejecuta /trust primero para guardar aquí los cambios de habilidades, o edita ~/.jpcode/settings.json para gestionarlas a nivel de usuario.",
  "Folder Trust": "Confianza de la carpeta",
  "disabled (folder not trusted)": "desactivado (la carpeta no es de confianza)",
  "Yes": "Sí",
  "Yes, allow once": "Sí, permitir una vez",

  /* ---- autenticación ---- */
  Authenticate: "Autenticar",
  "Re-authenticate": "Volver a autenticar",
  "Clear Authentication": "Borrar la autenticación",
  "OAuth Authentication": "Autenticación OAuth",
  "Authentication complete. Returning to server details...":
    "Autenticación completa. Volviendo a los detalles del servidor...",
  "Authentication successful.": "Autenticación correcta.",
  "Authenticating... Please complete the login in your browser.":
    "Autenticando... Termina el inicio de sesión en tu navegador.",
  "Cleared authentication for \"{{name}}\".": "Autenticación de \"{{name}}\" borrada.",
  "Authentication type not available.": "Tipo de autenticación no disponible.",
  "needs authentication": "necesita autenticación",
  "Successfully authenticated and refreshed tools for '{{name}}'.":
    "Autenticación correcta y herramientas de '{{name}}' actualizadas.",
  "Could not retrieve tool registry.": "No se pudo obtener el registro de herramientas.",

  /* ---- herramientas y servidor ---- */
  "No tools available": "No hay herramientas disponibles",
  "No tools available for this server.": "No hay herramientas disponibles en este servidor.",
  "No resources available for this server.":
    "No hay recursos disponibles en este servidor.",
  "No tool selected": "Ninguna herramienta elegida",
  "No resource selected": "Ningún recurso elegido",
  "No server selected": "Ningún servidor elegido",
  "Warning: This tool cannot be called by the LLM":
    "Aviso: el modelo no puede llamar a esta herramienta",
  "Show Tool Call Arguments": "Mostrar los argumentos de las llamadas",
  "Tool Output Truncation Threshold": "Límite de recorte de la salida",
  "Tool Output Truncation Lines": "Líneas de recorte de la salida",
  "Tool Schema Compliance": "Cumplimiento del esquema de herramientas",
  "Tool Detail": "Detalle de la herramienta",

  /* ---- Extensiones ---- */
  Actions: "Acciones",
  Discover: "Descubrir",
  "Discover extensions": "Descubrir extensiones",
  "Discovering extensions...": "Descubriendo extensiones...",
  "Add new": "Añadir",
  "Add Marketplace": "Añadir mercado",
  "+ Add new marketplace": "+ Añadir un mercado",
  "Back to extension list": "Volver a la lista de extensiones",
  Disabled: "Desactivada",
  Installed: "Instalada",
  "Extension details": "Detalles de la extensión",
  "Extension v{{version}}": "Extensión v{{version}}",
  Favorites: "Favoritas",
  "Add to Favorites": "Añadir a favoritas",
  "Remove from Favorites": "Quitar de favoritas",
  Uninstall: "Desinstalar",
  "Mark for Update": "Marcar para actualizar",
  "Update Now": "Actualizar ya",
  "Update marketplace": "Actualizar el mercado",
  "Remove marketplace": "Quitar el mercado",
  Marketplaces: "Mercados",
  Sources: "Fuentes",
  MCP: "MCP",
  "MCP servers": "Servidores MCP",
  "Uninstalling \"{{name}}\"...": "Desinstalando \"{{name}}\"...",
  "Disabling \"{{name}}\"...": "Desactivando \"{{name}}\"...",
  "Enabling \"{{name}}\"...": "Activando \"{{name}}\"...",
  "Enabling MCP \"{{name}}\"...": "Activando el MCP \"{{name}}\"...",
  "Uninstalled \"{{name}}\".": "\"{{name}}\" desinstalada.",
  "Updated \"{{name}}\".": "\"{{name}}\" actualizada.",
  "MCP \"{{name}}\" {{state}}.": "MCP \"{{name}}\" {{state}}.",
  "Last updated: {{date}}": "Última actualización: {{date}}",
  "Version: {{v}}": "Versión: {{v}}",
  "By: {{a}}": "De: {{a}}",
  "from {{marketplace}}": "de {{marketplace}}",
  "Enter extension source:": "Escribe el origen de la extensión:",
  "Will install:": "Se instalará:",
  "Would open: {{url}}": "Se abriría: {{url}}",
  "Open homepage": "Abrir la página",
  "No extensions found.": "No se encontraron extensiones.",
  "No extensions installed.": "No hay extensiones instaladas.",
  "No extensions discovered.": "No se descubrió ninguna extensión.",
  "No extensions match your search.": "Ninguna extensión coincide con tu búsqueda.",
  "No extensions or marketplaces added yet.":
    "Todavía no has añadido extensiones ni mercados.",
  "No extensions to update.": "No hay extensiones que actualizar.",
  "No marketplace sources added yet.": "Todavía no has añadido ninguna fuente de mercados.",
  "No marketplaces added yet.": "Todavía no has añadido ningún mercado.",
  "No plugins or MCP servers installed.":
    "No hay plugins ni servidores MCP instalados.",
  "No plugins available in this marketplace.":
    "No hay plugins disponibles en este mercado.",
  "No installable extensions selected.": "No has elegido ninguna extensión instalable.",
  "No homepage available.": "No hay página disponible.",
  "Extension \"{{name}}\" has no settings to configure.":
    "La extensión \"{{name}}\" no tiene ajustes que configurar.",
  "Failed to install extension from \"{{source}}\": {{error}}":
    "No se pudo instalar la extensión de \"{{source}}\": {{error}}",
  "Failed to check \"{{name}}\" for updates.":
    "No se pudo comprobar si \"{{name}}\" tiene actualizaciones.",
  "Link extension failed to install.": "No se pudo instalar la extensión por enlace.",
  "Type to search · Space to toggle · Enter to view · Ctrl+R refresh · Esc to go back":
    "Escribe para buscar · Espacio para marcar · Enter para ver · Ctrl+R actualizar · Esc para volver",
  "⚠ Make sure you trust an extension before installing, updating, or using it. We cannot verify what MCP servers, files, or other software an extension includes, or that it works as intended. See the extension homepage for more information.":
    "⚠ Confía en una extensión antes de instalarla, actualizarla o usarla. No podemos verificar qué servidores MCP, archivos u otro software incluye, ni que funcione como dice. Mira la página de la extensión para más información.",
  "**Extensions may introduce unexpected behavior. Ensure you have investigated the extension source and trust the author.**":
    "**Las extensiones pueden traer comportamientos inesperados. Investiga su origen y confía en quien la hizo antes de instalarla.**",

  /* ---- habilidades ---- */
  "No skills are currently available.": "Ahora mismo no hay habilidades disponibles.",
  "No skills match the search.": "Ninguna habilidad coincide con la búsqueda.",
  "Failed to load skills: {{error}}": "No se pudieron cargar las habilidades: {{error}}",
  "Failed to save skills configuration: {{error}}":
    "No se pudo guardar la configuración de habilidades: {{error}}",
  "Skills configuration saved, but refresh failed: {{error}}. Restart to ensure the new state is applied.":
    "La configuración de habilidades se guardó, pero la recarga falló: {{error}}. Reinicia para que se aplique el estado nuevo.",

  /* ---- terminal ---- */
  "Working Directory:": "Directorio de trabajo:",
  "Your terminal is already configured for an optimal experience with multiline input (Shift+Enter and Ctrl+Enter).":
    "Tu terminal ya está configurada para la entrada multilínea (Shift+Enter y Ctrl+Enter).",
  "Failed to configure terminal: {{error}}":
    "No se pudo configurar el terminal: {{error}}",
  "Failed to configure {{terminalName}}.": "No se pudo configurar {{terminalName}}.",
  "Added Shift+Enter and Ctrl+Enter keybindings to {{terminalName}}.":
    "Se añadieron los atajos Shift+Enter y Ctrl+Enter a {{terminalName}}.",
  "Ctrl+Enter binding already exists": "El atajo Ctrl+Enter ya existe",
  "Failed to parse {{terminalName}} keybindings.json. The file contains invalid JSON. Please fix the file manually or delete it to allow automatic configuration.":
    "No se pudo leer el keybindings.json de {{terminalName}}: el JSON no es válido. Arregla el fichero a mano o bórralo para poder configurarlo automáticamente.",

  /* ---- git y diff ---- */
  "Could not determine current working directory.":
    "No se pudo determinar el directorio de trabajo actual.",
  "Failed to compute git diff stats": "No se pudieron calcular las estadísticas del diff",
  "No diff available. Either this is not a git repository, HEAD is missing, or a merge/rebase/cherry-pick/revert is in progress.":
    "No hay diff. O esto no es un repositorio de git, o falta HEAD, o hay un merge/rebase/cherry-pick/revert en marcha.",
  "Clean working tree — no changes against HEAD.":
    "Árbol de trabajo limpio: no hay cambios contra HEAD.",

  /* ---- rebobinar y forked ---- */
  "No user turns to rewind to.": "No hay turnos tuyos a los que volver.",
  "Failed to restore files: {{error}}": "No se pudieron restaurar los archivos: {{error}}",
  "Rewind failed: {{error}}": "No se pudo rebobinar: {{error}}",
  "Cannot rewind conversation: no active model client.":
    "No se puede rebobinar la conversación: no hay cliente del modelo activo.",
  "Code restored, but conversation could not be rewound (no active client).":
    "Se restauró el código, pero no se pudo rebobinar la conversación (no hay cliente activo).",
  "Cannot rewind the conversation to this turn: it no longer matches the model history (for example, after a retry). Try a more recent turn.":
    "No se puede rebobinar hasta este turno: ya no coincide con el historial del modelo (por ejemplo, tras un reintento). Prueba con un turno más reciente.",
  "File restore is unavailable for this turn (no captured file changes, or this turn predates the current session).":
    "No se pueden restaurar archivos en este turno (no se capturaron cambios, o el turno es anterior a esta sesión).",
  "Failed to restore {{count}} file(s): {{files}}":
    "No se pudieron restaurar {{count}} archivo(s): {{files}}",
  "No files needed to be restored.": "No había archivos que restaurar.",
  "No conversation to branch.": "No hay conversación que bifurcar.",
  "The agent tool is unavailable; cannot fork.":
    "La herramienta de agente no está disponible: no se puede bifurcar.",
  "Cannot fork while a response or tool call is in progress. Wait for it to finish or resolve the pending tool call.":
    "No se puede bifurcar mientras hay una respuesta o una llamada en marcha. Espera a que termine o resuelve la llamada pendiente.",

  /* ---- subagentes y tareas ---- */
  "No subagents found.": "No se encontraron subagentes.",
  "No agent selected": "Ningún agente elegido",
  "Failed to generate subagent: {{error}}":
    "No se pudo generar el subagente: {{error}}",
  "Failed to save and edit subagent: {{error}}":
    "No se pudo guardar ni editar el subagente: {{error}}",
  "Failed to launch editor: {{error}}": "No se pudo abrir el editor: {{error}}",

  /* ---- hooks ---- */
  "Loading hooks...": "Cargando hooks...",
  "Error loading hooks:": "Error al cargar los hooks:",
  "No hook selected": "Ningún hook elegido",
  "No hook events found.": "No se encontraron eventos de hook.",
  "No hooks configured for this event.": "No hay hooks configurados para este evento.",
  "No hook config selected": "Ningún hook configurado elegido",
  "Failed to reload hook definitions: {{error}}":
    "No se pudieron recargar las definiciones de hooks: {{error}}",
  "Safe mode is on, so no hooks run in this session.":
    "El modo seguro está activo, así que en esta sesión no se ejecuta ningún hook.",
  "Bare mode is on, so no hooks run in this session.":
    "El modo desvestido está activo, así que en esta sesión no se ejecuta ningún hook.",
  "No hook commands will execute": "No se ejecutará ningún comando de hook",
  "Tool operations will proceed without hook validation":
    "Las operaciones con herramientas continuarán sin validación de hooks",

  /* ---- voz, modelos y contexto ---- */
  "No models are configured.": "No hay modelos configurados.",
  "No models available for the current authentication type ({{authType}}).":
    "No hay modelos disponibles para el tipo de autenticación actual ({{authType}}).",
  "no voice model selected": "no hay modelo de voz elegido",
  "No voice model selected. Run /model --voice to choose one before enabling voice dictation.":
    "No hay modelo de voz elegido. Ejecuta /model --voice antes de activar el dictado por voz.",
  "No chat client available to generate summary.":
    "No hay cliente de chat disponible para generar el resumen.",
  "No conversation found to summarize.": "No hay conversación que resumir.",
  "Failed to generate project context summary: {{error}}":
    "No se pudo generar el resumen del contexto del proyecto: {{error}}",
  "Failed to generate summary - no text content received from LLM response":
    "No se pudo generar el resumen: la respuesta del modelo no traía texto",
  "Failed to compress chat history.": "No se pudo comprimir el historial.",
  "Failed to compress chat history: {{error}}":
    "No se pudo comprimir el historial: {{error}}",
  "Could not compress chat history due to a token counting error.":
    "No se pudo comprimir el historial por un error al contar los tokens.",
  "Could not compress chat history due to an API error.":
    "No se pudo comprimir el historial por un error de la API.",
  "Fast context compression without AI. Strips old tool outputs and thinking parts.":
    "Compresión rápida del contexto sin IA. Quita las salidas antiguas de herramientas y los razonamientos.",
  "Error adding '{{path}}': {{error}}": "Error al añadir '{{path}}': {{error}}",
  "Error refreshing memory: {{error}}": "Error al actualizar la memoria: {{error}}",
  "No managed auto-memory entries matched: {{query}}":
    "Ninguna entrada de la memoria automática coincidió con: {{query}}",

  /* ---- terminal del motor ---- */
  "Run qwen --debug to see error logs":
    "Ejecuta jpcode --debug para ver el registro de errores",
  "Move this session to a new working directory":
    "Mover esta sesión a otro directorio de trabajo",
  "Set history to expand by default when resuming a session":
    "Expandir el historial por defecto al reanudar una sesión",
  "Failed to generate LLM output language rule file: {{error}}":
    "No se pudo generar el archivo de reglas de idioma de salida: {{error}}",
  "Show working-tree change stats versus HEAD":
    "Mostrar los cambios del árbol de trabajo frente a HEAD",
  None: "Ninguno",

  /* ---- extensiones y mercados ---- */
  "Cannot disable an extension-provided MCP server here.":
    "Aquí no se puede desactivar un servidor MCP que venga de una extensión.",
  "MCP \"{{name}}\" disabled for all projects.":
    "MCP \"{{name}}\" desactivado en todos los proyectos.",
  "Enable extension \"{{name}}\" to manage this MCP server.":
    "Activa la extensión \"{{name}}\" para gestionar este servidor MCP.",
  "Extension-provided MCP servers cannot be favorited.":
    "Los servidores MCP de una extensión no se pueden marcar como favoritos.",
  "Clipboard image paste is unavailable because the native clipboard module could not be loaded. Reinstall jpcode or use the npm installation method.":
    "No se puede pegar una imagen del portapapeles porque no se pudo cargar el módulo nativo del portapapeles. Reinstala jpcode o usa la instalación por npm.",
  " · {{marketplace}} (Tab to clear)": " · {{marketplace}} (Tab para quitar)",
  "\"{{name}}\" {{state}}.": "\"{{name}}\" {{state}}.",
  "+ Install a new extension": "+ Instalar una extensión nueva",
  "Add a marketplace in the Sources tab to discover extensions.":
    "Añade un mercado en la pestaña Fuentes para descubrir extensiones.",
  "Added \"{{name}}\" to favorites.": "\"{{name}}\" añadida a favoritas.",
  "Added marketplace \"{{name}}\".": "Mercado \"{{name}}\" añadido.",
  "Adding...": "Añadiendo...",
  "Browse extensions ({{count}})": "Explorar extensiones ({{count}})",
  "Change scope for \"{{name}}\":": "Cambiar el ámbito de \"{{name}}\":",
  "Update available for \"{{name}}\".": "Hay una actualización de \"{{name}}\".",
  "\"{{name}}\" is already up to date.": "\"{{name}}\" ya está al día.",
  "Checking \"{{name}}\" for updates...":
    "Comprobando si \"{{name}}\" tiene actualizaciones...",
  "\"{{name}}\" does not support update checks.":
    "\"{{name}}\" no admite comprobaciones de actualización.",
  "\"{{name}}\" cannot be update-checked (Claude marketplace plugins update by reinstalling).":
    "No se puede comprobar la actualización de \"{{name}}\" (los plugins del mercado de Claude se actualizan reinstalándolos).",
  "Claude plugin marketplace": "Mercado de plugins de Claude",
  Commands: "Comandos",
  "Could not load this marketplace.": "No se pudo cargar este mercado.",
  "Current: {{scope}}": "Ahora: {{scope}}",
  "Disabling MCP \"{{name}}\"...": "Desactivando el MCP \"{{name}}\"...",
  "Enter marketplace source (Claude format):":
    "Escribe el origen del mercado (formato de Claude):",
  "Extensions are not available in this environment.":
    "Las extensiones no están disponibles en este entorno.",
  "Failed to open {{url}}": "No se pudo abrir {{url}}",
  "Install Extension": "Instalar extensión",
  "Install for the current workspace (project scope)":
    "Instalar en el espacio de trabajo actual (ámbito de proyecto)",
  "Install for you (user scope)": "Instalar para ti (ámbito de usuario)",
  "Install {{count}} extension(s) to which scope?":
    "¿En qué ámbito instalo {{count}} extensión(es)?",
  "Installed extension \"{{name}}\".": "Extensión \"{{name}}\" instalada.",
  "Installed extensions ({{count}}):": "Extensiones instaladas ({{count}}):",
  "Installed {{count}} extension(s).": "{{count}} extensión(es) instalada(s).",
  "{{name}}: installed, but the scope rollback failed — it may be disabled at all scopes; re-enable it from the Installed tab.":
    "{{name}}: instalada, pero la vuelta atrás del ámbito falló: puede estar desactivada en todos; vuelve a activarla desde la pestaña Instaladas.",
  "Could not change scope, and the rollback also failed — \"{{name}}\" may be disabled at all scopes. Re-enable it from the Installed tab. ({{error}})":
    "No se pudo cambiar el ámbito, y la vuelta atrás también falló: \"{{name}}\" puede estar desactivada en todos. Vuelve a activarla desde la pestaña Instaladas. ({{error}})",
  "Installed {{ok}}, failed {{fail}}: {{detail}}":
    "Instaladas {{ok}}, fallidas {{fail}}: {{detail}}",
  "Installing...": "Instalando...",
  "Note: Uninstall permanently removes this extension.":
    "Nota: desinstalar borra esta extensión de forma permanente.",
  "Refreshed {{count}} extension(s).": "{{count}} extensión(es) actualizadas.",
  "Remove marketplace \"{{name}}\"?": "¿Quitar el mercado \"{{name}}\"?",
  "Removed \"{{name}}\" from favorites.": "\"{{name}}\" quitada de favoritas.",
  "Removed marketplace \"{{name}}\".": "Mercado \"{{name}}\" quitado.",
  "Scope:": "Ámbito:",
  "Set \"{{name}}\" scope to {{scope}}.": "Ámbito de \"{{name}}\" puesto a {{scope}}.",
  "Update marketplace (last updated {{date}})":
    "Actualizar el mercado (última vez {{date}})",
  "Could not update marketplace \"{{name}}\".":
    "No se pudo actualizar el mercado \"{{name}}\".",
  "Updated marketplace \"{{name}}\".": "Mercado \"{{name}}\" actualizado.",
  "Use the Discover tab to find and install plugins.":
    "Usa la pestaña Descubrir para encontrar e instalar plugins.",
  "Press R to retry · Esc to go back": "Pulsa R para reintentar · Esc para volver",
  "Enter to select · R refresh · Esc to go back":
    "Enter para elegir · R actualizar · Esc para volver",
  installed: "instalada",
  "{{count}} Agents": "{{count}} agentes",
  "{{count}} Workflows": "{{count}} flujos",
  "{{count}} Commands": "{{count}} comandos",
  "{{count}} MCP": "{{count}} MCP",
  "{{count}} Skills": "{{count}} habilidades",
  "{{count}} available extensions": "{{count}} extensiones disponibles",
  "↑↓ navigate · Enter open · d remove marketplace · Esc close":
    "↑↓ moverse · Enter abrir · d quitar el mercado · Esc cerrar",
  "↑↓ navigate · Enter select · Esc close":
    "↑↓ moverse · Enter elegir · Esc cerrar",
  "↑↓ navigate · Enter select · d remove marketplace · Esc close":
    "↑↓ moverse · Enter elegir · d quitar el mercado · Esc cerrar",
  "↑↓ navigate · Space enable/disable · f favorite · Enter details · Esc close":
    "↑↓ moverse · Espacio activar/desactivar · f favorita · Enter detalles · Esc cerrar",
  "toolDisplayName.DownsampleImage": "Reducir imagen",
  "toolDisplayName.DownscaleVideo": "Reducir vídeo",
  "toolDisplayName.DownsampleAudio": "Reducir audio",
  "toolDisplayName.ExtractKeyframes": "Extraer fotogramas",
  "toolDisplayName.ExtractAudio": "Extraer audio",
  "toolDisplayName.ConvertImage": "Convertir imagen",
  "toolDisplayName.TranscribeAudio": "Transcribir audio",
  "toolDisplayName.RecallMediaMemory": "Recordar medio",
  "[fixed-only: runs via media policies, not the model]":
    "[solo fijos: se ejecutan con las políticas de medios, no con el modelo]",

  /* ---- el prompt y los atajos ---- */
  "← → select, Delete to remove, ↓ to exit":
    "← → elegir, Supr para quitar, ↓ para salir",
  "Use {{symbol}} to specify files for context (e.g., {{example}}) to target specific files or folders.":
    "Usa {{symbol}} para poner archivos en el contexto (p. ej. {{example}}) para señalar archivos o carpetas concretas.",
  "@": "@",
  "@src/myFile.ts": "@src/miArchivo.ts",
  "auto_mode.entry_notice":
    "Modo auto activado.\n   Un clasificador del modelo evalúa cada llamada: las acciones seguras se aprueban solas,\n   las arriesgadas se bloquean. Salir: Shift+Tab o /approval-mode default.",
  "Execute shell commands via {{symbol}} (e.g., {{example1}}) or use natural language (e.g., {{example2}}).":
    "Ejecuta comandos del shell con {{symbol}} (p. ej. {{example1}}) o dilo en lenguaje natural (p. ej. {{example2}}).",
  "!": "!",
  "!npm run start": "!npm run start",
  "start server": "arranca el servidor",
  "Model Context Protocol command (from external servers)":
    "Comando del Model Context Protocol (de servidores externos)",
  "Accept suggestion / Autocomplete": "Aceptar la sugerencia / Autocompletar",
  "to quit": "para salir",
  "for newline": "para una línea nueva",
  "to clear screen": "para limpiar la pantalla",
  "to search history": "para buscar en el historial",
  "to paste images": "para pegar imágenes",
  "for external editor": "para el editor externo",
  "Jump through words in the input": "Saltar de palabra en palabra en la entrada",
  "Close dialogs, cancel requests, or quit application":
    "Cerrar diálogos, cancelar peticiones o salir de la aplicación",
  "New line": "Línea nueva",
  "New line (Alt+Enter works for certain linux distros)":
    "Línea nueva (Alt+Enter funciona en algunas distros de Linux)",
  "Clear the screen": "Limpiar la pantalla",
  "Open input in external editor": "Abrir la entrada en el editor externo",
  "Send message": "Enviar el mensaje",
  "Initializing...": "Arrancando...",
  "Connecting to MCP servers... ({{connected}}/{{total}})":
    "Conectando con los servidores MCP... ({{connected}}/{{total}})",
  "Type your message or @path/to/file": "Escribe tu mensaje o @ruta/al/archivo",
  "? for shortcuts": "? para los atajos",
  "Pasting…": "Pegando…",
  "Press 'i' for INSERT mode and 'Esc' for NORMAL mode.":
    "Pulsa 'i' para el modo INSERCIÓN y 'Esc' para el modo NORMAL.",
  "Cancel operation / Clear input (double press)":
    "Cancelar la operación / Limpiar la entrada (dos veces)",
  "Cycle approval modes": "Cambiar el modo de aprobación",
  "Cycle through your prompt history": "Recorrer el historial de tus prompts",
  "For a full list of shortcuts, see {{docPath}}":
    "Para la lista completa de atajos, mira {{docPath}}",
  "docs/keyboard-shortcuts.md": "docs/keyboard-shortcuts.md",
  "for help on jpcode": "para la ayuda de jpcode",
  "show version info": "mostrar la versión",
  "show paths for current session files and logs":
    "mostrar las rutas de los archivos y registros de esta sesión",

  /* ---- /status ---- */
  "submit a bug report": "enviar un informe de error",
  Status: "Estado",
  jpcode: "jpcode",
  Runtime: "Runtime",
  OS: "SO",
  Auth: "Autenticación",
  Model: "Modelo",
  "Fast Model": "Modelo rápido",
  Sandbox: "Sandbox",
  "Session ID": "ID de sesión",
  "Base URL": "URL base",
  Proxy: "Proxy",
  "Memory Usage": "Memoria",
  "IDE Client": "Cliente IDE",

  /* ---- habilidades ---- */
  "Analyzes the project and creates a tailored QWEN.md file.":
    "Analiza el proyecto y crea un fichero QWEN.md a su medida.",
  "List available jpcode tools. Usage: /tools [desc]":
    "Lista las herramientas de jpcode. Uso: /tools [desc]",
  "Open the skills panel (browse, search, toggle, pick).":
    "Abre el panel de habilidades (ver, buscar, activar, elegir).",
  "Manage Skills": "Gestionar habilidades",
  "Skills configuration saved.": "Configuración de habilidades guardada.",
  "SkillManager not available.": "SkillManager no está disponible.",
  "All available skills are disabled. Edit ~/.qwen/settings.json or .qwen/settings.json (skills.disabled) to re-enable.":
    "Todas las habilidades disponibles están desactivadas. Edita ~/.jpcode/settings.json o .jpcode/settings.json (skills.disabled) para volver a activarlas.",
  "Press esc to close.": "Pulsa esc para cerrar.",
  "{{count}} skills · ": "{{count}} habilidades · ",
  "{{matched}} / {{total}} skills · ": "{{matched}} / {{total}} habilidades · ",
  "Space toggle · Enter pick (fill input) · Esc save & exit · workspace scope":
    "Espacio activar · Enter elegir (rellena la entrada) · Esc guardar y salir · ámbito del espacio de trabajo",
  "Search:": "Buscar:",
  "type to filter…": "escribe para filtrar…",
  "Locked by settings entries you cannot toggle here:":
    "Bloqueadas por entradas de configuración que no puedes cambiar aquí:",
  "{{count}} locked not shown": "{{count}} bloqueadas no mostradas",
  "higher scope": "ámbito superior",
  "  {{name}} {{description}}  [locked: {{scope}}]":
    "  {{name}} {{description}}  [bloqueada: {{scope}}]",
  "↑/↓ navigate · backspace edits search":
    "↑/↓ moverse · retroceso edita la búsqueda",
  Bundled: "Incluidas",
  "Available jpcode CLI tools:": "Herramientas disponibles en jpcode:",

  /* ---- modos de aprobación ---- */
  "Invalid approval mode \"{{arg}}\". Valid modes: {{modes}}":
    "Modo de aprobación «{{arg}}» no válido. Modos válidos: {{modes}}",
  "Approval mode set to \"{{mode}}\"": "Modo de aprobación puesto a «{{mode}}»",
  "View or change the language setting": "Ver o cambiar el idioma",
  "List background tasks (text dump — interactive dialog opens via the footer pill)":
    "Listar tareas en segundo plano (volcado de texto: el diálogo interactivo se abre desde la píldora del pie)",

  /* ---- rebobinar ---- */
  "Delete a previous session": "Borrar una sesión anterior",
  "Run installation and environment diagnostics":
    "Ejecutar el diagnóstico de instalación y del entorno",
  "Browse dynamic model catalogs and choose which models stay enabled locally":
    "Explorar los catálogos de modelos dinámicos y elegir cuáles quedan activados en local",
  "Generate a one-line session recap now":
    "Generar ahora un resumen de una línea de esta sesión",
  "Rename the current conversation. --auto lets the fast model pick a title.":
    "Renombrar la conversación actual. Con --auto el modelo rápido elige el título.",
  "Rewind conversation to a previous turn":
    "Rebobinar la conversación a un turno anterior",
  "Rewind Conversation": "Rebobinar la conversación",
  "Rewind to: ": "Rebobinar a: ",
  "Restore code and conversation": "Restaurar el código y la conversación",
  "Restore conversation only": "Restaurar solo la conversación",
  "Restore code only": "Restaurar solo el código",
  "Never mind": "Olvídalo",
  "Computing file changes...": "Calculando los cambios de archivos...",
  "Restoring...": "Restaurando...",
  "Restored {{count}} file(s).": "{{count}} archivo(s) restaurado(s).",
  "Conversation rewound. Edit your prompt and press Enter to continue.":
    "Conversación rebobinada. Edita tu prompt y pulsa Enter para seguir.",
  "Rewinding does not affect files edited manually or via shell commands.":
    "Rebobinar no afecta a los archivos editados a mano ni con comandos del shell.",
  "Cannot rewind to a turn that was compressed. Try a more recent turn.":
    "No se puede rebobinar a un turno que se comprimió. Prueba con uno más reciente.",
  "(+{{insertions}} -{{deletions}} in {{count}} file)":
    "(+{{insertions}} -{{deletions}} en {{count}} archivo)",
  "(+{{insertions}} -{{deletions}} in {{count}} files)":
    "(+{{insertions}} -{{deletions}} en {{count}} archivos)",
  "Cannot restore files: this turn was created before file checkpointing was enabled.":
    "No se pueden restaurar los archivos: este turno es anterior a que se activaran los puntos de control.",
  "↑↓ to navigate · Enter to select · Esc to go back":
    "↑↓ para moverse · Enter para elegir · Esc para volver",
  "Enter/Y to confirm · Esc/N to go back":
    "Enter/Y para confirmar · Esc/N para volver",

  /* ---- temas ---- */
  "change the theme": "cambiar el tema",
  "Select Theme": "Elegir tema",
  Preview: "Vista previa",
  "(Use Enter to select, Tab to configure scope)":
    "(Usa Enter para elegir y Tab para configurar el ámbito)",
  "(Use Enter to apply scope, Tab to go back)":
    "(Usa Enter para aplicar el ámbito y Tab para volver)",
  "Theme configuration unavailable due to NO_COLOR env variable.":
    "No se puede configurar el tema porque está la variable de entorno NO_COLOR.",
  "Theme \"{{themeName}}\" not found.": "No se encontró el tema «{{themeName}}».",
  "Theme \"{{themeName}}\" not found in selected scope.":
    "No se encontró el tema «{{themeName}}» en el ámbito elegido.",

  /* ---- compresión y copia ---- */
  "Clear conversation history and free up context":
    "Borrar el historial de la conversación y liberar contexto",
  "Compresses the context by replacing it with a summary.":
    "Comprime el contexto sustituyéndolo por un resumen.",
  "open full jpcode documentation in your browser":
    "abrir toda la documentación de jpcode en el navegador",
  "Configuration not available.": "Configuración no disponible.",
  "Connect an LLM provider": "Conectar un proveedor de modelos",
  "Copy to clipboard: reply, code (by lang), LaTeX, or Mermaid. N = Nth-latest message, index = block number":
    "Copiar al portapapeles: respuesta, código (por lenguaje), LaTeX o Mermaid. N = mensaje n-ésimo más reciente, índice = número de bloque",
  "{{count}} file changed, +{{added}} / -{{removed}}":
    "{{count}} archivo cambiado, +{{added}} / -{{removed}}",
  "{{count}} files changed, +{{added}} / -{{removed}}":
    "{{count}} archivos cambiados, +{{added}} / -{{removed}}",
  "{{count}} file changed": "{{count}} archivo cambiado",
  "{{count}} files changed": "{{count}} archivos cambiados",
  "…and {{hidden}} more (showing first {{shown}})":
    "…y {{hidden}} más (enseñando los primeros {{shown}})",
  "(binary)": "(binario)",
  "(binary, new)": "(binario, nuevo)",
  "(new)": "(nuevo)",
  "(new, partial)": "(nuevo, parcial)",
  "(deleted)": "(borrado)",
  "(binary, deleted)": "(binario, borrado)",

  /* ---- subagentes y /learn ---- */
  "Manage subagents for specialized task delegation.":
    "Gestiona subagentes para repartir tareas especializadas.",
  "Manage existing subagents (view, edit, delete).":
    "Gestiona los subagentes que ya hay (ver, editar, borrar).",
  "Create a new subagent with guided setup.":
    "Crea un subagente nuevo con una guía paso a paso.",
  "Create a reusable skill from a knowledge source (file, URL, conversation, or text).":
    "Crea una habilidad reutilizable a partir de una fuente (archivo, URL, conversación o texto).",
  "The current model or provider does not support native video input for /learn. Switch to a video-capable model on an OpenAI-compatible provider and try again.":
    "El modelo o proveedor actual no admite vídeo nativo para /learn. Cambia a un modelo que sí lo admita en un proveedor compatible con OpenAI e inténtalo otra vez.",
  "YouTube page URLs cannot be sent as native video input. Download the video into your workspace and pass the local video file path to /learn.":
    "Las URLs de páginas de YouTube no se pueden enviar como vídeo nativo. Descarga el vídeo a tu espacio de trabajo y pásale a /learn la ruta del archivo local.",
  "The local video could not be attached for /learn.":
    "No se pudo adjuntar el vídeo local para /learn.",
  Agents: "Agentes",
  "Choose Action": "Elegir acción",
  "Edit {{name}}": "Editar {{name}}",
  "Edit Tools: {{name}}": "Editar herramientas: {{name}}",
  "Edit Color: {{name}}": "Editar color: {{name}}",
  "Delete {{name}}": "Borrar {{name}}",
  "Unknown Step": "Paso desconocido",
  "Esc to close": "Esc para cerrar",
  Transcript: "Transcripción",

  /* ---- las líneas que resume la herramienta ---- */
  "Read {{count}} file": "Leyó {{count}} archivo",
  "Read {{count}} files": "Leyó {{count}} archivos",
  "Reading {{count}} file": "Leyendo {{count}} archivo",
  "Reading {{count}} files": "Leyendo {{count}} archivos",
  "Edited {{count}} file": "Editó {{count}} archivo",
  "Edited {{count}} files": "Editó {{count}} archivos",
  "Editing {{count}} file": "Editando {{count}} archivo",
  "Editing {{count}} files": "Editando {{count}} archivos",
  "Wrote {{count}} file": "Escribió {{count}} archivo",
  "Wrote {{count}} files": "Escribió {{count}} archivos",
  "Writing {{count}} file": "Escribiendo {{count}} archivo",
  "Writing {{count}} files": "Escribiendo {{count}} archivos",
  "Searched {{count}} pattern": "Buscó {{count}} patrón",
  "Searched {{count}} patterns": "Buscó {{count}} patrones",
  "Searching {{count}} pattern": "Buscando {{count}} patrón",
  "Searching {{count}} patterns": "Buscando {{count}} patrones",
  "Listed {{count}} directory": "Listó {{count}} directorio",
  "Listed {{count}} directories": "Listó {{count}} directorios",
  "Listing {{count}} directory": "Listando {{count}} directorio",
  "Listing {{count}} directories": "Listando {{count}} directorios",
  "Ran {{count}} command": "Ejecutó {{count}} comando",
  "Ran {{count}} commands": "Ejecutó {{count}} comandos",
  "Running {{count}} command": "Ejecutando {{count}} comando",
  "Running {{count}} commands": "Ejecutando {{count}} comandos",
  "Ran {{count}} agent": "Ejecutó {{count}} agente",
  "Ran {{count}} agents": "Ejecutó {{count}} agentes",
  "Running {{count}} agent": "Ejecutando {{count}} agente",
  "Running {{count}} agents": "Ejecutando {{count}} agentes",
  "Used {{count}} tool": "Usó {{count}} herramienta",
  "Used {{count}} tools": "Usó {{count}} herramientas",
  "Using {{count}} tool": "Usando {{count}} herramienta",
  "Using {{count}} tools": "Usando {{count}} herramientas",
  "Enter to select, ↑↓ to navigate, Esc to close":
    "Enter para elegir, ↑↓ para moverse, Esc para cerrar",
  "Esc to go back": "Esc para volver",
  "Enter to submit, Esc to go back": "Enter para enviar, Esc para volver",
  "Invalid step: {{step}}": "Paso no válido: {{step}}",
  "Use '/agents create' to create your first subagent.":
    "Usa '/agents create' para crear tu primer subagente.",

  /* ---- subagentes ---- */
  "(built-in)": "(integrado)",
  "(overridden by project level agent)": "(sustituido por el agente de nivel de proyecto)",
  "Project Level ({{path}})": "Nivel de proyecto ({{path}})",
  "User Level ({{path}})": "Nivel de usuario ({{path}})",
  "Built-in Agents": "Agentes integrados",
  "Extension Agents": "Agentes de extensiones",
  "Using: {{count}} agents": "En uso: {{count}} agentes",
  "View Agent": "Ver agente",
  "Edit Agent": "Editar agente",
  "Delete Agent": "Borrar agente",
  Back: "Volver",
  "File Path: ": "Ruta del archivo: ",
  "Tools: ": "Herramientas: ",
  "Color: ": "Color: ",
  "Description:": "Descripción:",
  "System Prompt:": "Prompt del sistema:",
  "Open in editor": "Abrir en el editor",
  "Edit tools": "Editar herramientas",
  "Edit color": "Editar el color",
  "Are you sure you want to delete agent \"{{name}}\"?":
    "¿Seguro que quieres borrar el agente «{{name}}»?",
  "Project Level (.qwen/agents/)": "Nivel de proyecto (.jpcode/agents/)",
  "User Level (~/.qwen/agents/)": "Nivel de usuario (~/.jpcode/agents/)",
  "✓ Subagent Created Successfully!": "✓ ¡Subagente creado correctamente!",
  "Subagent \"{{name}}\" has been saved to {{level}} level.":
    "El subagente «{{name}}» se ha guardado en el nivel {{level}}.",
  "Name: ": "Nombre: ",
  "Location: ": "Ubicación: ",
  "Warnings:": "Avisos:",
  "Name \"{{name}}\" already exists at {{level}} level - will overwrite existing subagent":
    "El nombre «{{name}}» ya existe en el nivel {{level}}: se sobrescribirá el subagente que había",
  "Name \"{{name}}\" exists at user level - project level will take precedence":
    "El nombre «{{name}}» existe en el nivel de usuario: tendrá prioridad el de proyecto",
  "Name \"{{name}}\" exists at project level - existing subagent will take precedence":
    "El nombre «{{name}}» existe en el nivel de proyecto: tendrá prioridad el subagente que ya había",
  "Description is over {{length}} characters":
    "La descripción pasa de {{length}} caracteres",
  "System prompt is over {{length}} characters":
    "El prompt del sistema pasa de {{length}} caracteres",
  "Step {{n}}: Choose Location": "Paso {{n}}: elige la ubicación",
  "Step {{n}}: Choose Generation Method": "Paso {{n}}: elige cómo generarlo",
  "Generate with jpcode (Recommended)": "Generar con jpcode (recomendado)",
  "Manual Creation": "Crear a mano",
  "Describe what this subagent should do and when it should be used. (Be comprehensive for best results)":
    "Describe qué debe hacer este subagente y cuándo se debe usar. (Sé exhaustivo para sacarle partido)",
  "e.g., Expert code reviewer that reviews code based on best practices...":
    "p. ej. Revisor de código experto que revisa siguiendo las buenas prácticas...",
  "Generating subagent configuration...":
    "Generando la configuración del subagente...",
  "Step {{n}}: Describe Your Subagent": "Paso {{n}}: describe tu subagente",
  "Step {{n}}: Enter Subagent Name": "Paso {{n}}: escribe el nombre del subagente",
  "Step {{n}}: Enter System Prompt": "Paso {{n}}: escribe el prompt del sistema",
  "Step {{n}}: Enter Description": "Paso {{n}}: escribe la descripción",
  "Step {{n}}: Select Tools": "Paso {{n}}: elige las herramientas",
  "All Tools (Default)": "Todas las herramientas (por defecto)",
  "All Tools": "Todas las herramientas",
  "Read-only Tools": "Herramientas de solo lectura",
  "Read & Edit Tools": "Herramientas de lectura y edición",
  "Read & Edit & Execution Tools": "Herramientas de lectura, edición y ejecución",
  "All tools selected, including MCP tools":
    "Todas las herramientas elegidas, incluidas las de MCP",
  "Selected tools:": "Herramientas elegidas:",
  "Read-only tools:": "Herramientas de solo lectura:",
  "Edit tools:": "Herramientas de edición:",
  "Execution tools:": "Herramientas de ejecución:",
  "Step {{n}}: Choose Background Color": "Paso {{n}}: elige el color de fondo",
  "Step {{n}}: Confirm and Save": "Paso {{n}}: confirma y guarda",
  "Press Enter to save, e to save and edit, Esc to go back":
    "Pulsa Enter para guardar, e para guardar y editar, Esc para volver",
  "Press Enter to continue, {{navigation}}Esc to {{action}}":
    "Pulsa Enter para seguir, {{navigation}}Esc para {{action}}",
  cancel: "cancelar",
  "go back": "volver",
  "↑↓ to navigate, ": "↑↓ para moverse, ",
  "Enter a clear, unique name for this subagent.":
    "Escribe un nombre claro y único para este subagente.",
  "e.g., Code Reviewer": "p. ej. Revisor de código",
  "Name cannot be empty.": "El nombre no puede estar vacío.",
  "Write the system prompt that defines this subagent's behavior. Be comprehensive for best results.":
    "Escribe el prompt del sistema que define cómo se comporta este subagente. Sé exhaustivo para sacarle partido.",
  "e.g., You are an expert code reviewer...":
    "p. ej. Eres un revisor de código experto...",
  "System prompt cannot be empty.": "El prompt del sistema no puede estar vacío.",
  "Describe when and how this subagent should be used.":
    "Describe cuándo y cómo se debe usar este subagente.",
  "e.g., Reviews code for best practices and potential bugs.":
    "p. ej. Revisa el código buscando buenas prácticas y posibles errores.",
  "Description cannot be empty.": "La descripción no puede estar vacía.",

  /* ---- extensiones ---- */
  "Manage Extensions": "Gestionar extensiones",
  "Extension Details": "Detalles de la extensión",
  "View Extension": "Ver la extensión",
  "Update Extension": "Actualizar la extensión",
  "Disable Extension": "Desactivar la extensión",
  "Enable Extension": "Activar la extensión",
  "Uninstall Extension": "Desinstalar la extensión",
  "Select Scope": "Elige el ámbito",
  "User Scope": "Ámbito de usuario",
  "Workspace Scope": "Ámbito del espacio de trabajo",
  "Updating...": "Actualizando...",
  Unknown: "Desconocido",
  "Stopped because": "Se paró porque",
  "Version:": "Versión:",
  "Status:": "Estado:",
  "Are you sure you want to uninstall extension \"{{name}}\"?":
    "¿Seguro que quieres desinstalar la extensión «{{name}}»?",
  "This action cannot be undone.": "Esta acción no se puede deshacer.",
  "Extension \"{{name}}\" updated successfully.":
    "Extensión «{{name}}» actualizada correctamente.",
  "Name:": "Nombre:",
  "MCP Servers:": "Servidores MCP:",
  "Settings:": "Ajustes:",
  active: "activa",
  disabled: "desactivada",
  enabled: "activada",
  "disabled (bare mode)": "desactivada (modo desvestido)",
  "disabled (safe mode)": "desactivada (modo seguro)",
  "disabled (disableAllHooks)": "desactivada (disableAllHooks)",
  "disabled (turned off for this session)":
    "desactivada (apagada para esta sesión)",
  "View Details": "Ver los detalles",
  "Update failed:": "Falló la actualización:",
  "Updating {{name}}...": "Actualizando {{name}}...",
  "Update complete!": "¡Actualización terminada!",
  "User (global)": "Usuario (global)",
  "Workspace (project-specific)": "Espacio de trabajo (del proyecto)",
  "Disable \"{{name}}\" - Select Scope": "Desactivar «{{name}}»: elige el ámbito",
  "Enable \"{{name}}\" - Select Scope": "Activar «{{name}}»: elige el ámbito",
  "No extension selected": "Ninguna extensión elegida",
  "{{count}} extensions installed": "{{count}} extensiones instaladas",
  "Use '/extensions install' to install your first extension.":
    "Usa '/extensions install' para instalar tu primera extensión.",
  "up to date": "al día",
  "update available": "hay actualización",
  "checking...": "comprobando...",
  "not updatable": "no actualizable",

  /* ---- ajustes ---- */
  "View and edit jpcode settings": "Ver y cambiar los ajustes de jpcode",
  Settings: "Ajustes",
  "To see changes, jpcode must be restarted. Press r to exit and apply changes now.":
    "Para que se vean los cambios hay que reiniciar jpcode. Pulsa r para salir y aplicarlos ya.",
  "Code Mode Only (Experimental)": "Solo modo código (experimental)",
  "Vim Mode": "Modo vim",
  "Attribution: commit": "Atribución: commit",
  "Terminal Bell Notification": "Aviso con la campana del terminal",
  "Enable Usage Statistics": "Activar las estadísticas de uso",
  Theme: "Tema",
  "Preferred Editor": "Editor preferido",
  "Auto-connect to IDE": "Conectar con el IDE automáticamente",
  "Debug Keystroke Logging": "Registro de teclas para depurar",
  "Language: UI": "Idioma de la interfaz",
  "Language: Model": "Idioma del modelo",
  "Output Format": "Formato de salida",
  "Hide Window Title": "Ocultar el título de la ventana",
  "Show Status in Title": "Mostrar el estado en el título",
  "Hide Tips": "Ocultar los consejos",
  "Show Line Numbers in Code": "Mostrar números de línea en el código",
  "Show Citations": "Mostrar las citas",
  "Custom Witty Phrases": "Frases ingeniosas a medida",
  "Show Welcome Back Dialog": "Mostrar el diálogo de bienvenida",
  "Enable User Feedback": "Activar los comentarios de quien usa",
  "How is Qwen doing this session? (optional)":
    "¿Cómo está rindiendo Qwen en esta sesión? (opcional)",
  Bad: "Mal",
  Fine: "Normal",
  Good: "Bien",
  Dismiss: "Descartar",
  "Screen Reader Mode": "Modo lector de pantalla",
  "Max Session Turns": "Máximo de turnos por sesión",
  "Skip Next Speaker Check": "Saltar la comprobación del siguiente hablante",
  "Skip Loop Detection": "Saltar la detección de bucles",
  "Skip Startup Context": "Saltar el contexto de arranque",
  "Enable OpenAI Logging": "Activar el registro de OpenAI",
  "OpenAI Logging Directory": "Directorio del registro de OpenAI",
  Timeout: "Tiempo de espera",
  "Max Retries": "Máximo de reintentos",
  "Load Memory From Include Directories":
    "Cargar la memoria de los directorios incluidos",
  "Respect .gitignore": "Respetar .gitignore",
  "Respect .qwenignore": "Respetar .jpcodeignore",
  "Enable Recursive File Search": "Activar la búsqueda recursiva de archivos",
  "Interactive Shell (PTY)": "Shell interactivo (PTY)",
  "Show Color": "Mostrar el color",
  "Auto Accept": "Aceptar solo",
  "Use Ripgrep": "Usar ripgrep",
  "Use Builtin Ripgrep": "Usar el ripgrep propio",
  Unset: "Sin fijar",
  "Auto (detect from system)": "Auto (detectar del sistema)",
  "Auto (follow user input)": "Auto (seguir lo que escribas)",
  "Auto (detect terminal theme)": "Auto (detectar el tema del terminal)",
  Auto: "Auto",
  Text: "Texto",
  JSON: "JSON",
  Plan: "Plan",
  "Auto Edit": "Edición automática",
  YOLO: "YOLO",

  /* ---- vim ---- */
  "toggle vim mode on/off": "activar o desactivar el modo vim",

  /* ---- /stats ---- */
  "Show usage statistics dashboard.": "Muestra el panel de estadísticas de uso.",
  "Show model-specific usage statistics.":
    "Muestra las estadísticas de uso por modelo.",
  "Show tool-specific usage statistics.":
    "Muestra las estadísticas de uso por herramienta.",
  "Show skill-specific usage statistics.":
    "Muestra las estadísticas de uso por habilidad.",
  "Show daily token usage statistics.":
    "Muestra las estadísticas de uso de tokens por día.",
  "Show monthly token usage statistics.":
    "Muestra las estadísticas de uso de tokens por mes.",
  "Export token usage statistics to CSV or JSON.":
    "Exporta las estadísticas de uso de tokens a CSV o JSON.",
  "No usage data.": "No hay datos de uso.",
  "{{label}}: {{tokens}} tokens ({{requests}} requests)":
    "{{label}}: {{tokens}} tokens ({{requests}} peticiones)",
  "Daily token usage for {{value}}": "Uso diario de tokens de {{value}}",
  "Monthly token usage for {{value}}": "Uso mensual de tokens de {{value}}",
  "Total: {{tokens}} tokens": "Total: {{tokens}} tokens",
  "Requests: {{requests}}": "Peticiones: {{requests}}",
  "Breakdown:": "Desglose:",
  "Input: {{tokens}}": "Entrada: {{tokens}}",
  "Output: {{tokens}}": "Salida: {{tokens}}",
  "Cached (included in Input): {{tokens}}":
    "En caché (incluido en la entrada): {{tokens}}",
  "Thoughts: {{tokens}}": "Razonamientos: {{tokens}}",
  "By model:": "Por modelo:",
  "By auth type:": "Por tipo de autenticación:",
  "By model/auth type:": "Por modelo/tipo de autenticación:",
  "By source:": "Por origen:",
  "Failed to load token usage stats: {{error}}":
    "No se pudieron cargar las estadísticas de uso de tokens: {{error}}",
  "Expected --format csv or --format json.":
    "Se esperaba --format csv o --format json.",
  "Expected a file path after --output.":
    "Se esperaba una ruta de archivo después de --output.",
  "Unexpected argument: {{argument}}": "Argumento inesperado: {{argument}}",
  "Usage: /stats export <daily|monthly> [YYYY-MM-DD|YYYY-MM] [--format csv|json] [--output path]":
    "Uso: /stats export <daily|monthly> [YYYY-MM-DD|YYYY-MM] [--format csv|json] [--output path]",
  "Token usage export path must be within the project working directory.":
    "La ruta de exportación debe estar dentro del directorio de trabajo del proyecto.",
  "Export target does not exist: {{path}}":
    "El destino de la exportación no existe: {{path}}",
  "Cannot resolve export path within the working directory.":
    "No se pudo resolver la ruta de exportación dentro del directorio de trabajo.",
  "Could not create a temporary export file.":
    "No se pudo crear el archivo temporal de exportación.",
  "Token usage exported to {{format}}: {{path}}":
    "Uso de tokens exportado a {{format}}: {{path}}",
  "Failed to export token usage stats: {{error}}":
    "No se pudieron exportar las estadísticas de uso de tokens: {{error}}",
  "Unclosed quote in arguments.": "Comilla sin cerrar en los argumentos.",
  "Note: generation timing (TTFT/TPS) belongs to generation metrics.":
    "Nota: los tiempos de generación (TTFT/TPS) están en las métricas de generación.",

  /* ---- comandos ---- */
  "exit the cli": "salir del cli",
  "Manage workspace directories": "Gestionar los directorios del espacio de trabajo",
  "Add directories to the workspace. Use comma to separate multiple paths":
    "Añade directorios al espacio de trabajo. Separa varias rutas con comas",
  "Show all directories in the workspace":
    "Muestra todos los directorios del espacio de trabajo",
  "set external editor preference": "elegir el editor externo",
  "Select Editor": "Elegir editor",
  "Editor Preference": "Editor preferido",
  "These editors are currently supported. Please note that some editors cannot be used in sandbox mode.":
    "Estos son los editores admitidos. Ojo: algunos no se pueden usar en modo sandbox.",
  "Your preferred editor is:": "Tu editor preferido es:",
  "Manage extensions": "Gestionar extensiones",
  "Manage installed extensions": "Gestionar las extensiones instaladas",
  "Disable an extension": "Desactivar una extensión",
  "Enable an extension": "Activar una extensión",
  "Install an extension from a git repo or local path":
    "Instalar una extensión desde un repositorio git o una ruta local",
  "Uninstall an extension": "Desinstalar una extensión",
  "Extension \"{{name}}\" not found.": "No se encontró la extensión «{{name}}».",
  "Enter to select, ↑↓ to navigate, Esc to go back":
    "Enter para elegir, ↑↓ para moverse, Esc para volver",

  /* ---- /extensions install ---- */
  "The scope to install the extension in: \"user\" (global, default) or \"project\" (current workspace only).":
    "Ámbito en el que instalar la extensión: \"user\" (global, por defecto) o \"project\" (solo el espacio de trabajo actual).",
  "Extension \"{{name}}\" installed successfully and enabled for the current workspace.":
    "Extensión «{{name}}» instalada y activada para el espacio de trabajo actual.",
  "Marketplace \"{{name}}\" not found.": "No se encontró el mercado «{{name}}».",
  "Adds a marketplace source (Claude format).":
    "Añade un origen de mercados (formato de Claude).",
  "The marketplace source to add: owner/repo (GitHub), a git or https URL, or a local path.":
    "El origen de mercados que añadir: dueño/repo (GitHub), una URL de git o https, o una ruta local.",
  "Removes a marketplace source.": "Quita un origen de mercados.",
  "The name of the marketplace to remove.":
    "El nombre del mercado que quitar.",
  "Lists configured marketplace sources.":
    "Lista los orígenes de mercados configurados.",
  "Re-fetches a marketplace source and its plugin listing.":
    "Vuelve a pedir un origen de mercados y su lista de plugins.",
  "The name of the marketplace to update.":
    "El nombre del mercado que actualizar.",
  "Manage marketplace sources for discovering extensions.":
    "Gestiona los orígenes de mercados para descubrir extensiones.",
  "You need at least one command before continuing.":
    "Necesitas al menos un comando para seguir.",
  "Usage: /extensions install <source>":
    "Uso: /extensions install <origen>",
  "Installing extension from \"{{source}}\"...":
    "Instalando la extensión de «{{source}}»...",
  "Extension \"{{name}}\" installed successfully.":
    "Extensión «{{name}}» instalada correctamente.",
  "Do you want to continue? [Y/n]: ": "¿Quieres continuar? [Y/n]: ",
  "Do you want to continue?": "¿Quieres continuar?",
  "Installing extension \"{{name}}\".":
    "Instalando la extensión «{{name}}».",
  "This extension will run the following MCP servers:":
    "Esta extensión ejecutará estos servidores MCP:",
  local: "local",
  remote: "remoto",
  "This extension will add the following commands: {{commands}}.":
    "Esta extensión añadirá estos comandos: {{commands}}.",
  "This extension will append info to your QWEN.md context using {{fileName}}":
    "Esta extensión añadirá información a tu contexto QWEN.md con {{fileName}}",
  "This extension will install the following skills:":
    "Esta extensión instalará estas habilidades:",
  "This extension will install the following subagents:":
    "Esta extensión instalará estos subagentes:",
  "This extension will install the following workflows (JavaScript scripts that can start subagents):":
    "Esta extensión instalará estos flujos (scripts de JavaScript que pueden arrancar subagentes):",
  "These workflow scripts changed since the installed version: {{names}}.":
    "Estos scripts de flujo cambiaron desde la versión instalada: {{names}}.",
  "Installation cancelled for \"{{name}}\".":
    "Instalación cancelada para «{{name}}».",
  "You are installing an extension from {{originSource}}. Some features may not work perfectly with jpcode.":
    "Estás instalando una extensión de {{originSource}}. Puede que algunas cosas no funcionen del todo bien con jpcode.",
  "--ref and --auto-update are not applicable for marketplace extensions.":
    "--ref y --auto-update no se aplican a las extensiones de mercado.",
  "Extension \"{{name}}\" installed successfully and enabled.":
    "Extensión «{{name}}» instalada y activada correctamente.",
  "The github URL, local path, or marketplace source (marketplace-url:plugin-name) of the extension to install.":
    "La URL de GitHub, la ruta local o el origen de mercado (marketplace-url:nombre-plugin) de la extensión a instalar.",
  "The git ref to install from.": "La ref de git desde la que instalar.",
  "--registry is only applicable for npm extensions.":
    "--registry solo se aplica a las extensiones de npm.",
  "Custom npm registry URL (only for npm extensions).":
    "URL personalizada del registro de npm (solo para extensiones de npm).",
  "--ref is not applicable for npm extensions. Use @version suffix instead (e.g. @scope/package@1.2.0).":
    "--ref no se aplica a las extensiones de npm. Usa en su lugar el sufijo @versión (p. ej. @scope/paquete@1.2.0).",
  "Installs an extension from a git repository URL, local path, scoped npm package (@scope/name), or claude marketplace (marketplace-url:plugin-name).":
    "Instala una extensión desde una URL de repositorio git, una ruta local, un paquete npm con ámbito (@scope/nombre) o un mercado de Claude (marketplace-url:nombre-plugin).",

  /* ---- /extensions ---- */
  Description: "Descripción",
  "Delete Session": "Borrar sesión",
  "Enable auto-update for this extension.":
    "Activar la actualización automática de esta extensión.",
  "Enable pre-release versions for this extension.":
    "Activar las versiones preliminares de esta extensión.",
  "Acknowledge the security risks of installing an extension and skip the confirmation prompt.":
    "Aceptar los riesgos de seguridad de instalar una extensión y saltarse la confirmación.",
  "The source argument must be provided.":
    "Hay que pasar el argumento del origen.",
  "Extension \"{{name}}\" successfully uninstalled.":
    "Extensión «{{name}}» desinstalada correctamente.",
  "Uninstalls an extension.": "Desinstala una extensión.",
  "The name or source path of the extension to uninstall.":
    "El nombre o la ruta de origen de la extensión a desinstalar.",
  "Please include the name of the extension to uninstall as a positional argument.":
    "Incluye el nombre de la extensión a desinstalar como argumento posicional.",
  "Enables an extension.": "Activa una extensión.",
  "The name of the extension to enable.":
    "El nombre de la extensión a activar.",
  "The scope to enable the extension in. If not set, will be enabled in all scopes.":
    "Ámbito en el que activar la extensión. Si no se pone, se activa en todos.",
  "Extension \"{{name}}\" successfully enabled for scope \"{{scope}}\".":
    "Extensión «{{name}}» activada correctamente en el ámbito «{{scope}}».",
  "Extension \"{{name}}\" successfully enabled in all scopes.":
    "Extensión «{{name}}» activada correctamente en todos los ámbitos.",
  "Invalid scope: {{scope}}. Please use one of {{scopes}}.":
    "Ámbito no válido: {{scope}}. Usa uno de {{scopes}}.",
  "Disables an extension.": "Desactiva una extensión.",
  "The name of the extension to disable.":
    "El nombre de la extensión a desactivar.",
  "The scope to disable the extension in.":
    "Ámbito en el que desactivar la extensión.",
  "Extension \"{{name}}\" successfully disabled for scope \"{{scope}}\".":
    "Extensión «{{name}}» desactivada correctamente en el ámbito «{{scope}}».",
  "Extension \"{{name}}\" successfully updated: {{oldVersion}} → {{newVersion}}.":
    "Extensión «{{name}}» actualizada correctamente: {{oldVersion}} → {{newVersion}}.",
  "Unable to install extension \"{{name}}\" due to missing install metadata":
    "No se puede instalar la extensión «{{name}}» porque faltan los datos de instalación",
  "Extension \"{{name}}\" is already up to date.":
    "La extensión «{{name}}» ya está al día.",
  "Updates all extensions or a named extension to the latest version.":
    "Actualiza todas las extensiones, o una en concreto, a la última versión.",
  "Update all extensions.": "Actualiza todas las extensiones.",
  "The name of the extension to update.":
    "El nombre de la extensión a actualizar.",
  "Either an extension name or --all must be provided":
    "Hay que pasar un nombre de extensión o --all",
  "List installed extensions": "Listar las extensiones instaladas",
  "Lists installed extensions.": "Lista las extensiones instaladas.",
  "Path:": "Ruta:",
  "Source:": "Origen:",
  "Type:": "Tipo:",
  "Ref:": "Ref:",
  "Release tag:": "Etiqueta de la versión:",
  "Enabled (User):": "Activada (usuario):",
  "Enabled (Workspace):": "Activada (espacio de trabajo):",
  "Context files:": "Archivos de contexto:",
  "Skills:": "Habilidades:",
  "Agents:": "Agentes:",
  "Workflows:": "Flujos:",
  "MCP servers:": "Servidores MCP:",
  "Extension \"{{name}}\" linked successfully and enabled.":
    "Extensión «{{name}}» enlazada y activada correctamente.",
  "Links an extension from a local path. Updates made to the local path will always be reflected.":
    "Enlaza una extensión desde una ruta local. Los cambios que hagas en esa ruta se verá siempre reflejados.",
  "The name of the extension to link.": "El nombre de la extensión a enlazar.",
  "Set a specific setting for an extension.":
    "Cambia un ajuste concreto de una extensión.",
  "Name of the extension to configure.":
    "Nombre de la extensión a configurar.",
  "The setting to configure (name or env var).":
    "El ajuste a cambiar (nombre o variable de entorno).",
  "The scope to set the setting in.":
    "Ámbito en el que poner el ajuste.",
  "List all settings for an extension.":
    "Lista todos los ajustes de una extensión.",
  "Name of the extension.": "Nombre de la extensión.",
  "Settings for \"{{name}}\":": "Ajustes de «{{name}}»:",
  "(workspace)": "(espacio de trabajo)",
  "(user)": "(usuario)",
  "[not set]": "[sin fijar]",
  "[value stored in keychain]": "[valor guardado en el llavero]",
  "Value:": "Valor:",
  "Manage extension settings": "Gestionar los ajustes de las extensiones",
  "Manage extension settings.": "Gestiona los ajustes de las extensiones.",
  "You need to specify a command (set or list).":
    "Tienes que indicar un comando (set o list).",
  "Select a plugin to install from marketplace \"{{name}}\":":
    "Elige el plugin que instalar del mercado «{{name}}»:",
  "Plugin selection cancelled.": "Selección de plugin cancelada.",
  "Select a plugin from \"{{name}}\"": "Elige un plugin de «{{name}}»",
  "Use ↑↓ or j/k to navigate, Enter to select, Escape to cancel":
    "Usa ↑↓ o j/k para moverte, Enter para elegir, Escape para cancelar",
  "{{count}} more above": "{{count}} más arriba",
  "{{count}} more below": "{{count}} más abajo",

  /* ---- IDE y terminal ---- */
  "manage IDE integration": "gestionar la integración con el IDE",
  "check status of IDE integration":
    "comprobar el estado de la integración con el IDE",
  "install required IDE companion for {{ideName}}":
    "instalar el complemento de IDE que necesita {{ideName}}",
  "enable IDE integration": "activar la integración con el IDE",
  "disable IDE integration": "desactivar la integración con el IDE",
  "IDE integration is not supported in your current environment. To use this feature, run jpcode in one of these supported IDEs: VS Code or VS Code forks.":
    "La integración con el IDE no funciona en tu entorno actual. Para usarla, ejecuta jpcode desde uno de estos IDE: VS Code o sus derivados.",
  "Set up GitHub Actions": "Configurar GitHub Actions",
  "Configure terminal keybindings for multiline input (VS Code, Cursor, Windsurf, Trae)":
    "Configurar los atajos del terminal para la entrada multilínea (VS Code, Cursor, Windsurf, Trae)",
  "Please restart your terminal for the changes to take effect.":
    "Reinicia el terminal para que los cambios surtan efecto.",
  "Could not determine {{terminalName}} config path on Windows: APPDATA environment variable is not set.":
    "No se pudo determinar la ruta de configuración de {{terminalName}} en Windows: no está la variable de entorno APPDATA.",
  "{{terminalName}} keybindings.json exists but is not a valid JSON array. Please fix the file manually or delete it to allow automatic configuration.":
    "El keybindings.json de {{terminalName}} existe pero no es un array JSON válido. Arregla el fichero a mano o bórralo para poder configurarlo automáticamente.",
  "File: {{file}}": "Fichero: {{file}}",
  "Shift+Enter binding already exists": "El atajo Shift+Enter ya existe",
  "Existing keybindings detected. Will not modify to avoid conflicts.":
    "Se han detectado atajos que ya existen. No se va a tocar nada para evitar conflictos.",
  "Please check and modify manually if needed: {{file}}":
    "Revísalo y cámbialo a mano si hace falta: {{file}}",
  "Modified: {{file}}": "Modificado: {{file}}",
  "{{terminalName}} keybindings already configured.":
    "Los atajos de {{terminalName}} ya estaban configurados.",

  /* ---- hooks ---- */
  "Manage jpcode hooks": "Gestionar los hooks de jpcode",
  "List all configured hooks": "Listar todos los hooks configurados",
  Hooks: "Hooks",
  "Press Escape to close": "Pulsa Escape para cerrar",
  "Press Space, Enter, or Escape to dismiss":
    "Pulsa Espacio, Enter o Escape para descartar",
  "{{count}} hook configured": "{{count}} hook configurado",
  "{{count}} hooks configured": "{{count}} hooks configurados",
  "This menu is read-only. To add or modify hooks, edit settings.json directly or ask jpcode.":
    "Este menú es de solo lectura. Para añadir o cambiar hooks, edita settings.json a mano o pídelo a jpcode.",
  "Reopen this menu to reload hook definitions.":
    "Vuelve a abrir este menú para recargar las definiciones de los hooks.",
  "Hook controls and HTTP security settings require a restart.":
    "Los controles de hooks y los ajustes de seguridad HTTP necesitan reiniciar.",
  "Exit codes:": "Códigos de salida:",
  "Configured hooks:": "Hooks configurados:",
  "To add hooks, edit settings.json directly or ask Qwen.":
    "Para añadir hooks, edita settings.json a mano o pídelo a Qwen.",
  "Enter to select · Esc to go back": "Enter para elegir · Esc para volver",
  "Hook details": "Detalles del hook",
  "Event:": "Evento:",
  "Extension:": "Extensión:",
  "Desc:": "Descripción:",
  "To modify or remove this hook, edit settings.json directly or ask Qwen to help.":
    "Para cambiar o quitar este hook, edita settings.json a mano o pide ayuda a Qwen.",
  "All hooks are disabled by the disableAllHooks setting.":
    "El ajuste disableAllHooks tiene todos los hooks desactivados.",
  "Timeout:": "Tiempo de espera:",
  "Status message:": "Mensaje de estado:",
  "Condition:": "Condición:",
  "Options:": "Opciones:",
  "Skill:": "Habilidad:",
  "runs in background": "se ejecuta en segundo plano",
  "runs once": "se ejecuta una vez",
  sequential: "secuencial",
  "Hook Configuration - Disabled": "Configuración de hooks: desactivada",
  "All hooks are currently disabled. You have {{count}} that are not running.":
    "Ahora mismo todos los hooks están desactivados. Tienes {{count}} que no se están ejecutando.",
  "{{count}} configured hook": "{{count}} hook configurado",
  "{{count}} configured hooks": "{{count}} hooks configurados",
  "When hooks are disabled:": "Con los hooks desactivados:",
  "StatusLine will not be displayed": "No se mostrará la StatusLine",
  "To re-enable hooks, remove \"disableAllHooks\" from settings.json or ask jpcode.":
    "Para volver a activarlos, quita \"disableAllHooks\" de settings.json o pídelo a jpcode.",
  Project: "Proyecto",
  User: "Usuario",
  Skill: "Habilidad",
  System: "Sistema",
  Extension: "Extensión",
  "Local Settings": "Ajustes locales",
  "User Settings": "Ajustes de usuario",
  "System Settings": "Ajustes del sistema",
  Extensions: "Extensiones",
  "Session (temporary)": "Sesión (temporal)",
  "Before tool execution": "Antes de ejecutar una herramienta",
  "After tool execution": "Después de ejecutar una herramienta",
  "After tool execution fails": "Cuando una herramienta falla",
  "When notifications are sent": "Cuando se envía una notificación",
  "When the user submits a prompt": "Cuando el usuario envía un prompt",
  "When a slash command expands into a prompt":
    "Cuando un comando con barra se expande en un prompt",
  "When a new session is started": "Cuando empieza una sesión nueva",
  "Right before jpcode concludes its response":
    "Justo antes de que jpcode termine su respuesta",
  "When a subagent (Agent tool call) is started":
    "Cuando arranca un subagente (llamada a la herramienta Agent)",
  "Right before a subagent concludes its response":
    "Justo antes de que un subagente termine su respuesta",
  "Before conversation compaction": "Antes de comprimir la conversación",
  "When a session is ending": "Cuando termina una sesión",
  "When a permission dialog is displayed": "Cuando se muestra un diálogo de permiso",
  "When a new todo item is created": "Cuando se crea una tarea nueva",
  "When a todo item is marked as completed":
    "Cuando se marca una tarea como completada",
  "Input to command is JSON of tool call arguments.":
    "La entrada del comando es el JSON con los argumentos de la llamada a la herramienta.",
  "Input to command is JSON with fields \"inputs\" (tool call arguments) and \"response\" (tool call response).":
    "La entrada del comando es un JSON con los campos \"inputs\" (argumentos de la llamada) y \"response\" (respuesta de la llamada).",
  "Input to command is JSON with tool_name, tool_input, tool_use_id, error, error_type, is_interrupt, and is_timeout.":
    "La entrada del comando es un JSON con tool_name, tool_input, tool_use_id, error, error_type, is_interrupt e is_timeout.",
  "Input to command is JSON with notification message and type.":
    "La entrada del comando es un JSON con el mensaje y el tipo de la notificación.",
  "Input to command is JSON with \"prompt\" (the current model-bound prompt) and optional \"submitted_prompt\" (the text projection captured at a supported submission boundary).":
    "La entrada del comando es un JSON con \"prompt\" (el prompt que lleva el modelo ahora) y opcionalmente \"submitted_prompt\" (el texto recogido al enviar).",
  "Input to command is JSON with command_name, command_args, and expanded prompt text.":
    "La entrada del comando es un JSON con command_name, command_args y el prompt expandido.",
  "Input to command is JSON with session start source.":
    "La entrada del comando es un JSON con el origen del inicio de sesión.",
  "Input to command is JSON with session end reason.":
    "La entrada del comando es un JSON con el motivo del fin de sesión.",
  "Input to command is JSON with agent_id and agent_type.":
    "La entrada del comando es un JSON con agent_id y agent_type.",
  "Input to command is JSON with agent_id, agent_type, and agent_transcript_path.":
    "La entrada del comando es un JSON con agent_id, agent_type y agent_transcript_path.",
  "Input to command is JSON with compaction details.":
    "La entrada del comando es un JSON con los detalles de la compresión.",
  "Input to command is JSON with tool_name, tool_input, and tool_use_id. Output JSON with hookSpecificOutput containing decision to allow or deny.":
    "La entrada del comando es un JSON con tool_name, tool_input y tool_use_id. La salida es un JSON con hookSpecificOutput y la decisión de permitir o denegar.",
  "Input to command is JSON with todo_id, todo_content, todo_status, all_todos, and phase. In validation, output JSON with decision (allow/block/deny) and reason. In postWrite, block/deny is ignored.":
    "La entrada del comando es un JSON con todo_id, todo_content, todo_status, all_todos y phase. En la validación, la salida es un JSON con decision (allow/block/deny) y reason. En postWrite se ignoran block y deny.",
  "Input to command is JSON with todo_id, todo_content, previous_status, all_todos, and phase. In validation, output JSON with decision (allow/block/deny) and reason. In postWrite, block/deny is ignored.":
    "La entrada del comando es un JSON con todo_id, todo_content, previous_status, all_todos y phase. En la validación, la salida es un JSON con decision (allow/block/deny) y reason. En postWrite se ignoran block y deny.",
  "stdout/stderr not shown": "stdout/stderr no se muestran",
  "show stderr to model and continue conversation":
    "muestra stderr al modelo y sigue con la conversación",
  "show stderr to user only": "muestra stderr solo a quien lo usa",
  "stdout shown in transcript mode (ctrl+o)":
    "stdout se muestra en modo transcripción (ctrl+o)",
  "show stderr to model immediately":
    "muestra stderr al modelo de inmediato",
  "show stderr to user only but continue with tool call":
    "muestra stderr solo a quien lo usa, y sigue con la llamada a la herramienta",
  "block processing, erase original prompt, and show stderr to user only":
    "bloquea el procesamiento, borra el prompt original y muestra stderr solo a quien lo usa",
  "block expanded prompt submission and show stderr to user only":
    "bloquea el envío del prompt expandido y muestra stderr solo a quien lo usa",
  "stdout shown to Qwen": "stdout se le enseña a Qwen",
  "show stderr to user only (blocking errors ignored)":
    "muestra stderr solo a quien lo usa (los errores bloqueantes se ignoran)",
  "command completes successfully": "el comando termina bien",
  "stdout shown to subagent": "stdout se le enseña al subagente",
  "show stderr to subagent and continue having it run":
    "muestra stderr al subagente y sigue corriendo",
  "stdout appended as custom compact instructions":
    "stdout se añade como instrucciones propias de compresión",
  "block compaction": "bloquea la compresión",
  "show stderr to user only but continue with compaction":
    "muestra stderr solo a quien lo usa, y sigue con la compresión",
  "use hook decision if provided":
    "usa la decisión del hook si la hay",
  "allow todo creation": "permite crear tareas",
  "block todo creation and show reason to model":
    "bloquea la creación de tareas y le enseña el motivo al modelo",
  "allow todo completion": "permite completar tareas",
  "block todo completion and show reason to model":
    "bloquea completar tareas y le enseña el motivo al modelo",
  "Config not loaded.": "Configuración no cargada.",
  "Hooks are not enabled. Enable hooks in settings to use this feature.":
    "Los hooks no están activados. Actívalos en los ajustes para usar esta función.",

  /* ---- exportar y bifurcar ---- */
  "Export current session message history to a file":
    "Exporta el historial de mensajes de esta sesión a un fichero",
  "Export session to HTML format": "Exporta la sesión a HTML",
  "Export session to JSON format": "Exporta la sesión a JSON",
  "Export session to JSONL format (one message per line)":
    "Exporta la sesión a JSONL (un mensaje por línea)",
  "Export session to markdown format": "Exporta la sesión a markdown",
  "generate personalized programming insights from your chat history":
    "genera recomendaciones de programación a partir de tu historial de chat",
  "Resume a previous session": "Retoma una sesión anterior",
  "Fork the current conversation into a new session":
    "Bifurca la conversación actual en una sesión nueva",
  "Spawn a background agent that inherits the full conversation":
    "Arranca un agente en segundo plano que hereda la conversación entera",
  "Please provide a directive. Usage: /fork <directive>":
    "Hay que dar una instrucción. Uso: /fork <instrucción>",
  "Cannot fork before the first conversation turn.":
    "No se puede bifurcar antes del primer turno de la conversación.",
  "Failed to launch fork: {{error}}": "No se pudo lanzar la bifurcación: {{error}}",
  "the background agent could not be started.":
    "no se pudo arrancar el agente en segundo plano.",
  "User launched a background fork via /fork: {{directive}}":
    "El usuario lanzó una bifurcación en segundo plano con /fork: {{directive}}",
  "Forked into a background agent. It inherits this conversation and runs without blocking — track it in the background tasks panel; it reports back when done.":
    "Bifurcado a un agente en segundo plano. Hereda esta conversación y corre sin bloquear: síguelo en el panel de tareas en segundo plano; avisa cuando termine.",
  "Cannot branch while a response or tool call is in progress. Wait for it to finish or resolve the pending tool call.":
    "No se puede ramificar mientras hay una respuesta o una llamada en marcha. Espera a que termine o resuelve la llamada pendiente.",

  /* ---- historial ---- */
  "Restore a tool call. This will reset the conversation and file history to the state it was in when the tool call was suggested":
    "Restaura una llamada a herramienta. Eso devuelve la conversación y el historial de archivos al estado en que estaban cuando se propuso la llamada",
  "Could not detect terminal type. Supported terminals: VS Code, Cursor, Windsurf, and Trae.":
    "No se pudo detectar el tipo de terminal. Terminales admitidas: VS Code, Cursor, Windsurf y Trae.",
  "Terminal \"{{terminal}}\" is not supported yet.":
    "La terminal «{{terminal}}» todavía no está admitida.",
  "Set history to collapse by default when resuming a session":
    "Plegar el historial por defecto al reanudar una sesión",
  "Expand the currently collapsed history transcript":
    "Despliega la transcripción del historial que está plegada",
  "Control history display preferences and visibility":
    "Controla cómo se ve el historial y si se ve",
  "History will be collapsed by default for future resumed sessions.":
    "El historial quedará plegado por defecto en las sesiones que se reanuden en adelante.",
  "History will be expanded by default for future resumed sessions.":
    "El historial quedará desplegado por defecto en las sesiones que se reanuden en adelante.",
  "History is already expanded in this session.":
    "En esta sesión el historial ya está desplegado.",
  "Usage: /history collapse-on-resume|expand-on-resume|expand-now":
    "Uso: /history collapse-on-resume|expand-on-resume|expand-now",
  "History collapsed: {{n}} messages hidden. Use /history expand-now to show.":
    "Historial plegado: {{n}} mensajes ocultos. Usa /history expand-now para enseñarlos.",

  /* ---- /language ---- */
  "Invalid language. Available: {{options}}":
    "Idioma no válido. Disponibles: {{options}}",
  "Language subcommands do not accept additional arguments.":
    "Los subcomandos de idioma no aceptan argumentos extra.",
  "Current UI language: {{lang}}": "Idioma actual de la interfaz: {{lang}}",
  "Current LLM output language: {{lang}}":
    "Idioma actual de salida del modelo: {{lang}}",
  "Set UI language": "Cambiar el idioma de la interfaz",
  "Set LLM output language": "Cambiar el idioma de salida del modelo",
  "Usage: /language ui [{{options}}]": "Uso: /language ui [{{options}}]",
  "Usage: /language output <language>": "Uso: /language output <idioma>",
  "Example: /language output 中文": "Ejemplo: /language output 中文",
  "Example: /language output English": "Ejemplo: /language output English",
  "Example: /language output 日本語": "Ejemplo: /language output 日本語",
  "UI language changed to {{lang}}": "Idioma de la interfaz cambiado a {{lang}}",
  "LLM output language set to {{lang}}":
    "Idioma de salida del modelo puesto a {{lang}}",
  "Please restart the application for the changes to take effect.":
    "Reinicia la aplicación para que los cambios surtan efecto.",
  "Invalid command. Available subcommands:": "Comando no válido. Subcomandos disponibles:",
  "Available subcommands:": "Subcomandos disponibles:",
  "To request additional UI language packs, please open an issue on GitHub.":
    "Para pedir más idiomas para la interfaz, abre una incidencia en GitHub.",
  "Available options:": "Opciones disponibles:",
  "Set UI language to {{name}}": "Idioma de la interfaz puesto a {{name}}",

  /* ---- modos ---- */
  "Analyze only, do not modify files or execute commands":
    "Solo analizar: no modificar archivos ni ejecutar comandos",
  "Require approval for file edits or shell commands":
    "Pedir aprobación para editar archivos o ejecutar comandos",
  "Automatically approve file edits": "Aprobar automáticamente las ediciones",
  "Automatically approve all tools": "Aprobar automáticamente todas las herramientas",

  /* ---- memoria automática ---- */
  "Apply To": "Aplicar a",
  "Workspace Settings": "Ajustes del espacio de trabajo",
  "Open auto-memory folder": "Abrir la carpeta de memoria automática",
  "Auto-memory: {{status}}": "Memoria automática: {{status}}",
  "Auto-dream: {{status}} · {{lastDream}} · /dream to run":
    "Auto-sueño: {{status}} · {{lastDream}} · /dream para ejecutarlo",
  "Auto-skill: {{status}}": "Auto-habilidad: {{status}}",
  never: "nunca",
  on: "activado",
  off: "desactivado",
  "Remove matching entries from managed auto-memory.":
    "Quita las entradas que coincidan de la memoria automática gestionada.",
  "Usage: /forget <memory text to remove>":
    "Uso: /forget <texto de la memoria a quitar>",
  "Consolidate managed auto-memory topic files.":
    "Consolida los ficheros de temas de la memoria automática gestionada.",

  /* ---- MCP ---- */
  "Import MCP servers from Claude configs":
    "Importa servidores MCP de la configuración de Claude",
  "Open MCP management dialog": "Abre el diálogo de gestión de MCP",
  "Re-discovering tools from '{{name}}'...":
    "Buscando otra vez las herramientas de «{{name}}»...",
  "Discovered {{count}} tool(s) from '{{name}}'.":
    "Se encontraron {{count}} herramienta(s) en «{{name}}».",
  "Manage MCP servers": "Gestionar los servidores MCP",
  "Server Detail": "Detalle del servidor",
  Tools: "Herramientas",
  "Unknown step": "Paso desconocido",
  "Esc to back": "Esc para volver",
  "↑↓ to navigate · Enter to select · Esc to close":
    "↑↓ para moverse · Enter para elegir · Esc para cerrar",
  "↑↓ to navigate · Enter to select · Esc to back":
    "↑↓ para moverse · Enter para elegir · Esc para volver",
  "↑↓ to navigate · Enter to confirm · Esc to back":
    "↑↓ para moverse · Enter para confirmar · Esc para volver",
  "User Settings (global)": "Ajustes de usuario (globales)",
  "Workspace Settings (project-specific)":
    "Ajustes del espacio de trabajo (del proyecto)",
  "Disable server:": "Desactivar el servidor:",
  "Select where to add the server to the exclude list:":
    "Elige dónde añadir el servidor a la lista de excluidos:",
  "View tools": "Ver las herramientas",
  "View resources": "Ver los recursos",
  Reconnect: "Volver a conectar",
  Enable: "Activar",
  Disable: "Desactivar",
  "Server:": "Servidor:",
  "Command:": "Comando:",
  prompts: "prompts",
  tool: "herramienta",
  tools: "herramientas",
  resource: "recurso",
  resources: "recursos",
  connected: "conectado",
  connecting: "conectando",
  disconnected: "desconectado",
  "User MCPs": "MCP de usuario",
  "Project MCPs": "MCP de proyecto",
  "Extension MCPs": "MCP de extensiones",
  server: "servidor",
  servers: "servidores",
  "Add MCP servers to your settings to get started.":
    "Añade servidores MCP a tus ajustes para empezar.",
  "Press c to copy the authorization URL to your clipboard.":
    "Pulsa c para copiar la URL de autorización al portapapeles.",
  "Copy request sent to your terminal. If paste is empty, copy the URL above manually.":
    "Se envió la petición de copia a tu terminal. Si el pegado sale vacío, copia la URL de arriba a mano.",
  "Cannot write to terminal — copy the URL above manually.":
    "No se puede escribir en el terminal: copia la URL de arriba a mano.",
  destructive: "destructiva",
  "read-only": "solo lectura",
  "open-world": "abierta al exterior",
  idempotent: "idempotente",
  "Tools for {{serverName}}": "Herramientas de {{serverName}}",
  required: "obligatorio",
  Parameters: "Parámetros",
  Server: "Servidor",
  "Resources for {{serverName}}": "Recursos de {{serverName}}",
  "Resource Detail": "Detalle del recurso",
  "URI:": "URI:",
  "MIME Type:": "Tipo MIME:",
  "Size:": "Tamaño:",
  "{{count}} bytes": "{{count}} bytes",
  "Reference in chat": "Referenciar en el chat",
  "MCP server": "Servidor MCP",
  "MCP resource server": "Servidor de recursos MCP",
  "{{count}} invalid tools": "{{count}} herramientas no válidas",
  invalid: "no válida",
  "invalid: {{reason}}": "no válida: {{reason}}",
  "missing name": "falta el nombre",
  "missing description": "falta la descripción",
  "(unnamed)": "(sin nombre)",
  Reason: "Motivo",
  "Tools must have both name and description to be used by the LLM.":
    "Para que el modelo pueda usarlas, las herramientas necesitan nombre y descripción.",

  /* ---- resumen del proyecto ---- */
  "Generate a project summary and save it to .qwen/PROJECT_SUMMARY.md":
    "Genera un resumen del proyecto y guárdalo en .jpcode/PROJECT_SUMMARY.md",
  "Already generating summary, wait for previous request to complete":
    "Ya se está generando un resumen: espera a que termine la petición anterior",
  "Summary path already exists and is not a generated summary: {{path}}":
    "La ruta del resumen ya existe y no es un resumen generado: {{path}}",
  "Summary path must be within the project root.":
    "La ruta del resumen tiene que estar dentro de la raíz del proyecto.",
  "Summary path resolves to an existing directory: {{path}}":
    "La ruta del resumen apunta a un directorio que ya existe: {{path}}",
  "Summary path ends with a separator but is an existing file: {{path}}":
    "La ruta del resumen acaba en separador pero ya hay un fichero ahí: {{path}}",
  "Saved project summary to {{filePathForDisplay}}.":
    "Resumen del proyecto guardado en {{filePathForDisplay}}.",
  "Saving project summary...": "Guardando el resumen del proyecto...",
  "Generating project summary...": "Generando el resumen del proyecto...",
  "Processing summary...": "Procesando el resumen...",
  "Project summary generated and saved successfully!":
    "¡Resumen del proyecto generado y guardado correctamente!",
  "Saved to: {{filePath}}": "Guardado en: {{filePath}}",

  /* ---- /model ---- */
  "Switch the model for this session (--fast for suggestion model, [model-id] to switch immediately).":
    "Cambia el modelo de esta sesión (--fast para el modelo de sugerencias, [model-id] para cambiar al momento).",
  "Switch the model for this session (--fast for suggestion model, --voice for voice transcription model, [model-id] to switch immediately).":
    "Cambia el modelo de esta sesión (--fast para el de sugerencias, --voice para el de voz, [model-id] para cambiar al momento).",
  "Switch the model for this session (--fast for suggestion model, --voice for voice transcription model, --vision for the vision bridge model, --project to persist to project settings, --global to persist to user settings, [model-id] to switch immediately, or [model-id] [prompt] to run a one-off prompt on another model; the inline prompt is sent verbatim without @file expansion).":
    "Cambia el modelo de esta sesión (--fast para sugerencias, --voice para la voz, --vision para el puente de visión, --project para guardarlo en los ajustes del proyecto, --global en los del usuario, [model-id] para cambiar al momento, o [model-id] [prompt] para lanzar un prompt suelto en otro modelo; el prompt en línea se manda tal cual, sin expandir los @archivo).",
  "Switch the model for this session (--fast for suggestion model, --voice for voice transcription model, --vision for the vision bridge model, --compaction for chat compression model, --image for the image generation model, --project to persist to project settings, --global to persist to user settings, [model-id] to switch immediately, or [model-id] [prompt] to run a one-off prompt on another model; the inline prompt is sent verbatim without @file expansion).":
    "Cambia el modelo de esta sesión (--fast para sugerencias, --voice para la voz, --vision para el puente de visión, --compaction para comprimir el chat, --image para generar imágenes, --project para guardarlo en los ajustes del proyecto, --global en los del usuario, [model-id] para cambiar al momento, o [model-id] [prompt] para lanzar un prompt suelto en otro modelo; el prompt en línea se manda tal cual, sin expandir los @archivo).",
  "Inline one-shot override isn't supported in this mode — run '/model {{model}}' first, then send your prompt.":
    "El cambio puntual en línea no funciona en este modo: ejecuta '/model {{model}}' primero y luego envía tu prompt.",
  "Inline one-shot override can't switch providers. '{{model}}' belongs to a different provider — run '/model {{model}}' first, then send your prompt.":
    "El cambio puntual en línea no cambia de proveedor. «{{model}}» es de otro proveedor: ejecuta '/model {{model}}' primero y luego envía tu prompt.",
  "⚠ '{{model}}' is not a known image-capable model; the vision bridge may fail on images.":
    "⚠ «{{model}}» no es un modelo conocido con visión: el puente de visión puede fallar con las imágenes.",
  "Set a lighter model for prompt suggestions and speculative execution":
    "Pon un modelo más ligero para las sugerencias de prompt y la ejecución especulativa",
  "Toggle voice dictation input": "Activa o desactiva el dictado por voz",
  "Set the model for voice transcription": "Elige el modelo de transcripción de voz",
  "Set the image-capable model used to transcribe images for a text-only main model":
    "Elige el modelo con visión que transcribe las imágenes para un modelo principal que solo ve texto",
  "Set the model used to generate images": "Elige el modelo que genera las imágenes",
  "Set the model used for chat compression (auto-compaction)":
    "Elige el modelo que comprime el chat (compresión automática)",
  "Persist the model selection to the project settings (workspace scope)":
    "Guarda el modelo elegido en los ajustes del proyecto (ámbito del espacio de trabajo)",
  "Persist the model selection to the user settings (global scope)":
    "Guarda el modelo elegido en los ajustes de usuario (ámbito global)",
  "Select Fast Model": "Elegir el modelo rápido",
  "Select Vision Model": "Elegir el modelo de visión",
  "Select Image Model": "Elegir el modelo de imágenes",
  "Select Compaction Model": "Elegir el modelo de compresión",
  "Select Voice Model": "Elegir el modelo de voz",
  "Vision Model": "Modelo de visión",
  "Image Model": "Modelo de imágenes",
  "Compaction Model": "Modelo de compresión",
  "Compaction model override cleared": "Anulado el modelo de compresión elegido",
  "Current compaction model: {{compactionModel}}\nUse \"/model --compaction <model-id>\" to set compaction model, or \"/model --compaction clear\" to clear the override.":
    "Modelo de compresión actual: {{compactionModel}}\nUsa \"/model --compaction <model-id>\" para poner el modelo de compresión, o \"/model --compaction clear\" para quitar el que Elegiste.",
  "not set (falls back to the main model)":
    "sin fijar (se usa el modelo principal)",
  "Configure models in settings.modelProviders and ensure the required environment variables are set. In interactive mode, run /auth to configure or switch providers, or run /model --compaction without a model to choose from configured models.":
    "Configura los modelos en settings.modelProviders y comprueba que están las variables de entorno que hacen falta. En modo interactivo, ejecuta /auth para configurar o cambiar de proveedor, o ejecuta /model --compaction sin modelo para elegir entre los configurados.",
  "Voice Model": "Modelo de voz",
  "Selected compaction model is unavailable.":
    "El modelo de compresión elegido no está disponible.",
  "Selected voice model is unavailable.":
    "El modelo de voz elegido no está disponible.",
  "Selected image model is unavailable.":
    "El modelo de imágenes elegido no está disponible.",

  /* ---- voz ---- */
  "Voice model '{{model}}' is configured more than once. Remove duplicate model ids before selecting it for voice transcription.":
    "El modelo de voz «{{model}}» está configurado más de una vez. Quita los ids repetidos antes de elegirlo para la transcripción.",
  "Voice dictation: {{status}} (mode: {{mode}}, {{modelText}}).":
    "Dictado por voz: {{status}} (modo: {{mode}}, {{modelText}}).",
  "model: {{voiceModel}}": "modelo: {{voiceModel}}",
  "Voice dictation disabled.": "Dictado por voz desactivado.",
  "Usage: /voice [hold|tap|off|status]": "Uso: /voice [hold|tap|off|status]",
  "Voice dictation enabled (tap mode). Tap Space at an empty prompt to start, tap again or pause to stop and submit, using {{voiceModel}}.":
    "Dictado por voz activado (modo toque). Toca Espacio con el prompt vacío para empezar, tócalo otra vez o haz una pausa para parar y enviar, con {{voiceModel}}.",
  "Voice dictation enabled (hold mode). Hold Space at an empty prompt to dictate with {{voiceModel}}.":
    "Dictado por voz activado (modo mantener). Mantén Espacio con el prompt vacío para dictar con {{voiceModel}}.",
  "Configured models: {{models}}.": "Modelos configurados: {{models}}.",
  "Configure a unique model id in settings.modelProviders or run /model --voice to select an available model.":
    "Configura un id de modelo único en settings.modelProviders o ejecuta /model --voice para elegir uno disponible.",
  "Voice model '{{modelName}}' is not configured.":
    "El modelo de voz «{{modelName}}» no está configurado.",
  "Voice model '{{modelName}}' cannot be used for transcription.":
    "El modelo de voz «{{modelName}}» no se puede usar para transccribir.",
  "Voice model '{{modelName}}' cannot be used for transcription. Configure an OpenAI-compatible model with baseUrl in settings.modelProviders.":
    "El modelo de voz «{{modelName}}» no se puede usar para transccribir. Configura en settings.modelProviders un modelo compatible con OpenAI que tenga baseUrl.",
  "Configure an OpenAI-compatible model with baseUrl in settings.modelProviders.":
    "Configura en settings.modelProviders un modelo compatible con OpenAI que tenga baseUrl.",
  "Microphone access is denied. Enable it for your terminal in System Settings → Privacy & Security → Microphone, then restart voice dictation.":
    "No se permite el acceso al micrófono. Actívalo para tu terminal en Ajustes del Sistema → Privacidad y seguridad → Micrófono, y vuelve a activar el dictado.",
  "Voice dictation is not supported on {{platform}}.":
    "El dictado por voz no funciona en {{platform}}.",
  "Voice dictation needs microphone access, which is unavailable in this WSL session. Use WSLg/PulseAudio, or run jpcode on a host with a microphone.":
    "El dictado por voz necesita el micrófono, que no está disponible en esta sesión de WSL. Usa WSLg/PulseAudio, o ejecuta jpcode en una máquina con micrófono.",
  "Voice dictation needs microphone access. macOS will ask the first time you record — approve it, then start again. Your first recording may be empty while the dialog is open.":
    "El dictado por voz necesita el micrófono. macOS te lo pedirá la primera vez: acéptalo y vuelve a empezar. La primera grabación puede salir vacía mientras el diálogo está abierto.",
  "Voice: recording": "Voz: grabando",
  "Voice: transcribing": "Voz: transcribiendo",
  "Voice: refining": "Voz: afinando",
  "listening…": "escuchando…",
  "transcribing…": "transcribiendo…",
  "refining…": "afinando…",
  "Content generator configuration not available.":
    "Configuración del generador de contenido no disponible.",

  /* ---- compresión y directorios ---- */
  " (not in model registry)": " (no está en el registro de modelos)",
  "Starting a new session, resetting chat, and clearing terminal.":
    "Empieza una sesión nueva, reinicia el chat y limpia el terminal.",
  "Starting a new session and clearing.":
    "Empieza una sesión nueva y limpia.",
  "Already compressing, wait for previous request to complete":
    "Ya se está comprimiendo: espera a que termine la petición anterior",
  "Compressing chat history": "Comprimiendo el historial del chat",
  "Chat history compressed from {{originalTokens}} to {{newTokens}} tokens.":
    "Historial comprimido de {{originalTokens}} a {{newTokens}} tokens.",
  "Compression was not beneficial for this history size.":
    "Comprimir no mereció la pena con este tamaño de historial.",
  "Chat history compression did not reduce size. This may indicate issues with the compression prompt.":
    "La compresión del historial no redujo el tamaño. Puede que el prompt de compresión tenga algún problema.",
  "Could not compress chat history because the compression summary was empty.":
    "No se pudo comprimir el historial porque el resumen salió vacío.",
  "Could not compress chat history because the compression summary was truncated.":
    "No se pudo comprimir el historial porque el resumen salió cortado.",
  "Configuration is not available.": "La configuración no está disponible.",
  "Please provide at least one path to add.":
    "Pasa al menos una ruta para añadir.",
  "The /directory add command is not supported in restrictive sandbox profiles. Please use --include-directories when starting the session instead.":
    "El comando /directory add no funciona en los perfiles de sandbox restrictivos. Usa --include-directories al arrancar la sesión.",
  "Successfully added QWEN.md files from the following directories if there are:\n- {{directories}}":
    "Se añadieron los archivos QWEN.md de estos directorios, si los hay:\n- {{directories}}",
  "Successfully added directories:\n- {{directories}}":
    "Directorios añadidos correctamente:\n- {{directories}}",
  "Current workspace directories:\n{{directories}}":
    "Directorios actuales del espacio de trabajo:\n{{directories}}",
  "Please open the following URL in your browser to view the documentation:\n{{url}}":
    "Abre esta URL en el navegador para ver la documentación:\n{{url}}",
  "Opening documentation in your browser: {{url}}":
    "Abriendo la documentación en el navegador: {{url}}",
  "Do you want to proceed?": "¿Quieres continuar?",

  /* ---- permisos ---- */
  "Allow always": "Permitir siempre",
  No: "No",
  "No (esc)": "No (esc)",
  "Modify in progress:": "Cambio en marcha:",
  "Save and close external editor to continue":
    "Guarda y cierra el editor externo para continuar",
  "Apply this change?": "¿Aplicar este cambio?",
  "Yes, allow always": "Sí, permitir siempre",
  "Modify with external editor": "Modificar con el editor externo",
  "No, suggest changes (esc)": "No, sugiere los cambios (esc)",
  "Allow execution of: '{{command}}'?": "¿Permitir ejecutar «{{command}}»?",
  "Always allow in this project": "Permitir siempre en este proyecto",
  "Always allow {{action}} in this project":
    "Permitir siempre {{action}} en este proyecto",
  "Always allow for this user": "Permitir siempre para este usuario",
  "Always allow {{action}} for this user":
    "Permitir siempre {{action}} para este usuario",
  "Yes, restore previous mode ({{mode}})":
    "Sí, volver al modo anterior ({{mode}})",
  "Yes, and auto-accept edits": "Sí, y aceptar los cambios automáticamente",
  "Yes, and manually approve edits": "Sí, y aprobar los cambios a mano",
  "No, keep planning (esc)": "No, sigue planificando (esc)",
  "URLs to fetch:": "URLs que traer:",
  "MCP Server: {{server}}": "Servidor MCP: {{server}}",
  "Tool: {{tool}}": "Herramienta: {{tool}}",
  "Allow execution of MCP tool \"{{tool}}\" from server \"{{server}}\"?":
    "¿Permitir ejecutar la herramienta MCP «{{tool}}» del servidor «{{server}}»?",
  "Shell Command Execution": "Ejecución de un comando del shell",
  "A custom command wants to run the following shell commands:":
    "Un comando personalizado quiere ejecutar esto:",
  "Current Plan:": "Plan actual:",
  "Progress: {{done}}/{{total}} tasks completed":
    "Progreso: {{done}}/{{total}} tareas completadas",
  ", {{inProgress}} in progress": ", {{inProgress}} en marcha",
  "Pending Tasks:": "Tareas pendientes:",

  /* ---- inicio de sesión ---- */
  "What would you like to do?": "¿Qué quieres hacer?",
  "Choose how to proceed with your session:": "Elige cómo seguir con la sesión:",
  "Start new chat session": "Empezar una sesión de chat nueva",
  "Continue previous conversation": "Seguir con la conversación anterior",
  "Welcome back! (Last updated: {{timeAgo}})":
    "¡Bienvenido otra vez! (Última vez: {{timeAgo}})",
  "Overall Goal:": "Objetivo general:",
  "Connect a Provider": "Conectar un proveedor",
  "You must connect a provider to proceed. Press Ctrl+C again to exit.":
    "Tienes que conectar un proveedor para seguir. Pulsa Ctrl+C otra vez para salir.",
  "Terms of Services and Privacy Notice":
    "Condiciones del servicio y aviso de privacidad",
  "Qwen OAuth": "OAuth de Qwen",
  "Discontinued — switch to Coding Plan or API Key":
    "Retirado: cambia al Coding Plan o a una API key",
  "Qwen OAuth free tier was discontinued on 2026-04-15. Please select Coding Plan or API Key instead.":
    "La capa gratuita de Qwen OAuth se retiró el 2026-04-15. Elige el Coding Plan o una API key.",
  "Qwen OAuth free tier was discontinued on 2026-04-15. Please select a model from another provider or run /auth to switch.":
    "La capa gratuita de Qwen OAuth se retiró el 2026-04-15. Elige un modelo de otro proveedor o ejecuta /auth para cambiar.",
  "\n⚠ Qwen OAuth free tier was discontinued on 2026-04-15. Please select another option.\n":
    "\n⚠ La capa gratuita de Qwen OAuth se retiró el 2026-04-15. Elige otra opción.\n",
  "Qwen OAuth free tier was discontinued on 2026-04-15. Run /auth to switch to Coding Plan, OpenRouter, Fireworks AI, or another provider.":
    "La capa gratuita de Qwen OAuth se retiró el 2026-04-15. Ejecuta /auth para cambiar al Coding Plan, OpenRouter, Fireworks AI u otro proveedor.",
  "Paid · Up to 6,000 requests/5 hrs · All Alibaba Cloud Coding Plan Models":
    "De pago · Hasta 6.000 peticiones/5 h · Todos los modelos del Coding Plan de Alibaba Cloud",
  "For teams · Paid · Up to 6,000 requests/5 hrs · All Alibaba Cloud Coding Plan Models":
    "Para equipos · De pago · Hasta 6.000 peticiones/5 h · Todos los modelos del Coding Plan de Alibaba Cloud",
  "For individual developers · Pay per model call · 5-hour/weekly quotas":
    "Para desarrolladores individuales · Pagas por llamada · Cuotas de 5 horas y semanales",
  Subscribe: "Suscribirse",
  "Paid subscription plans from Alibaba Cloud ModelStudio":
    "Planes de pago de Alibaba Cloud ModelStudio",

  /* ---- planes y autenticación ---- */
  "Select Subscription Plan": "Elige el plan",
  "Alibaba Cloud Coding Plan": "Coding Plan de Alibaba Cloud",
  "Alibaba Cloud Token Plan": "Token Plan de Alibaba Cloud",
  "Pay-as-you-go tokens · Configure ModelStudio standard API key":
    "Tokens de pago por uso · Configura la API key estándar de ModelStudio",
  "For individuals · Pay-as-you-go tokens · Dedicated Token Plan endpoint":
    "Para particulares · Tokens de pago por uso · Endpoint propio del Token Plan",
  "For teams/companies · Credits deducted by token usage · Dedicated API key and base URL":
    "Para equipos y empresas · Créditos que se descuentan por uso de tokens · API key y URL base propias",
  "Token Plan documentation": "Documentación del Token Plan",
  "Bring your own API key": "Trae tu propia API key",
  "Browser-based authentication with third-party providers (e.g. OpenRouter, ModelScope)":
    "Autenticación en el navegador con proveedores de terceros (p. ej. OpenRouter, ModelScope)",
  "Authentication is enforced to be {{enforcedType}}, but you are currently using {{currentType}}.":
    "La autenticación es obligatoria de tipo {{enforcedType}}, pero ahora estás usando {{currentType}}.",
  "Qwen OAuth Authentication": "Autenticación OAuth de Qwen",
  "Please visit this URL to authorize:": "Abre esta URL para autorizar:",
  "Waiting for authorization": "Esperando la autorización",
  "Time remaining:": "Tiempo restante:",
  "Qwen OAuth Authentication Timeout": "Se acabó el tiempo de la autenticación OAuth de Qwen",
  "OAuth token expired (over {{seconds}} seconds). Please select authentication method again.":
    "El token OAuth caducó (más de {{seconds}} segundos). Elige otra vez el método de autenticación.",
  "Press any key to return to authentication type selection.":
    "Pulsa cualquier tecla para volver a elegir el tipo de autenticación.",
  "Waiting for Qwen OAuth authentication...": "Esperando la autenticación OAuth de Qwen...",
  "Authentication timed out. Please try again.":
    "Se acabó el tiempo de la autenticación. Inténtalo otra vez.",
  "Waiting for auth... (Press ESC or CTRL+C to cancel)":
    "Esperando la autenticación... (pulsa ESC o CTRL+C para cancelar)",
  "Missing API key for OpenAI-compatible auth. Set settings.security.auth.apiKey, or set the {{envKeyHint}} environment variable.":
    "Falta la API key para la autenticación compatible con OpenAI. Pon settings.security.auth.apiKey, o la variable de entorno {{envKeyHint}}.",
  "{{envKeyHint}} environment variable not found. Please set it in your .env file or environment variables.":
    "No se encuentra la variable de entorno {{envKeyHint}}. Ponla en tu fichero .env o en las variables de entorno.",
  "{{envKeyHint}} environment variable not found (or set settings.security.auth.apiKey). Please set it in your .env file or environment variables.":
    "No se encuentra la variable de entorno {{envKeyHint}} (o pon settings.security.auth.apiKey). Ponla en tu fichero .env o en las variables de entorno.",
  "Missing API key for OpenAI-compatible auth. Set the {{envKeyHint}} environment variable.":
    "Falta la API key para la autenticación compatible con OpenAI. Pon la variable de entorno {{envKeyHint}}.",
  "Anthropic provider missing required baseUrl in modelProviders[].baseUrl.":
    "Al proveedor de Anthropic le falta la baseUrl obligatoria en modelProviders[].baseUrl.",
  "ANTHROPIC_BASE_URL environment variable not found.":
    "No se encuentra la variable de entorno ANTHROPIC_BASE_URL.",
  "Invalid auth method selected.": "Método de autenticación no válido.",
  "Failed to authenticate. Message: {{message}}":
    "No se pudo autenticar. Mensaje: {{message}}",
  "Authenticated successfully with {{authType}} credentials.":
    "Autenticación correcta con las credenciales de {{authType}}.",
  "Invalid QWEN_DEFAULT_AUTH_TYPE value: \"{{value}}\". Valid values are: {{validValues}}":
    "Valor no válido en QWEN_DEFAULT_AUTH_TYPE: «{{value}}». Los valores válidos son: {{validValues}}",

  /* ---- selector de modelo ---- */
  "Select Model": "Elegir modelo",
  " (this project)": " (este proyecto)",
  " (global)": " (global)",
  "API Key": "API key",
  "(default)": "(por defecto)",
  "(not set)": "(sin fijar)",
  Modality: "Modalidad",
  "Context Window": "Ventana de contexto",
  text: "texto",
  "text-only": "solo texto",
  image: "imagen",
  pdf: "pdf",
  audio: "audio",
  video: "vídeo",
  "not set": "sin fijar",
  "Current voice model: {{voiceModel}}\nUse \"/model --voice <model-id>\" to set voice model.":
    "Modelo de voz actual: {{voiceModel}}\nUsa \"/model --voice <model-id>\" para poner el modelo de voz.",
  "Current vision model: {{visionModel}}\nUse \"/model --vision <model-id>\" to set the vision bridge model.":
    "Modelo de visión actual: {{visionModel}}\nUsa \"/model --vision <model-id>\" para poner el modelo del puente de visión.",
  "Current image model: {{imageModel}}\nUse \"/model --image <model-id>\" to set the image generation model.":
    "Modelo de imágenes actual: {{imageModel}}\nUsa \"/model --image <model-id>\" para poner el modelo que genera imágenes.",
  "Voice model '{{modelName}}' is ambiguous. Configure a unique model id before using /model --voice.":
    "El modelo de voz «{{modelName}}» es ambiguo. Configura un id de modelo único antes de usar /model --voice.",
  "Image model '{{modelName}}' matches multiple configured endpoints. Run /model --image without an argument and choose the exact endpoint.":
    "El modelo de imágenes «{{modelName}}» coincide con varios endpoints configurados. Ejecuta /model --image sin argumento y elige el endpoint exacto.",
  "Image model '{{modelName}}' must declare a valid HTTPS baseUrl and credential environment variable.":
    "El modelo de imágenes «{{modelName}}» debe declarar una baseUrl HTTPS válida y una variable de entorno para las credenciales.",
  "'{{model}}' must declare a valid HTTPS baseUrl and credential environment variable.":
    "«{{model}}» debe declarar una baseUrl HTTPS válida y una variable de entorno para las credenciales.",
  none: "ninguno",
  unknown: "desconocido",

  /* ---- permisos ---- */
  "Manage folder trust settings": "Gestionar los ajustes de confianza de carpetas",
  "Manage permission rules": "Gestionar las reglas de permisos",
  Allow: "Permitir",
  Ask: "Preguntar",
  Deny: "Denegar",
  Workspace: "Espacio de trabajo",
  "jpcode won't ask before using allowed tools.":
    "jpcode no preguntará antes de usar las herramientas permitidas.",
  "jpcode will ask before using these tools.":
    "jpcode preguntará antes de usar estas herramientas.",
  "jpcode is not allowed to use denied tools.":
    "jpcode no tiene permiso para usar las herramientas denegadas.",
  "Manage trusted directories for this workspace.":
    "Gestiona los directorios de confianza de este espacio de trabajo.",
  "Any use of the {{tool}} tool": "Cualquier uso de la herramienta {{tool}}",
  "{{tool}} commands matching '{{pattern}}'":
    "Comandos de {{tool}} que coincidan con «{{pattern}}»",
  "From user settings": "De los ajustes de usuario",
  "From project settings": "De los ajustes del proyecto",
  "From session": "De la sesión",
  "Project settings": "Ajustes del proyecto",
  "Checked in at .qwen/settings.json": "Versionado en .jpcode/settings.json",
  "User settings": "Ajustes de usuario",
  "Saved in at ~/.qwen/settings.json": "Guardado en ~/.jpcode/settings.json",
  "Add a new rule…": "Añadir una regla nueva…",
  "Add {{type}} permission rule": "Añadir una regla de permisos de {{type}}",
  "Permission rules are a tool name, optionally followed by a specifier in parentheses.":
    "Las reglas de permisos son un nombre de herramienta, seguido opcionalmente de un especificador entre paréntesis.",
  "e.g.,": "p. ej.,",
  or: "o",
  "Enter permission rule…": "Escribe la regla de permisos…",
  "Enter to submit · Esc to cancel": "Enter para enviar · Esc para cancelar",
  "Where should this rule be saved?": "¿Dónde se guarda esta regla?",
  "Enter to confirm · Esc to cancel": "Enter para confirmar · Esc para cancelar",
  "Delete {{type}} rule?": "¿Borrar la regla de {{type}}?",
  "Are you sure you want to delete this permission rule?":
    "¿Seguro que quieres borrar esta regla de permisos?",
  "Permissions:": "Permisos:",
  "(←/→ or tab to cycle)": "(←/→ o tab para cambiar)",

  /* ---- directorios del espacio de trabajo ---- */
  "Press ↑↓ to navigate · Enter to select · Type to search · Esc to cancel":
    "Pulsa ↑↓ para moverte · Enter para elegir · Escribe para buscar · Esc para cancelar",
  "Search…": "Buscar…",
  "Add directory…": "Añadir directorio…",
  "Add directory to workspace": "Añadir un directorio al espacio de trabajo",
  "jpcode can read files in the workspace, and make edits when auto-accept edits is on.":
    "jpcode puede leer archivos del espacio de trabajo, y hacer cambios cuando la aceptación automática está activada.",
  "jpcode will be able to read files in this directory and make edits when auto-accept edits is on.":
    "jpcode podrá leer archivos de este directorio y hacer cambios cuando la aceptación automática esté activada.",
  "Enter the path to the directory:": "Escribe la ruta del directorio:",
  "Enter directory path…": "Escribe la ruta del directorio…",
  "Tab to complete · Enter to add · Esc to cancel":
    "Tab para completar · Enter para añadir · Esc para cancelar",
  "Remove directory?": "¿Quitar el directorio?",
  "Are you sure you want to remove this directory from the workspace?":
    "¿Seguro que quieres quitar este directorio del espacio de trabajo?",
  "  (Original working directory)": "  (directorio de trabajo original)",
  "  (from settings)": "  (de los ajustes)",
  "Directory does not exist.": "El directorio no existe.",
  "Path is not a directory.": "La ruta no es un directorio.",
  "This directory is already in the workspace.":
    "Este directorio ya está en el espacio de trabajo.",
  "Already covered by existing directory: {{dir}}":
    "Ya está cubierto por un directorio existente: {{dir}}",
  "Using:": "En uso:",

  /* ---- el pie ---- */
  "{{count}} open file": "{{count}} archivo abierto",
  "{{count}} open files": "{{count}} archivos abiertos",
  "(ctrl+g to view)": "(ctrl+g para ver)",
  "{{count}} {{name}} file": "{{count}} archivo de {{name}}",
  "{{count}} {{name}} files": "{{count}} archivos de {{name}}",
  "{{count}} MCP server": "{{count}} servidor MCP",
  "{{count}} MCP servers": "{{count}} servidores MCP",
  "{{count}} Blocked": "{{count}} bloqueados",
  "(ctrl+t to view)": "(ctrl+t para ver)",
  "(ctrl+t to toggle)": "(ctrl+t para mostrar/ocultar)",
  "Press Ctrl+C again to exit.": "Pulsa Ctrl+C otra vez para salir.",
  "Press Ctrl+D again to exit.": "Pulsa Ctrl+D otra vez para salir.",
  "Press Esc again to clear.": "Pulsa Esc otra vez para limpiar.",
  "Ctrl+Q to queue · ↑ to edit queued messages":
    "Ctrl+Q para encolar · ↑ para editar los mensajes encolados",
  "Enter to steer · Ctrl+Q to queue": "Enter para dirigir · Ctrl+Q para encolar",
  "{{count}} queued": "{{count}} encolados",
  "Queue message for the next turn": "Encola el mensaje para el siguiente turno",

  /* ---- estado de los MCP ---- */
  "No MCP servers configured.": "No hay servidores MCP configurados.",
  "◌ MCP servers are starting up ({{count}} initializing)...":
    "◌ Los servidores MCP están arrancando ({{count}} inicializándose)…",
  "Note: First startup may take longer. Tool availability will update automatically.":
    "Nota: el primer arranque puede tardar más. Las herramientas disponibles se actualizan solas.",
  "Configured MCP servers:": "Servidores MCP configurados:",
  Ready: "Listo",
  "Starting... (first startup may take longer)":
    "Arrancando... (el primer arranque puede tardar más)",
  Disconnected: "Desconectado",
  "{{count}} tool": "{{count}} herramienta",
  "{{count}} tools": "{{count}} herramientas",
  "{{count}} prompt": "{{count}} prompt",
  "{{count}} prompts": "{{count}} prompts",
  "(from {{extensionName}})": "(de {{extensionName}})",
  OAuth: "OAuth",
  "OAuth expired": "OAuth caducado",
  "OAuth not authenticated": "OAuth sin autenticar",
  "tools and prompts will appear when ready":
    "las herramientas y los prompts aparecerán cuando estén listos",
  "{{count}} tools cached": "{{count}} herramientas en caché",

  /* ---- herramientas y recursos ---- */
  "Tools:": "Herramientas:",
  "Parameters:": "Parámetros:",
  "Prompts:": "Prompts:",
  "Resources:": "Recursos:",
  Blocked: "Bloqueadas",
  "★ Tips:": "★ Consejos:",
  Use: "Usa",
  "to show server and tool descriptions": "para enseñar las descripciones de servidores y herramientas",
  "to show tool parameter schemas": "para enseñar los esquemas de parámetros de las herramientas",
  "to hide descriptions": "para ocultar las descripciones",
  "to authenticate with OAuth-enabled servers":
    "para autenticar con los servidores que llevan OAuth",
  "{{current}}/{{total}}": "{{current}}/{{total}}",

  /* ---- consejos y ayuda ---- */
  Press: "Pulsa",
  "to toggle tool descriptions on/off": "para mostrar u ocultar las descripciones",
  "Starting OAuth authentication for MCP server '{{name}}'...":
    "Arrancando la autenticación OAuth del servidor MCP «{{name}}»...",
  "Tips:": "Consejos:",
  "Use /compress when the conversation gets long to summarize history and free up context.":
    "Usa /compress cuando la conversación se alargue: resume el historial y libera contexto.",
  "Start a fresh idea with /clear or /new; the previous session stays available in history.":
    "Empieza algo nuevo con /clear o /new; la sesión anterior sigue en el historial.",
  "Use /bug to submit issues to the maintainers when something goes off.":
    "Usa /bug para avisar a quienes lo mantienen cuando algo falle.",
  "Switch auth type quickly with /auth.": "Cambia rápido de autenticación con /auth.",
  "You can run any shell commands from jpcode using ! (e.g. !ls).":
    "Desde jpcode puedes ejecutar comandos del shell con ! (p. ej. !ls).",
  "Type / to open the command popup; Tab autocompletes slash commands and saved prompts.":
    "Escribe / para abrir el desplegable de comandos; Tab autocompleta los comandos y los prompts guardados.",
  "You can resume a previous conversation by running qwen --continue or qwen --resume.":
    "Puedes retomar una conversación anterior con jpcode --continue o jpcode --resume.",
  "You can switch permission mode quickly with Shift+Tab or /approval-mode.":
    "Puedes cambiar de modo de permisos rápido con Shift+Tab o /approval-mode.",
  "You can switch permission mode quickly with Tab or /approval-mode.":
    "Puedes cambiar de modo de permisos rápido con Tab o /approval-mode.",
  "Try /insight to generate personalized insights from your chat history.":
    "Prueba /insight para sacar conclusiones a medida de tu historial de chat.",
  "Add a QWEN.md file to give jpcode persistent project context.":
    "Añade un fichero QWEN.md para darle a jpcode el contexto del proyecto de forma permanente.",
  "Use /btw to ask a quick side question without disrupting the conversation.":
    "Usa /btw para preguntar de pasada sin cortar la conversación.",
  "Context is almost full! Run /compress now or start /new to continue.":
    "¡El contexto está casi lleno! Ejecuta /compress ahora o empieza /new para seguir.",
  "Context is getting full. Use /compress to free up space.":
    "El contexto se está llenando. Usa /compress para liberar espacio.",
  "Long conversation? /compress summarizes history to free context.":
    "¿Conversación larga? /compress resume el historial y libera contexto.",
  "Agent powering down. Goodbye!": "El agente se apaga. ¡Hasta luego!",
  "To continue this session, run": "Para seguir con esta sesión, ejecuta",

  /* ---- /stats ---- */
  "Interaction Summary": "Resumen de la interacción",
  "Session ID:": "ID de sesión:",
  "Tool Calls:": "Llamadas a herramientas:",
  "Success Rate:": "Tasa de éxito:",
  "User Agreement:": "Aceptación:",
  reviewed: "revisadas",
  "Code Changes:": "Cambios de código:",
  Performance: "Rendimiento",
  "Generation Metrics": "Métricas de generación",
  "Latest Request": "Última petición",
  "Generation Time": "Tiempo de generación",
  "Average TTFT": "TTFT medio",
  "Session TPS": "TPS de la sesión",
  "Wall Time:": "Tiempo total:",
  "Agent Active:": "Agente activo:",
  "API Time:": "Tiempo de API:",
  "Tool Time:": "Tiempo de herramientas:",
  "Session Stats": "Estadísticas de la sesión",
  "Model Usage": "Uso por modelo",
  Reqs: "Peticiones",
  "Input Tokens": "Tokens de entrada",
  "Output Tokens": "Tokens de salida",
  "Savings Highlight:": "Ahorro destacado:",
  "of input tokens were served from the cache, reducing costs.":
    "de los tokens de entrada salieron de la caché, lo que abarata el coste.",
  "Tip: For a full token breakdown, run `/stats model`.":
    "Consejo: para el desglose completo de tokens, ejecuta `/stats model`.",
  "Model Stats For Nerds": "Estadísticas por modelo, para Experts",
  "Tool Stats For Nerds": "Estadísticas por herramienta, para expertos",
  Metric: "Métrica",
  API: "API",
  Requests: "Peticiones",
  Errors: "Errores",
  "Avg Latency": "Latencia media",
  Tokens: "Tokens",
  Total: "Total",
  Prompt: "Prompt",
  Cached: "En caché",
  Thoughts: "Razonamientos",
  Output: "Salida",
  "No API calls have been made in this session.":
    "En esta sesión no se ha llamado a la API.",
  "Tool Name": "Nombre de la herramienta",
  Calls: "Llamadas",
  "Avg Duration": "Duración media",
  "User Decision Summary": "Resumen de tus decisiones",
  "Total Reviewed Suggestions:": "Sugerencias revisadas en total:",
  " » Accepted:": " » Aceptadas:",
  " » Rejected:": " » Rechazadas:",
  " » Modified:": " » Modificadas:",
  " Overall Agreement Rate:": " Tasa de aceptación total:",
  "No tool calls have been made in this session.":
    "En esta sesión no se ha llamado a ninguna herramienta.",
  "Session start time is unavailable, cannot calculate stats.":
    "No se sabe cuándo empezó la sesión; no se pueden calcular las estadísticas.",

  /* ---- migración de comandos TOML ---- */
  "Command Format Migration": "Migración del formato de comandos",
  "Found {{count}} TOML command file:":
    "Se ha encontrado {{count}} fichero de comando en TOML:",
  "Found {{count}} TOML command files:":
    "Se han encontrado {{count}} ficheros de comando en TOML:",
  "The TOML format is deprecated. Would you like to migrate them to Markdown format?":
    "El formato TOML está retirado. ¿Quieres pasarlos a markdown?",
  "(Backups will be created and original files will be preserved)":
    "(Se harán copias de seguridad y los ficheros originales se conservarán)",
  "Waiting for user confirmation...": "Esperando tu confirmación...",
  "Enter value...": "Escribe el valor...",
  "Enter sensitive value...": "Escribe el valor sensible...",
  "Press Enter to submit, Escape to cancel":
    "Pulsa Enter para enviar, Escape para cancelar",
  "Markdown file already exists: {{filename}}":
    "El fichero markdown ya existe: {{filename}}",
  "TOML Command Format Deprecation Notice":
    "Aviso: retirada del formato TOML para comandos",
  "Found {{count}} command file(s) in TOML format:":
    "Se han encontrado {{count}} fichero(s) de comando en formato TOML:",
  "The TOML format for commands is being deprecated in favor of Markdown format.":
    "El formato TOML para comandos se retira en favor del markdown.",
  "Markdown format is more readable and easier to edit.":
    "El markdown se lee mejor y es más fácil de editar.",
  "You can migrate these files automatically using:":
    "Puedes migrar estos ficheros automáticamente con:",
  "Or manually convert each file:": "O convierte cada fichero a mano:",
  "TOML: prompt = \"...\" / description = \"...\"": "TOML: prompt = \"…\" / description = \"…\"",
  "Markdown: YAML frontmatter + content": "Markdown: frontmatter YAML + contenido",
  "The migration tool will:": "La herramienta de migración hará:",
  "Convert TOML files to Markdown": "Convertir los ficheros TOML a markdown",
  "Create backups of original files": "Hacer copias de seguridad de los ficheros originales",
  "Preserve all command functionality": "Mantener toda la funcionalidad de los comandos",
  "TOML format will continue to work for now, but migration is recommended.":
    "El formato TOML seguirá funcionando por ahora, pero se recomienda migrar.",
  "Open extensions page in your browser":
    "Abrir la página de extensiones en el navegador",

  /* ---- tareas en segundo plano ---- */
  "Current tasks": "Tareas actuales",
  "Background tasks": "Tareas en segundo plano",
  "No tasks currently running": "Ahora mismo no hay tareas corriendo",
  "No entry to show.": "No hay nada que enseñar.",
  "needs approval": "necesita aprobación",
  "Large workflow": "Flujo grande",
  "Large workflow: {{agents}} agents scheduled (warning threshold {{cap}}).":
    "Flujo grande: {{agents}} agentes programados (el aviso salta a partir de {{cap}}).",
  "Large workflow: ~{{tokens}} output tokens projected (warning threshold {{cap}}).":
    "Flujo grande: se prevén unos {{tokens}} tokens de salida (el aviso salta a partir de {{cap}}).",
  "rejected — edit config to re-approve":
    "rechazado: cambia la configuración para volver a aprobarlo",
  "Background agent needs approval": "Un agente en segundo plano necesita aprobación",
  "Approve or deny the request above": "Aprueba o deniega la petición de arriba",
  "from nested agent": "de un agente anidado",
  Running: "Corriendo",
  Pausing: "Pausando",
  Paused: "Pausado",
  "Pause is cooperative; in-flight work may finish before the workflow is paused. An agent call waiting on a tool approval keeps the run in this state and still counts against the active-time limit until the approval is answered.":
    "La pausa es cooperativa: el trabajo en marcha puede terminar antes de que el flujo se pause. Una llamada a agente esperando la aprobación de una herramienta deja la ejecución en este estado, y sigue contando para el límite de tiempo activo hasta que se responda.",
  "Paused: no new agents will start; script code between agent calls keeps running. Press p to resume. /clear, /branch, and switching sessions cancel paused runs.":
    "Pausado: no arrancarán agentes nuevos; el código del script entre llamadas sigue corriendo. Pulsa p para seguir. /clear, /branch y cambiar de sesión cancelan las ejecuciones pausadas.",
  "Pause/resume was rejected; the workflow state changed. Try again.":
    "Se rechazó la pausa o la reanudación: el estado del flujo ha cambiado. Inténtalo otra vez.",
  "Tip: use `/workflows p <runId>` or Background tasks + p to cooperatively pause/resume; use `/workflows <runId>` for details.":
    "Consejo: usa `/workflows p <runId>` o Tareas en segundo plano + p para pausar o seguir de forma cooperativa; usa `/workflows <runId>` para ver los detalles.",
  Completed: "Terminada",
  Failed: "Fallida",
  Stopped: "Parada",

  /* ---- el sueño de la memoria ---- */
  Dream: "Sueño",
  "[dream] memory consolidation": "[sueño] consolidación de la memoria",
  "[dream] memory consolidation (reviewing {{count}} session)":
    "[sueño] consolidación de la memoria (revisando {{count}} sesión)",
  "[dream] memory consolidation (reviewing {{count}} sessions)":
    "[sueño] consolidación de la memoria (revisando {{count}} sesiones)",
  "{{count}} session": "{{count}} sesión",
  "{{count}} sessions": "{{count}} sesiones",
  "{{count}} topic": "{{count}} tema",
  "{{count}} topics": "{{count}} temas",
  "{{count}} tokens": "{{count}} tokens",
  "{{count}} tool call": "{{count}} llamada a herramienta",
  "{{count}} tool calls": "{{count}} llamadas a herramientas",
  "{{count}} event": "{{count}} evento",
  "{{count}} events": "{{count}} eventos",
  "{{count}} dropped": "{{count}} descartado",
  "pid {{pid}}": "pid {{pid}}",
  "exit {{exitCode}}": "salida {{exitCode}}",
  "Sessions reviewing": "Sesiones que está revisando",
  Progress: "Progreso",
  "Resume blocked": "Reanudación bloqueada",
  "Working dir": "Directorio de trabajo",
  "Output file": "Fichero de salida",
  "Topics touched ({{count}})": "Temas tocados ({{count}})",
  "{{count}} more": "{{count}} más",
  "Lock release warning": "Aviso al liberar el bloqueo",
  "Metadata write warning": "Aviso al escribir los metadatos",
  "Subsequent dreams may be skipped as locked until the next session's staleness sweep cleans the file.":
    "Los sueños siguientes pueden saltarse por estar bloqueados hasta que la próxima revisión de antigüedad de una sesión limpie el fichero.",
  "The scheduler gate did not see this dream's timestamp; the next dream cycle may re-fire sooner than usual.":
    "El planificador no vio la marca de tiempo de este sueño; el siguiente ciclo puede dispararse antes de lo normal.",
  "... and {{count}} more": "... y {{count}} más",

  /* ---- /context ---- */
  "Context Usage": "Uso del contexto",
  "% used": "% usado",
  "% context used": "% del contexto usado",
  "Context exceeds limit! Use /compress or /clear to reduce.":
    "¡El contexto pasa del límite! Usa /compress o /clear para bajarlo.",
  "No API response yet. Send a message to see actual usage.":
    "Todavía no hay respuesta de la API. Envía un mensaje para ver el uso real.",
  "Estimated usage, including the conversation":
    "Uso estimado, incluida la conversación",
  "No provider usage yet. These are local estimates, including the conversation.":
    "Todavía no hay uso del proveedor. Son estimaciones locales, conversación incluida.",
  "Estimated pre-conversation overhead": "Espacio previo estimado, antes de la conversación",
  "Context window": "Ventana de contexto",
  tokens: "tokens",
  Used: "Usado",
  Free: "Libre",
  "Autocompact buffer": "Margen de compresión automática",
  "Usage by category": "Uso por categoría",
  "System prompt": "Prompt del sistema",
  "Built-in tools": "Herramientas integradas",
  "MCP tools": "Herramientas MCP",
  "Memory files": "Ficheros de memoria",
  Messages: "Mensajes",
  "Startup context": "Contexto de arranque",
  Unattributed: "Sin atribuir",
  "Cached prefix": "Prefijo en caché",
  "Run /context detail for per-item breakdown.":
    "Ejecuta /context detail para el desglose elemento a elemento.",
  "Show context window usage breakdown. Use \"/context detail\" for per-item breakdown.":
    "Muestra el desglose del uso de la ventana de contexto. Usa \"/context detail\" para el detalle elemento a elemento.",
  "body loaded": "cuerpo cargado",
  memory: "memoria",

  /* ---- API key y planes ---- */
  "Retrying in {{seconds}} seconds… (attempt {{attempt}}/{{maxRetries}})":
    "Reintentando en {{seconds}} segundos… (intento {{attempt}}/{{maxRetries}})",
  "Press Ctrl+Y to retry": "Pulsa Ctrl+Y para reintentar",
  "No failed request to retry.": "No hay ninguna petición fallida que reintentar.",
  "to retry last request": "para reintentar la última petición",
  "to queue for the next turn": "para encolar para el siguiente turno",
  "API key cannot be empty.": "La API key no puede estar vacía.",
  "Invalid API key. Coding Plan API keys start with \"sk-sp-\". Please check.":
    "API key no válida. Las del Coding Plan empiezan por \"sk-sp-\". Compruébala.",
  "You can get your Coding Plan API key here": "Puedes conseguir aquí tu API key del Coding Plan",
  "You can get your Token Plan API key here": "Puedes conseguir aquí tu API key del Token Plan",
  "API key is stored in settings.env. You can migrate it to a .env file for better security.":
    "La API key está en settings.env. Puedes pasarla a un fichero .env para ir más seguro.",
  "New model configurations are available for Alibaba Cloud Coding Plan. Update now?":
    "Hay configuraciones de modelo nuevas para el Coding Plan de Alibaba Cloud. ¿Actualizar ahora?",
  "Coding Plan configuration updated successfully. New models are now available.":
    "Configuración del Coding Plan actualizada correctamente. Ya hay modelos nuevos.",
  "Coding Plan API key not found. Please re-authenticate with Coding Plan.":
    "No se encuentra la API key del Coding Plan. Vuelve a autenticar con el Coding Plan.",
  "Failed to update Coding Plan configuration: {{message}}":
    "No se pudo actualizar la configuración del Coding Plan: {{message}}",
  "You can configure your API key and models in settings.json":
    "Puedes configurar tu API key y tus modelos en settings.json",
  "Refer to the documentation for setup instructions":
    "Mira la documentación para las instrucciones de puesta en marcha",
  "Coding Plan": "Coding Plan",
  Custom: "A medida",
  "Select Region for Coding Plan": "Elige la región del Coding Plan",
  "Choose based on where your account is registered":
    "Elige según dónde esté registrada tu cuenta",
  "Enter Coding Plan API Key": "Escribe la API key del Coding Plan",
  "Enter Token Plan API Key": "Escribe la API key del Token Plan",
  "New model configurations are available for {{region}}. Update now?":
    "Hay configuraciones de modelo nuevas para {{region}}. ¿Actualizar ahora?",
  "{{region}} configuration updated successfully.":
    "La configuración de {{region}} se actualizó correctamente.",
  "{{region}} configuration updated successfully. Model switched to \"{{model}}\".":
    "La configuración de {{region}} se actualizó correctamente. El modelo ahora es «{{model}}».",
  "Authenticated successfully with {{region}}. API key and model configs saved to settings.json.":
    "Autenticación correcta con {{region}}. API key y configuración de modelos guardadas en settings.json.",
  "Tip: Use /model to switch between available Coding Plan models.":
    "Consejo: usa /model para cambiar entre los modelos disponibles del Coding Plan.",

  /* ---- formularios ---- */
  "Type something...": "Escribe algo…",
  Submit: "Enviar",
  "Submit answers": "Enviar las respuestas",
  Cancel: "Cancelar",
  "Your answers:": "Tus respuestas:",
  "(not answered)": "(sin responder)",
  "Ready to submit your answers?": "¿Envías tus respuestas?",
  "↑/↓: Navigate | ←/→: Switch tabs | Enter: Select":
    "↑/↓: moverse | ←/→: cambiar de pestaña | Enter: elegir",
  "↑/↓: Navigate | Enter: Select | Esc: Cancel":
    "↑/↓: moverse | Enter: elegir | Esc: cancelar",

  /* ---- /auth ---- */
  "Authenticate using Qwen OAuth": "Autenticar con OAuth de Qwen",
  "Authenticate using Alibaba Cloud Coding Plan":
    "Autenticar con el Coding Plan de Alibaba Cloud",
  "Region for Coding Plan (china/global)": "Región del Coding Plan (china/global)",
  "API key for Coding Plan": "API key del Coding Plan",
  "Show current authentication status": "Mostrar el estado de la autenticación",
  "Authentication completed successfully.":
    "Autenticación terminada correctamente.",
  "Starting Qwen OAuth authentication...":
    "Arrancando la autenticación OAuth de Qwen...",
  "Successfully authenticated with Qwen OAuth.":
    "Autenticación correcta con OAuth de Qwen.",
  "Failed to authenticate with Qwen OAuth: {{error}}":
    "No se pudo autenticar con OAuth de Qwen: {{error}}",
  "Processing Alibaba Cloud Coding Plan authentication...":
    "Procesando la autenticación del Coding Plan de Alibaba Cloud...",
  "Successfully authenticated with Alibaba Cloud Coding Plan.":
    "Autenticación correcta con el Coding Plan de Alibaba Cloud.",
  "Failed to authenticate with Coding Plan: {{error}}":
    "No se pudo autenticar con el Coding Plan: {{error}}",
  "中国 (China)": "China",
  "阿里云百炼 (aliyun.com)": "Alibaba Cloud ModelStudio (aliyun.com)",
  "Select region for Coding Plan:": "Elige la región del Coding Plan:",
  "Enter your Coding Plan API key: ": "Escribe tu API key del Coding Plan: ",
  "Select authentication method:": "Elige el método de autenticación:",
  "\n=== Authentication Status ===\n": "\n=== Estado de la autenticación ===\n",
  "⚠  No authentication method configured.\n": "⚠  No hay ningún método de autenticación configurado.\n",
  "Run one of the following commands to get started:\n":
    "Ejecuta uno de estos comandos para empezar:\n",
  "  qwen auth qwen-oauth     - Authenticate with Qwen OAuth (discontinued)":
    "  jpcode auth qwen-oauth   - Autenticar con OAuth de Qwen (retirado)",
  "Or simply run:": "O simplemente ejecuta:",
  "  qwen auth                - Interactive authentication setup\n":
    "  jpcode auth              - Configuración interactiva de la autenticación\n",
  "✓ Authentication Method: Qwen OAuth": "✓ Método de autenticación: OAuth de Qwen",
  "  Type: Free tier (discontinued 2026-04-15)":
    "  Tipo: capa gratuita (retirada el 2026-04-15)",
  "  Limit: No longer available": "  Límite: ya no está disponible",
  "✓ Authentication Method: Alibaba Cloud Coding Plan":
    "✓ Método de autenticación: Coding Plan de Alibaba Cloud",
  "中国 (China) - 阿里云百炼": "China - Alibaba Cloud ModelStudio",
  "Global - Alibaba Cloud": "Global - Alibaba Cloud",
  "  Region: {{region}}": "  Región: {{region}}",
  "  Current Model: {{model}}": "  Modelo actual: {{model}}",
  "  Config Version: {{version}}": "  Versión de la configuración: {{version}}",
  "  Status: API key configured\n": "  Estado: API key configurada\n",
  "⚠  Authentication Method: Alibaba Cloud Coding Plan (Incomplete)":
    "⚠  Método de autenticación: Coding Plan de Alibaba Cloud (incompleto)",
  "  Issue: API key not found in environment or settings\n":
    "  Problema: no se encuentra la API key ni en el entorno ni en los ajustes\n",
  "  Run `qwen auth coding-plan` to re-configure.\n":
    "  Ejecuta `jpcode auth coding-plan` para volver a configurarlo.\n",
  "✓ Authentication Method: {{type}}": "✓ Método de autenticación: {{type}}",
  "  Status: Configured\n": "  Estado: configurado\n",
  "Failed to check authentication status: {{error}}":
    "No se pudo comprobar el estado de la autenticación: {{error}}",
  "Select an option:": "Elige una opción:",
  "Raw mode not available. Please run in an interactive terminal.":
    "El modo sin interfaz no está disponible. Ejecuta esto en una terminal interactiva.",
  "(Use ↑ ↓ arrows to navigate, Enter to select, Ctrl+C to exit)\n":
    "(Usa las flechas ↑ ↓ para moverte, Enter para elegir, Ctrl+C para salir)\n",

  /* ---- /config ---- */
  "Get or set any setting by dot-path key":
    "Lee o pon cualquier ajuste con la clave de ruta con puntos",
  "Invalid boolean value: \"{{value}}\". Use \"true\" or \"false\".":
    "Valor booleano no válido: «{{value}}». Usa \"true\" o \"false\".",
  "Cannot toggle a number setting. Provide a value: key=<number>.":
    "Un ajuste numérico no se puede alternar. Da un valor: clave=<número>.",
  "Invalid number value: \"{{value}}\".": "Valor numérico no válido: «{{value}}».",
  "Cannot toggle a string setting. Provide a value: key=<value>.":
    "Un ajuste de texto no se puede alternar. Da un valor: clave=<valor>.",
  "Cannot toggle an enum setting. Provide one of: {{options}}.":
    "Un ajuste de tipo lista no se puede alternar. Da uno de estos: {{options}}.",
  "Invalid enum value: \"{{value}}\". Valid values: {{options}}.":
    "Valor no válido en la lista: «{{value}}». Valores válidos: {{options}}.",
  "Setting \"{{type}}\" type cannot be set via /config. Edit settings.json directly.":
    "Los ajustes de tipo «{{type}}» no se pueden cambiar con /config. Edítalos en settings.json.",
  "Unsupported setting type: \"{{type}}\".": "Tipo de ajuste no admitido: «{{type}}».",
  "Available settings:": "Ajustes disponibles:",
  "Unknown setting key: \"{{key}}\". Did you mean \"{{suggestion}}\"?":
    "Clave de ajuste desconocida: «{{key}}». ¿Querías decir «{{suggestion}}»?",
  "Unknown setting key: \"{{key}}\".": "Clave de ajuste desconocida: «{{key}}».",
  "Failed to set \"{{key}}\": {{error}}": "No se pudo poner «{{key}}»: {{error}}",
  "Set {{key}} = {{value}}": "{{key}} = {{value}}",
  "(This setting requires a restart to take effect.)":
    "(Este ajuste necesita reiniciar para surtir efecto.)",
  "(Security-sensitive setting — verify you are not exposing credentials.)":
    "(Ajuste delicado: comprueba que no estás dejando credenciales a la vista.)",
  "Setting tools.approvalMode to \"yolo\" is blocked via /config for security reasons. Edit settings.json directly if you understand the risks.":
    "Poner tools.approvalMode a \"yolo\" está bloqueado por /config por seguridad. Edítalo en settings.json si entiendes el riesgo.",
  "(empty)": "(vacío)",
  Global: "Global",

  /* ---- extensions y modos ---- */
  "Unknown extensions source: {{source}}.": "Origen de extensiones desconocido: {{source}}.",
  "Would open extensions page in your browser: {{url}} (skipped in test environment)":
    "Se abriría la página de extensiones en el navegador: {{url}} (se omite en el entorno de pruebas)",
  "View available extensions at {{url}}": "Mira las extensiones disponibles en {{url}}",
  "Opening extensions page in your browser: {{url}}":
    "Abriendo la página de extensiones en el navegador: {{url}}",
  "Failed to open browser. Check out the extensions gallery at {{url}}":
    "No se pudo abrir el navegador. Mira la galería de extensiones en {{url}}",
  "Alibaba Cloud (alibabacloud.com)": "Alibaba Cloud (alibabacloud.com)",
  "Switch to plan mode or exit plan mode":
    "Cambiar al modo plan o salir del modo plan",
  "Choose the output style that shapes how responses are written ({{styles}}, or a custom style name).":
    "Elige el estilo de salida que da forma a las respuestas ({{styles}}, o el nombre de un estilo propio).",
  "Set or control a session goal": "Pon o controla el objetivo de la sesión",

  /* ---- modo plan, memoria y diagnóstico ---- */
  Skills: "Habilidades",
  "Enabled plan mode. The agent will analyze and plan without executing tools.":
    "Modo plan activado. El agente analizará y planificará sin ejecutar herramientas.",
  "Already in plan mode. Use \"/plan exit\" to exit plan mode.":
    "Ya estás en modo plan. Usa \"/plan exit\" para salir.",
  "Not in plan mode. Use \"/plan\" to enter plan mode first.":
    "No estás en modo plan. Usa \"/plan\" para entrar primero.",
  "Set up jpcode's status line UI": "Configurar la StatusLine de jpcode",
  "Open the memory manager.": "Abre el gestor de memoria.",
  "Show current process memory diagnostics":
    "Muestra el diagnóstico de memoria del proceso",

  /* ---- actualización y rollback ---- */
  "Record a CPU profile for Chrome DevTools analysis":
    "Graba un perfil de CPU para analizarlo en Chrome DevTools",
  "Roll back a standalone update to the previous version":
    "Deshaz una actualización independiente y vuelve a la versión anterior",
  "Rollback is not available in ACP mode.":
    "La vuelta atrás no está disponible en modo ACP.",
  "Rollback is only available for standalone installations.":
    "La vuelta atrás solo está disponible en instalaciones independientes.",
  "Rollback successful. Restart your terminal to use the previous version.":
    "Vuelta atrás correcta. Reinicia el terminal para usar la versión anterior.",
  "Rollback failed:": "Falló la vuelta atrás:",
  "Rollback on Windows requires manual intervention. Rename qwen-code.old to qwen-code in your installation directory.":
    "En Windows la vuelta atrás hay que hacerla a mano. Renombra qwen-code.old a qwen-code en tu directorio de instalación.",
  "Save a durable memory to the memory system.":
    "Guarda una memoria duradera en el sistema de memoria.",
  "Ask a quick side question without affecting the main conversation":
    "Haz una pregunta rápida sin tocar la conversación principal",

  /* ---- /advisor ---- */
  "Get a second opinion on the current conversation from a reviewer model":
    "Pide una segunda opinión sobre la conversación actual a un modelo revisor",
  "Configure the Advisor model": "Configura el modelo del asesor",
  "Disable Advisor": "Desactivar el asesor",
  "Select Advisor Model": "Elegir el modelo del asesor",
  "Advisor disabled": "Asesor desactivado",
  "Advisor set to {{model}}": "Asesor puesto a {{model}}",
  "Selected Advisor model is unavailable.":
    "El modelo del asesor elegido no está disponible.",
  "Advisor configuration is unavailable.":
    "La configuración del asesor no está disponible.",
  "Consulting advisor...": "Consultando al asesor…",
  "Advisor review failed: {{error}}": "Falló la revisión del asesor: {{error}}",
  "No conversation context available for /advisor":
    "No hay contexto de conversación para /advisor",
  "Focus too long (max {{max}} chars)": "El foco es demasiado largo (máx. {{max}} caracteres)",
  "Another operation is in progress, wait for it to complete before running /advisor":
    "Hay otra operación en marcha: espera a que termine antes de ejecutar /advisor",
  "No response received.": "No se ha recibido ninguna respuesta.",
  "No model configured.": "No hay ningún modelo configurado.",

  /* ---- /arena ---- */
  "Manage Arena sessions": "Gestiona las sesiones de Arena",
  "Start an Arena session with multiple models competing on the same task":
    "Arranca una sesión de Arena con varios modelos compitiendo en la misma tarea",
  "Stop the current Arena session": "Para la sesión de Arena actual",
  "Show the current Arena session status": "Muestra el estado de la sesión de Arena actual",
  "Select a model result and merge its diff into the current workspace":
    "Elige el resultado de un modelo y fusiona su diff con el espacio de trabajo actual",
  "No running Arena session found.": "No hay ninguna sesión de Arena corriendo.",
  "No Arena session found. Start one with /arena start.":
    "No hay ninguna sesión de Arena. Arranca una con /arena start.",
  "Arena session is still running. Wait for it to complete or use /arena stop first.":
    "La sesión de Arena sigue corriendo. Espera a que termine o usa /arena stop primero.",
  "No successful agent results to select from. All agents failed or were cancelled.":
    "No hay resultados correctos de agentes que elegir. Todos fallaron o se cancelaron.",
  "Use /arena stop to end the session.": "Usa /arena stop para terminar la sesión.",
  "No idle agent found matching \"{{name}}\".":
    "No hay ningún agente libre que se llame «{{name}}».",
  "Failed to apply changes from {{label}}: {{error}}":
    "No se pudieron aplicar los cambios de {{label}}: {{error}}",
  "Applied changes from {{label}} to workspace. Arena session complete.":
    "Se aplicaron al espacio de trabajo los cambios de {{label}}. Sesión de Arena terminada.",
  "Discard all Arena results and clean up worktrees?":
    "¿Descartar todos los resultados de Arena y limpiar los worktrees?",
  "Arena results discarded. All worktrees cleaned up.":
    "Resultados de Arena descartados. Worktrees limpiados.",
  "Arena is not supported in non-interactive mode. Use interactive mode to start an Arena session.":
    "Arena no funciona en el modo sin interfaz. Usa el modo interactivo para arrancar una sesión de Arena.",
  "Arena is not supported in non-interactive mode. Use interactive mode to stop an Arena session.":
    "Arena no funciona en el modo sin interfaz. Usa el modo interactivo para parar una sesión de Arena.",
  "Arena is not supported in non-interactive mode.":
    "Arena no funciona en el modo sin interfaz.",
  "An Arena session exists. Use /arena stop or /arena select to end it before starting a new one.":
    "Ya hay una sesión de Arena. Usa /arena stop o /arena select para terminarla antes de arrancar otra.",
  "Usage: /arena start --models model1,model2 <task>":
    "Uso: /arena start --models modelo1,modelo2 <tarea>",
  "Models to compete (required, at least 2)":
    "Los modelos que compiten (obligatorio, al menos 2)",
  "Format: authType:modelId or just modelId":
    "Formato: tipoAuth:idModelo, o solo idModelo",
  "Arena requires at least 2 models. Use --models model1,model2 to specify.":
    "Arena necesita al menos 2 modelos. Usa --models modelo1,modelo2 para indicarlos.",
  "Arena started with {{count}} agents on task: \"{{task}}\"\nModels:\n{{modelList}}":
    "Arena arrancada con {{count}} agentes en la tarea: «{{task}}»\nModelos:\n{{modelList}}",
  "Arena panes are running in tmux. Attach with: `{{command}}`":
    "Los paneles de Arena corren en tmux. Enganchate con: `{{command}}`",
  "[{{label}}] failed: {{error}}": "[{{label}}] falló: {{error}}",

  /* ---- sugerencias ---- */
  "Loading suggestions...": "Cargando sugerencias…",
  "Show per-item context usage breakdown.":
    "Muestra el desglose del uso del contexto elemento a elemento.",

  /* ---- resumen de sesión ---- */
  "No compression needed.": "No hace falta comprimir nada.",
  "Session duration: {{duration}}": "Duración de la sesión: {{duration}}",
  "Prompts: {{count}}": "Prompts: {{count}}",
  "API requests: {{count}}": "Peticiones a la API: {{count}}",
  "Tokens — prompt: {{prompt}}, output: {{output}}":
    "Tokens — prompt: {{prompt}}, salida: {{output}}",
  "Tool calls: {{total}} ({{success}} ok, {{fail}} fail)":
    "Llamadas a herramientas: {{total}} ({{success}} bien, {{fail}} mal)",
  "Files: +{{added}} / -{{removed}} lines":
    "Ficheros: +{{added}} / -{{removed}} líneas",
  prompt: "prompt",
  output: "salida",
  cached: "en caché",
  "Estimated cost: ${{cost}}": "Coste estimado: ${{cost}}",
  "No model usage data yet.": "Todavía no hay datos de uso de modelos.",
  "No tool usage data yet.": "Todavía no hay datos de uso de herramientas.",
  Models: "Modelos",
  "All time": "Todo",
  "Last 7 days": "Últimos 7 días",
  "Last 30 days": "Últimos 30 días",
  "N/A": "n/d",
  Sessions: "Sesiones",
  days: "días",
  Input: "Entrada",
  "Tool calls": "Llamadas a herramientas",
  "Code changes": "Cambios de código",
  Projects: "Proyectos",
  Name: "Nombre",
  Duration: "Duración",
  "Activity Heatmap": "Mapa de actividad",
  "Loading stats...": "Cargando estadísticas…",
  "↑ tabs · r to cycle dates · esc to close":
    "↑ pestañas · r para cambiar de fecha · esc para cerrar",
  Cost: "Coste",
  Less: "Menos",
  More: "Más",
  "(no data)": "(sin datos)",
  d: "d",
  h: "h",
  m: "m",
  "tab · esc": "tab · esc",
  "tab · r dates · ←→ month · esc":
    "tab · r fechas · ←→ mes · esc",
  "tab · r dates · esc": "tab · r fechas · esc",
  Session: "Sesión",
  Activity: "Actividad",
  Efficiency: "Eficiencia",
  Success: "Correcto",
  Today: "Hoy",
  "Cache Hit Rate": "Tasa de acierto de la caché",
  "Tool Success": "Herramientas correctas",
  "Tool Leaderboard": "Ranking de herramientas",
  Time: "Tiempo",
  Cache: "Caché",
  Latency: "Latencia",
  "Code Impact": "Impacto en el código",
  "Failed to load stats. Press r to retry.":
    "No se pudieron cargar las estadísticas. Pulsa r para reintentar.",
  net: "neto",
  streak: "racha",
  best: "mejor",
  "Token Trend": "Tendencia de tokens",
  "In/Out": "Ent./Sal.",
  "API Requests": "Peticiones a la API",
  "Success rate": "Tasa de éxito",

  /* ---- /update ---- */
  "Check for jpcode updates and install if available":
    "Comprueba si hay actualizaciones de jpcode e instálalas si las hay",
  "jpcode update available! {{current}} → {{latest}}":
    "¡Hay actualización de jpcode! {{current}} → {{latest}}",
  "A new version of jpcode is available! {{current}} → {{latest}}":
    "¡Hay una versión nueva de jpcode! {{current}} → {{latest}}",
  "jpcode {{version}} is up to date!": "jpcode {{version}} ya está al día!",
  "Failed to check for updates ({{reason}}). Please check your network or registry configuration.":
    "No se pudo comprobar si hay actualizaciones ({{reason}}). Revisa tu red o la configuración del registro.",
  "Update check skipped ({{reason}}) — run /update to retry.":
    "Se saltó la comprobación ({{reason}}): ejecuta /update para reintentar.",
  "registry did not respond within {{seconds}}s":
    "el registro no respondió en {{seconds}} s",
  "registry unreachable": "no se llega al registro",
  "registry error": "error del registro",
  "Unable to check for updates: {{reason}}":
    "No se puede comprobar si hay actualizaciones: {{reason}}",
  "Update successful! The new version will be used on your next run.":
    "¡Actualización correcta! La versión nueva se usará la próxima vez que lo arranques.",
  "Update downloaded. It will be applied after you exit this session.":
    "Actualización descargada. Se aplicará cuando salgas de esta sesión.",
  "Update failed: {{error}}": "Falló la actualización: {{error}}",
  "Downloading update...": "Descargando la actualización…",
  "Update successful! Please restart jpcode to use the new version. Switching model providers before restarting may not work correctly.":
    "¡Actualización correcta! Reinicia jpcode para usar la versión nueva. Cambiar de proveedor de modelos antes de reiniciar puede no funcionar bien.",
  "Automatic update failed. Please try updating manually.":
    "Falló la actualización automática. Prueba a actualizar a mano.",
  "Automatic update failed: {{error}}. Re-run the installer to update manually.":
    "Falló la actualización automática: {{error}}. Vuelve a ejecutar el instalador para actualizar a mano.",
  "Running from a local git clone. Please update with \"git pull\".":
    "Estás corriendo desde un clon git local. Actualiza con \"git pull\".",
  "Running via npx, update not applicable.":
    "Estás usando npx, la actualización automática no aplica.",
  "Running via pnpx, update not applicable.":
    "Estás usando pnpx, la actualización automática no aplica.",
  "Running via bunx, update not applicable.":
    "Estás usando bunx, la actualización automática no aplica.",
  "Installed via Homebrew. Please update with \"brew upgrade\".":
    "Instalado con Homebrew. Actualiza con \"brew upgrade\".",
  "Locally installed. Please update via your project's package.json.":
    "Instalado en local. Actualiza desde el package.json de tu proyecto.",
  "Update requires sudo. Please run:": "La actualización necesita sudo. Ejecuta:",
  "Standalone install detected. Attempting to automatically update now...":
    "Instalación independiente detectada. Intentando actualizar automáticamente…",
  "Standalone install detected. Please rerun the standalone installer to update:":
    "Instalación independiente detectada. Vuelve a ejecutar el instalador para actualizar:",
  "Run the following to update:": "Ejecuta esto para actualizar:",
  "Unable to auto-update this standalone installation. Please reinstall from:":
    "No se puede actualizar automáticamente esta instalación independiente. Reinstala desde:",
  "Manual update required. Please reinstall jpcode.":
    "Hace falta actualizar a mano. Reinstala jpcode.",
  "This session uses the custom sandbox image {{image}}. Update that image and restart jpcode.":
    "Esta sesión usa la imagen de sandbox personalizada {{image}}. Actualiza esa imagen y reinicia jpcode.",
  "Update jpcode on the host, then restart the sandbox.":
    "Actualiza jpcode en la máquina y luego reinicia el sandbox.",
  "The update will be installed after you exit this session.":
    "La actualización se instalará cuando salgas de esta sesión.",
  "Run /update to install the update on the host.":
    "Ejecuta /update para instalarla en la máquina.",
  "Run /update to install the update.": "Ejecuta /update para instalar la actualización.",

  /* ---- huecos en el historial ---- */
  "⚠️ History gap: earlier conversation was lost before this point (storage interruption) and could not be recovered.":
    "⚠️ Hueco en el historial: se perdió la conversación anterior a este punto (el almacenamiento se interrumpió) y no se ha podido recuperar.",

  /* ---- contadores ---- */
  "{{count}} extension": "{{count}} extensión",
  "{{count}} extensions": "{{count}} extensiones",
  "{{count}} command": "{{count}} comando",
  "{{count}} commands": "{{count}} comandos",
  "{{count}} skill": "{{count}} habilidad",
  "{{count}} skills": "{{count}} habilidades",
  "{{count}} agent": "{{count}} agente",
  "{{count}} agents": "{{count}} agentes",
  "{{count}} workflow": "{{count}} flujo",
  "{{count}} workflows": "{{count}} flujos",
  "{{count}} hook": "{{count}} hook",
  "{{count}} hooks": "{{count}} hooks",
  "{{count}} extension MCP server": "{{count}} servidor MCP de extensión",
  "{{count}} extension MCP servers": "{{count}} servidores MCP de extensiones",
  "{{count}} extension LSP server": "{{count}} servidor LSP de extensión",
  "{{count}} extension LSP servers": "{{count}} servidores LSP de extensiones",

  /* ---- recargar extensiones ---- */
  "Reload extension changes from disk": " recarga los cambios de las extensiones del disco",
  "Reloaded extensions: {{summary}}": "Extensiones recargadas: {{summary}}",
  "Reload failed: {{message}}": "Falló la recarga: {{message}}",
  "Reload failed.": "Falló la recarga.",
  "Extensions changed on disk. Run /reload-plugins to apply updates.":
    "Las extensiones cambiaron en el disco. Ejecuta /reload-plugins para aplicar los cambios.",
  "Failed to refresh extension content: {{message}}. Run /reload-plugins to apply updates.":
    "No se pudo actualizar el contenido de las extensiones: {{message}}. Ejecuta /reload-plugins para aplicar los cambios.",
  "Failed to refresh extension content. Run /reload-plugins to apply updates.":
    "No se pudo actualizar el contenido de las extensiones. Ejecuta /reload-plugins para aplicar los cambios.",
  "Extension reload did not complete. Run /reload-plugins to try again.":
    "La recarga de extensiones no terminó. Ejecuta /reload-plugins para intentarlo otra vez.",

  /* ---- tareas programadas ---- */
  "Precondition check": "Comprobación de la precondición",
  "Precondition not met — this scheduled run was skipped.":
    "No se cumple la precondición: se ha saltado esta ejecución programada.",
  "The precondition check was cancelled — this scheduled run was skipped.":
    "Se canceló la comprobación de la precondición: se ha saltado esta ejecución programada.",
  "The precondition check was interrupted — this scheduled run was skipped.":
    "Se interrumpió la comprobación de la precondición: se ha saltado esta ejecución programada.",
  "The precondition check failed — this scheduled run was skipped.":
    "Falló la comprobación de la precondición: se ha saltado esta ejecución programada.",
  "Running this scheduled task in a new session: {{link}}":
    "Esta tarea programada se está ejecutando en una sesión nueva: {{link}}",
  "This scheduled run could not be started: {{error}}":
    "No se pudo arrancar esta ejecución programada: {{error}}",

  /* ---- registro de sesión ---- */
  "Session recording stopped after a write failure. New messages for the affected session will not be saved. Check disk space and permissions, then start a new session to resume recording. See the debug log for details.":
    "El registro de la sesión se paró tras un fallo de escritura. Los mensajes nuevos de esa sesión no se guardarán. Revisa el espacio en disco y los permisos, y empieza una sesión nueva para retomar el registro. Mira el registro de depuración para más detalles.",
  "Session recording stopped after a write failure. New messages for the affected session will not be saved. Check disk space and permissions, then run `/clear` to start a new recorded session. See the debug log for details.":
    "El registro de la sesión se paró tras un fallo de escritura. Los mensajes nuevos de esa sesión no se guardarán. Revisa el espacio en disco y los permisos, y ejecuta `/clear` para empezar una sesión registrada nueva. Mira el registro de depuración para más detalles.",

  /* ---- curador de habilidades ---- */
  "Maintain project auto-skills based on recent use.":
    "Mantiene las auto-habilidades del proyecto según el uso reciente.",
  "Show project auto-skill lifecycle status.":
    "Muestra el estado del ciclo de vida de las auto-habilidades del proyecto.",
  "Run project auto-skill lifecycle maintenance.":
    "Ejecuta el mantenimiento del ciclo de vida de las auto-habilidades del proyecto.",
  "Restore an archived project auto-skill.":
    "Restaura una auto-habilidad del proyecto archivada.",
  "Auto-skill curator": "Curador de auto-habilidades",
  "Last run: {{time}}": "Última vez: {{time}}",
  "Active: {{count}}": "Activas: {{count}}",
  "Stale: {{count}}": "Rancias: {{count}}",
  "Archived: {{count}}": "Archivadas: {{count}}",
  "Stale skills:": "Habilidades rancias:",
  "Pinned skills:": "Habilidades fijadas:",
  "Archived skills:": "Habilidades archivadas:",
  "Dry run complete.": "Simulación terminada.",
  "Curator run complete.": "Curador terminado.",
  "Checked: {{count}}": "Revisadas: {{count}}",
  "First observed: {{count}}": "Vistas por primera vez: {{count}}",
  "Marked stale: {{count}}": "Marcadas como rancia: {{count}}",
  "Reactivated: {{count}}": "Reactivadas: {{count}}",
  "Skipped archive collisions: {{count}}": "Colisiones al archivar omitidas: {{count}}",
  "Archive candidates:": "Candidatas a archivar:",
  "Skipped archive collisions:": "Colisiones al archivar omitidas:",
  "Skipped rename errors: {{count}}": "Errores de renombrado omitidos: {{count}}",
  "Skipped rename errors:": "Errores de renombrado omitidos:",
  "{{verb}}: {{count}}": "{{verb}}: {{count}}",
  "Would archive": "Se archivarían",
  Archived: "Archivadas",
  "Failed to read auto-skill curator status: {{message}}":
    "No se pudo leer el estado del curador de auto-habilidades: {{message}}",
  "Usage: /curator run [--dry-run]": "Uso: /curator run [--dry-run]",
  "Failed to run auto-skill curator: {{message}}":
    "No se pudo ejecutar el curador de auto-habilidades: {{message}}",
  "Usage: /curator restore <directory>": "Uso: /curator restore <directorio>",
  "Restored auto-skill: {{name}}": "Auto-habilidad restaurada: {{name}}",
  "Failed to restore auto-skill: {{message}}":
    "No se pudo restaurar la auto-habilidad: {{message}}",
  "Exclude an auto-skill from automatic maintenance.":
    "Saca una auto-habilidad del mantenimiento automático.",
  "Return a pinned auto-skill to automatic maintenance.":
    "Devuelve una auto-habilidad fijada al mantenimiento automático.",
  "Usage: /curator pin <directory>": "Uso: /curator pin <directorio>",
  "Usage: /curator unpin <directory>": "Uso: /curator unpin <directorio>",
  "Pinned auto-skill: {{name}}": "Auto-habilidad fijada: {{name}}",
  "Unpinned auto-skill: {{name}}": "Auto-habilidad desfijada: {{name}}",
  "Failed to update auto-skill pin: {{message}}":
    "No se pudo cambiar el estado de fijado: {{message}}",
  "Auto-skill curator changes are disabled in safe mode.":
    "Los cambios del curador de auto-habilidades están desactivados en el modo seguro.",
  "Auto-skill curator changes are only available in trusted workspaces. Trust this folder via `/trust` and try again.":
    "Los cambios del curador de auto-habilidades solo están disponibles en espacios de trabajo de confianza. Marca esta carpeta como de fianza con `/trust` e inténtalo otra vez.",
  "Kept model as {{model}}": "Se ha mantenido el modelo {{model}}",
  "Review messages held from other jpcode sessions (accept | deny), and manage trusted controllers (controllers | revoke)":
    "Revisa los mensajes retenidos de otras sesiones de jpcode (aceptar | denegar) y gestiona los controladores de confianza (controladores | revocar)",
  "Create a git commit with an AI-drafted message":
    "Crea un commit de git con un mensaje redactado por la IA",
  "Exited plan mode. Previous approval mode restored.":
    "Has salido del modo plan. Se ha vuelto al modo de aprobación anterior.",
  "Success Rate": "Tasa de éxito",
  Shell: "Shell",
  Monitor: "Monitor",
  Command: "Comando",

  /* ---- las últimas siete ---- */
  "Set how hard reasoning-capable models think ({{tiers}}); mapped and clamped per provider.":
    "Marca cuánto_piensa un modelo capaz de razonar ({{tiers}}); se traduce y se limita según el proveedor.",
  "Tool Calls": "Llamadas a herramientas",
  "Code Changes": "Cambios de código",
  Tool: "Herramienta",
  reqs: "pet.",
  in: "ent.",
  out: "sal.",

  /* ==========================================================================
   * Claves que el motor pide y el catálogo inglés no define.
   *
   * Estas 456 no salen de en-PWGNWPOM.js: el motor llama a `t("...")` con ellas
   * directamente, así que incluso en inglés se ven tal cual. Al no estar en el
   * catálogo, `t()` devuelve la propia clave, y aquí está traducida.
   * ======================================================================== */

  /* ---- sufijos y pistas entre paréntesis ---- */
  "  - Or configure modelProviders in settings.json":
    "  - O configura modelProviders en settings.json",
  "  - Run /auth to set up a Coding Plan (includes multiple models)":
    "  - Ejecuta /auth para montar un Coding Plan (incluye varios modelos)",
  "  {{name}}: {{count}} ({{success}} ok, {{fail}} fail)":
    "  {{name}}: {{count}} ({{success}} bien, {{fail}} mal)",
  " (deleted)": " (borrado)",
  " (new)": " (nuevo)",
  " (oversized — diff omitted)": " (demasiado grande: no se enseña el diff)",
  " (truncated)": " (cortado)",
  " (untracked)": " (sin seguimiento)",
  " (endpoint not saved: project settings are shared)":
    " (el endpoint no se guarda: los ajustes del proyecto son compartidos)",
  "'{{model}}' is the current primary model and cannot be used as the vision bridge.":
    "«{{model}}» es el modelo principal ahora mismo y no se puede usar como puente de visión.",
  "(Tab to clear)": "(Tab para quitar)",
  "(Tab to switch)": "(Tab para cambiar)",
  "(Use Enter to select, Esc to cancel)":
    "(Usa Enter para elegir, Esc para cancelar)",
  "(applied across all providers; clamped per model)":
    "(se aplica a todos los proveedores; se limita por modelo)",
  "(applies now and persists to settings)":
    "(aplica ahora y se guarda en los ajustes)",
  "(branch: {{branch}})": "(rama: {{branch}})",
  "(click or {{keyHint}} to expand)": "(haz clic o {{keyHint}} para desplegar)",
  "(git diff HEAD)": "(git diff HEAD)",
  "(no description)": "(sin descripción)",
  "(no phase recorded yet)": "(todavía no hay fase registrada)",
  "(no phase)": "(sin fase)",
  "(none)": "(ninguno)",
  "(on demand)": "(bajo demanda)",
  "(type a name)": "(escribe un nombre)",
  "({{count}} matches)": "({{count}} coincidencias)",
  "({{count}} turns)": "({{count}} turnos)",
  "({{keyHint}} to collapse)": "({{keyHint}} para plegar)",
  "({{keyHint}} to expand)": "({{keyHint}} para desplegar)",
  "(←/→ to switch)": "(←/→ para cambiar)",
  "(←/→ to switch, ↓ to return)": "(←/→ para cambiar, ↓ para volver)",
  "(↑ to switch tabs)": "(↑ para cambiar de pestaña)",

  /* ---- extensiones ---- */
  "**Installed Extensions ({{total}} total, {{active}} active)**":
    "**Extensiones instaladas ({{total}} en total, {{active}} activas)**",
  "+{{count}} more (run /stats for the full list)":
    "+{{count}} más (ejecuta /stats para ver la lista entera)",
  "/extensions explore is only available in interactive mode.":
    "/extensions explore solo está disponible en el modo interactivo.",
  "/extensions install is only available in interactive mode.":
    "/extensions install solo está disponible en el modo interactivo.",
  "/rename --auto does not take a name. Use `/rename <name>` to set a name yourself.":
    "/rename --auto no acepta un nombre. Usa `/rename <nombre>` para ponerlo tú.",
  "All skills are marked as non-user-invocable.":
    "Todas las habilidades están marcadas como no invocables por quien las usa.",
  "Arena requires at least 2 models. To add more:":
    "Arena necesita al menos 2 modelos. Para añadir más:",
  "Approve all pending servers in this workspace":
    "Aprobar todos los servidores pendientes de este espacio de trabajo",
  "Approve all will trust these servers:":
    "Aprobar todos marcará estos servidores como de confianza:",
  "Approve this server": "Aprobar este servidor",
  "Manage installed extensions on the Installed tab.":
    "Gestiona las extensiones instaladas en la pestaña Instaladas.",
  "Marketplace: {{name}}": "Mercado: {{name}}",
  "Matching endpoints: {{endpoints}}.": "Endpoints coincidentes: {{endpoints}}.",
  "Import MCP servers from Claude configs.":
    "Importa servidores MCP de la configuración de Claude.",
  "Import failed: {{error}}": "Falló la importación: {{error}}",
  "Imported {{count}} MCP server(s) to {{scope}} settings: {{names}}":
    "Se importaron {{count}} servidor(es) MCP a los ajustes de {{scope}}: {{names}}",
  "Extension was installed but could not be reloaded: {{error}}":
    "La extensión se instaló pero no se pudo recargar: {{error}}",
  "Installed {{count}} extension(s) with warnings: {{detail}}":
    "Se instalaron {{count}} extensión(es) con avisos: {{detail}}",
  "Failed to read extensions: {{error}}":
    "No se pudieron leer las extensiones: {{error}}",

  /* ---- proveedores y autenticación ---- */
  "API client": "Cliente de la API",
  "API key": "API key",
  "API key: configured ({{envKey}})": "API key: configurada ({{envKey}})",
  "API key: {{envKey}} not set": "API key: {{envKey}} no está puesta",
  Authentication: "Autenticación",
  "Anthropic Messages API format": "Formato de la API Messages de Anthropic",
  "Anthropic-compatible": "Compatible con Anthropic",
  "Chat Completions": "Chat Completions",
  "Gemini-compatible": "Compatible con Gemini",
  "Google Gemini API format": "Formato de la API de Google Gemini",
  "Check auth status": "Comprobar el estado de la autenticación",
  "Choose a built-in provider and connect with an API key":
    "Elige un proveedor integrado y conéctalo con una API key",
  "Manually connect a local server, proxy, or unsupported provider":
    "Conecta a mano un servidor local, un proxy o un proveedor no admitido",
  "Credentials resolved from settings/env; use /model to switch.":
    "Credenciales sacadas de los ajustes o del entorno; usa /model para cambiar.",
  "Configure authentication (removed)": "Configurar la autenticación (retirado)",
  "Configure more models with the modelProviders guide:":
    "Configura más modelos con la guía de modelProviders:",
  "Custom Provider": "Proveedor a medida",
  "Alibaba ModelStudio": "Alibaba ModelStudio",
  "Built-in Provider Updates": "Actualizaciones de proveedores integrados",
  "CI / Headless": "CI / sin interfaz",
  Interactive: "Interactivo",
  "China: https://coding.dashscope.aliyuncs.com/v1":
    "China: https://coding.dashscope.aliyuncs.com/v1",
  "International: https://coding-intl.dashscope.aliyuncs.com/v1":
    "Internacional: https://coding-intl.dashscope.aliyuncs.com/v1",
  "China: https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1":
    "China: https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
  "International: https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1":
    "Internacional: https://token-plan.ap-southeast-1.maas.aliyuncs.com/com1/v1",

  /* ---- modelo y modalities ---- */
  "Approval Mode": "Modo de aprobación",
  Approve: "Aprobar",
  "Enable modality": "Activar la modalidad",
  "Enable thinking": "Activar el razonamiento",
  "Allows the model to perform extended reasoning before responding.":
    "Permite que el modelo razone más a fondo antes de responder.",
  "Enables multimodal input capabilities (image, video, etc.).":
    "Activa las capacidades de entrada multimodal (imagen, vídeo, etc.).",
  Endpoint: "Endpoint",
  "Base URL cannot be empty.": "La URL base no puede estar vacía.",
  "Base URL must start with http:// or https://.":
    "La URL base tiene que empezar por http:// o https://.",
  "Base URL: {{baseUrl}}": "URL base: {{baseUrl}}",
  "Enter the API endpoint for this protocol.":
    "Escribe el endpoint de la API para este protocolo.",
  "Model IDs": "IDs de modelo",
  "Model IDs cannot be empty.": "Los IDs de modelo no pueden estar vacíos.",
  "Model: ": "Modelo: ",
  "Model: {{model}}": "Modelo: {{model}}",
  "Model switched, but the selection could not be saved.":
    "Se cambió el modelo, pero no se pudo guardar la elección.",
  "Model parameters updated (context window, capabilities, etc.)":
    "Parámetros del modelo actualizados (ventana de contexto, capacidades, etc.)",
  "Max input tokens (leave empty to auto-detect from model name).":
    "Máximo de tokens de entrada (déjalo vacío para deducirlo del nombre del modelo).",
  "Enter model IDs directly. Use commas to configure multiple models.":
    "Escribe los IDs de modelo directamente. Usa comas para configurar varios modelos.",
  "Enter model IDs separated by commas.":
    "Escribe los IDs de modelo separados por comas.",
  "Enter model IDs separated by commas. Examples: {{modelIds}}":
    "Escribe los IDs de modelo separados por comas. Ejemplos: {{modelIds}}",
  "Image-only model '{{model}}' cannot be used in an Arena session.":
    "El modelo «{{model}}», que solo ve imágenes, no se puede usar en una sesión de Arena.",
  "Loading models from provider…": "Cargando los modelos del proveedor…",

  /* ---- compresión ---- */
  "Compaction thresholds": "Umbrales de compresión",
  "Auto threshold": "Umbral automático",
  "Hard threshold": "Umbral estricto",
  "Effective window": "Ventana efectiva",
  "Current tier": "Nivel actual",
  Estimated: "Estimado",
  "Compression instructions were truncated to {{max}} characters.":
    "Las instrucciones de compresión se cortaron a {{max}} caracteres.",

  /* ---- sesiones ---- */
  "Branched conversation{{titleInfo}}. You are now in the branch.":
    "Conversación ramificada{{titleInfo}}. Ahora estás en la rama.",
  "Could not generate a title.": "No se pudo generar un título.",
  "Current active session skipped.":
    "Se saltó la sesión activa actual.",
  "A batch delete is already in progress. Please wait.":
    "Ya hay un borrado por lotes en marcha. Espera.",
  "Cannot delete the current active session.":
    "No se puede borrar la sesión activa actual.",
  "Cannot run /recap while another operation is in progress.":
    "No se puede ejecutar /recap mientras hay otra operación en marcha.",
  "Cannot use both --project and --global. Choose one scope flag.":
    "No se pueden usar --project y --global a la vez. Elige un solo indicador de ámbito.",
  "Deleted {{count}} session(s).": "Se borraron {{count}} sesión(es).",
  "Deleting {{count}} session(s)...": "Borrando {{count}} sesión(es)…",
  "Failed to delete session.": "No se pudo borrar la sesión.",
  "Failed to delete session. Session not found.":
    "No se pudo borrar la sesión. No se encuentra.",
  "Failed to delete sessions: {{error}}":
    "No se pudieron borrar las sesiones: {{error}}",
  "Failed to delete {{failed}} session(s) ({{ids}}{{overflow}}){{reason}}.":
    "No se pudieron borrar {{failed}} sesión(es) ({{ids}}{{overflow}}){{reason}}.",
  "Failed to rename session.": "No se pudo renombrar la sesión.",
  "Failed to branch conversation: {{message}}":
    "No se pudo ramificar la conversación: {{message}}",
  "Failed to stash prompt.": "No se pudo guardar el prompt.",
  "Generating session title": "Generando el título de la sesión",
  "Let the fast model generate a sentence-case title from the conversation so far.":
    "Que el modelo rápido invente un título en minúsculas a partir de la conversación hasta ahora.",
  "No conversation to title yet — send at least one message first.":
    "Todavía no hay conversación que titular: envía primero al menos un mensaje.",
  "Loading sessions...": "Cargando las sesiones…",
  "Loading session preview...": "Cargando la vista previa de la sesión…",
  "Exit and restore corrupted file": "Salir y restaurar el fichero dañado",
  "Continue with empty settings (esc)": "Seguir con los ajustes vacíos (esc)",
  "Continue with recovered settings (esc)":
    "Seguir con los ajustes recuperados (esc)",
  "Failed to save update postponement: {{message}}":
    "No se pudo guardar el aplazamiento de la actualización: {{message}}",
  "Discontinued": "Retirado",
  Fail: "Falla",
  "Failed: {{error}}": "Falla: {{error}}",
  Cancelled: "Cancelado",
  "Content truncated - resize terminal to review":
    "Contenido cortado: redimensiona el terminal para verlo",

  /* ---- directorios ---- */
  "Directories already in workspace:\n- {{directories}}":
    "Directorios que ya están en el espacio de trabajo:\n- {{directories}}",
  "Add files or folders as context": "Añade archivos o carpetas al contexto",
  "Clear input or cancel operation": "Limpia la entrada o cancela la operación",
  "Cycle prompt history": "Recorre el historial de prompts",
  "Insert a newline": "Inserta una línea nueva",
  "Jump through words": "Salta de palabra en palabra",
  "Accept ghost text or completion": "Acepta el texto fantasma o el autocompletado",
  "For more help:": "Para más ayuda:",
  "Error notifying model of new directories: {{error}}":
    "Error al avisar al modelo de los directorios nuevos: {{error}}",
  "Error saving directories to workspace settings: {{error}}":
    "Error al guardar los directorios en los ajustes del espacio de trabajo: {{error}}",
  "Failed to process /directory add: {{message}}":
    "No se pudo procesar /directory add: {{message}}",

  /* ---- hints varios ---- */
  "Files": "Ficheros",
  "Filter: ": "Filtro: ",
  Git: "Git",
  Logs: "Registros",
  Memory: "Memoria",
  "Memory Diagnostics": "Diagnóstico de memoria",
  Documentation: "Documentación",
  "Doctor Report": "Informe del doctor",
  Configuration: "Configuración",
  "Config is not available.": "La configuración no está disponible.",
  "Config not available.": "Configuración no disponible.",
  "Advanced Config": "Configuración avanzada",
  "Matcher:": "Coincidencia:",
  Matchers: "Coincidencias",
  "Malformed rule: unbalanced parentheses. Use the format ToolName(specifier).":
    "Regla mal formada: los paréntesis no cuadran. Usa el formato NombreHerramienta(especificador).",
  "For scripts, pass an auth-qualified selector such as {{selector}}.":
    "Para scripts, pasa un selector con tipo de autenticación, como {{selector}}.",
  "Format: [authType:]modelId (e.g., openai:gpt-4o or just gpt-4o)":
    "Formato: [tipoAuth:]idModelo (p. ej. openai:gpt-4o, o solo gpt-4o)",
  "Discover is not yet available in the OpenTUI renderer.":
    "Descubrir todavía no funciona en el renderizador OpenTUI.",
  "Marketplace sources are not yet available in the OpenTUI renderer.":
    "Los orígenes de mercados todavía no funcionan en el renderizador OpenTUI.",
  "Browse built-in commands:": "Explora los comandos integrados:",
  "Browse custom, skill, plugin, and MCP commands:":
    "Explora los comandos propios, de habilidades, plugins y MCP:",
  "No commands are currently available.":
    "Ahora mismo no hay comandos disponibles.",
  "Enter to save, Esc to go back": "Enter para guardar, Esc para volver",
  "Checked:": "Revisado:",
  "Checked recommended models are applied on submit but not copied into the input.":
    "Los modelos recomendados marcados se aplican al enviar, pero no se copian al campo de texto.",

  /* ---- btw e insights ---- */
  "Failed to answer btw question: {{error}}":
    "No se pudo responder la pregunta de /btw: {{error}}",
  "No conversation context available for /btw":
    "No hay contexto de conversación para /btw",
  "Failed to generate insights: {{error}}":
    "No se pudieron generar las conclusiones: {{error}}",
  "Generating insights...": "Generando conclusiones…",
  "Insight report generated at: {{path}}":
    "Informe de conclusiones generado en: {{path}}",
  "Insight report generated successfully!":
    "¡Informe de conclusiones generado correctamente!",
  "Insights ready.": "Conclusiones listas.",
  "Failed to load output styles: {{error}}":
    "No se pudieron cargar los estilos de salida: {{error}}",
  "Loading output styles…": "Cargando los estilos de salida…",

  /* ---- loaders ---- */
  "Loading diff…": "Cargando el diff…",
  "Loading preview…": "Cargando la vista previa…",
  "Loading status…": "Cargando el estado…",
  "Failed to load status. Press r to retry.":
    "No se pudo cargar el estado. Pulsa r para reintentar.",
  "Binary file — no diff to view.":
    "Fichero binario: no hay diff que enseñar.",
  "Binary file — no diff.": "Fichero binario: no hay diff.",

  /* ---- dream y memoria ---- */
  "Dream completed.": "Sueño terminado.",
  "Failed to process /dream: {{message}}":
    "No se pudo procesar /dream: {{message}}",
  "Failed to process /forget: {{message}}":
    "No se pudo procesar /forget: {{message}}",
  "Failed to collect memory diagnostics":
    "No se pudo recoger el diagnóstico de memoria",
  "Could not retrieve skill manager.":
    "No se pudo obtener el gestor de habilidades.",
  "Available skills:": "Habilidades disponibles:",
  "Auto-generated skill — keep it?": "Habilidad generada automáticamente: ¿la conservas?",
  "Discard this skill": "Descartar esta habilidad",
  "Keep this skill": "Conservar esta habilidad",
  "Keep all remaining": "Conservar todas las demás",
  "Discard all remaining": "Descartar todas las demás",
  "Confirm auto-skills before saving: {{status}}":
    "Confirma las auto-habilidades antes de guardar: {{status}}",
  "It is saved but Learning is skipped in headless runs.":
    "Se guarda, pero en las ejecuciones sin interfaz se salta el aprendizaje.",

  /* ---- perfiles de CPU ---- */
  "CPU profile aborted but failed to stop cleanly":
    "El perfil de CPU se abortó pero no paró del todo",
  "CPU profile aborted early. Profile saved: {path}":
    "El perfil de CPU se abortó antes de tiempo. Guardado en: {path}",
  "CPU profile was stopped externally. Check ~/.qwen/cpu-profiles/ for the output.":
    "El perfil de CPU se paró desde fuera. Mira en ~/.jpcode/cpu-profiles/.",
  "CPU profile written:": "Perfil de CPU escrito en:",
  "CPU profiling is already in progress. Send SIGUSR1 or wait for it to complete.":
    "Ya hay un perfil de CPU en marcha. Envía SIGUSR1 o espera a que termine.",
  "CPU profiling is already in progress. Wait for it to complete.":
    "Ya hay un perfil de CPU en marcha. Espera a que termine.",
  "Heap snapshot failed:": "Falló la instantánea del heap:",
  "Heap snapshot written:": "Instantánea del heap escrita en:",

  /* ---- IDE y LSP ---- */
  "IDE connecting... context may be unavailable":
    "Conectando con el IDE… puede que el contexto no esté disponible",
  "IDE connection unavailable: {{message}}":
    "No se puede conectar con el IDE: {{message}}",
  "LSP is enabled, but server status is unavailable.":
    "El LSP está activado, pero no se puede saber el estado del servidor.",
  "LSP is not enabled. Start jpcode with `--experimental-lsp` to enable LSP support.":
    "El LSP no está activado. Arranca jpcode con `--experimental-lsp` para activarlo.",

  /* ---- varios ---- */
  "An error occurred during authentication. Please try again.":
    "Ha habido un error durante la autenticación. Inténtalo otra vez.",
  "Answering...": "Respondiendo…",
  "Check that the server process is running and configuration is correct.":
    "Comprueba que el proceso del servidor está corriendo y que la configuración es correcta.",
  "Git features will be limited.": "Las funciones de git estarán limitadas.",
  "Install ripgrep for faster file search: https://github.com/BurntSushi/ripgrep":
    "Instala ripgrep para buscar archivos más rápido: https://github.com/BurntSushi/ripgrep",
  "List workflow runs or cooperatively pause/resume a live run":
    "Lista las ejecuciones de flujos, o pausa/reanuda una de forma cooperativa",
  "Missing value for --from.": "Falta el valor de --from.",
  "All": "Todas",
  "Exit code": "Código de salida",
  "Duration must be between 1 and {max} seconds":
    "La duración tiene que estar entre 1 y {max} segundos",
  "Failed to open browser. View documentation at {{url}}":
    "No se pudo abrir el navegador. Mira la documentación en {{url}}",
  "MCP Servers": "Servidores MCP",
  "Input to command is JSON with tool_name, tool_input, tool_use_id, and reason.":
    "La entrada del comando es un JSON con tool_name, tool_input, tool_use_id y reason.",
  "Name is too long. Maximum {{max}} characters.":
    "El nombre es demasiado largo. Máximo {{max}} caracteres.",
  "Failed to update provider configuration: {{message}}":
    "No se pudo actualizar la configuración del proveedor: {{message}}",

  /* ---- el último tramo: hooks, diff, estilos y palabras sueltas ---- */
  "After all tool calls in a batch resolve":
    "Cuando terminen todas las llamadas a herramientas de un lote",
  "After an explicitly selected session is deleted":
    "Después de borrar una sesión elegida a mano",
  "After conversation compaction": "Después de comprimir la conversación",
  "No custom commands are currently available.":
    "Ahora mismo no hay comandos propios.",
  "No diff content available for this file.":
    "No hay contenido de diff para este fichero.",
  "No diff data yet.": "Todavía no hay datos de diff.",
  "No directories added.": "No se ha añadido ningún directorio.",
  "No effort configured — using the model/provider default.":
    "No hay esfuerzo configurado: se usa el del modelo o el del proveedor.",
  "No file changes were captured in this turn.":
    "En este turno no se capturaron cambios de archivos.",
  "No hooks configured for this matcher.":
    "No hay hooks configurados para esta coincidencia.",
  "No hooks configured. Add hooks in your settings.json file or invoke a skill with hooks.":
    "No hay hooks configurados. Añádelos en tu settings.json o invoca una habilidad que tenga hooks.",
  "No hunks available for {{path}}.": "No hay bloques de cambios en {{path}}.",
  "No matcher selected": "Ninguna coincidencia elegida",
  "No models available. Please configure models first.":
    "No hay modelos disponibles. Configura primero los modelos.",
  "No new Claude MCP servers imported into {{scope}} settings.":
    "No se importó ningún servidor MCP nuevo de Claude a los ajustes de {{scope}}.",
  "No recommended models match.":
    "Ningún modelo recomendado coincide.",
  "No sessions found": "No se encontraron sesiones",
  "No settings match your search.":
    "Ningún ajuste coincide con tu búsqueda.",
  "No skill calls have been made in this session.":
    "En esta sesión no se ha invocado ninguna habilidad.",
  "No skill usage data yet.": "Todavía no hay datos de uso de habilidades.",
  "No skills available": "No hay habilidades disponibles",
  "Node.js version": "Versión de Node.js",
  "Node.js v{{min}}+ is required. Current: {{version}}":
    "Se necesita Node.js v{{min}}+. Ahora: {{version}}",
  "Not enough conversation context for a recap yet.":
    "Todavía no hay contexto de conversación suficiente para un resumen.",
  "Note: Your selected model is being removed. Please choose a new one with /model.":
    "Nota: se está quitando el modelo que elegiste. Elige otro con /model.",
  "Note: qwen-oauth models are not supported in Arena.":
    "Nota: los modelos de qwen-oauth no funcionan en Arena.",
  OK: "OK",
  Off: "Apagado",
  "Official recommended setup: Coding Plan, Token Plan, or Standard API Key":
    "Configuración oficial recomendada: Coding Plan, Token Plan o una API key estándar",
  "Open in Chrome DevTools → Performance tab → Load profile":
    "Ábrelo en Chrome DevTools → pestaña Performance → Load profile",
  "OpenAI Responses API — streaming reasoning + tool use":
    "OpenAI Responses API: razonamiento en streaming + uso de herramientas",
  "OpenAI-compatible": "Compatible con OpenAI",
  OpenRouter: "OpenRouter",
  Requesty: "Requesty",
  "Optional: configure advanced generation settings.":
    "Opcional: configura los ajustes avanzados de generación.",
  "Origin:": "Origen:",
  "Other exit codes": "Otros códigos de salida",
  "Output Style": "Estilo de salida",
  "Output style cleared; responses use the default style.":
    "Estilo de salida borrado: las respuestas usan el estilo por defecto.",
  "Output style set to {{name}}.": "Estilo de salida puesto a {{name}}.",
  "Output styles are unavailable in --bare and --safe-mode.":
    "Los estilos de salida no funcionan en --bare ni en --safe-mode.",
  "Oversized file — diff omitted. Use `git diff` to inspect.":
    "Fichero demasiado grande: no se enseña el diff. Usa `git diff` para verlo.",
  Parent: "Padre",
  "Per-turn diffs are unavailable because file checkpointing is disabled.":
    "No hay diff por turno porque los puntos de control de archivos están desactivados.",
  Phases: "Fases",
  Platform: "Plataforma",
  "Please configure models in settings.modelProviders or use environment variables.":
    "Configura los modelos en settings.modelProviders o usa variables de entorno.",
  "Please provide a question. Usage: /btw <your question>":
    "Escribe una pregunta. Uso: /btw <tu pregunta>",
  "Please select at least 2 models to start an Arena session.":
    "Elige al menos 2 modelos para arrancar una sesión de Arena.",
  "Please wait while authentication completes...":
    "Espera mientras termina la autenticación…",
  "Press / to search": "Pulsa / para buscar",
  "Press Esc again to rewind conversation.":
    "Pulsa Esc otra vez para rebobinar la conversación.",
  "Press any key to edit the name": "Pulsa cualquier tecla para editar el nombre",
  "Preview unavailable": "Vista previa no disponible",
  "Project configuration imports are not available in this session.":
    "La importación de configuración del proyecto no está disponible en esta sesión.",
  "Project language settings are not available in this session.":
    "Los ajustes de idioma del proyecto no están disponibles en esta sesión.",
  "Project memory": "Memoria del proyecto",
  "Project output style settings are not available in this session.":
    "Los ajustes de estilo de salida del proyecto no están disponibles en esta sesión.",
  "Prompt stashed. It will be restored next time.":
    "Prompt guardado. Volverá la próxima vez.",
  "Prompt:": "Prompt:",
  Protocol: "Protocolo",
  "Provider Setup": "Configuración del proveedor",
  "Provider: {{provider}}": "Proveedor: {{provider}}",
  "Question too long (max {{max}} chars)":
    "Pregunta demasiado larga (máx. {{max}} caracteres)",
  "Qwen OAuth Authentication Error": "Error de autenticación OAuth de Qwen",
  "Rate limit exceeded. Please wait and try again.":
    "Te has pasado del límite de peticiones. Espera e inténtalo otra vez.",
  "Reasoning Effort": "Esfuerzo de razonamiento",
  "Recommended models": "Modelos recomendados",
  "Recording CPU profile for {duration}s...":
    "Grabando el perfil de CPU durante {duration} s…",
  "Reject (esc)": "Rechazar (esc)",
  "Remind me later (esc)": "Recordármelo luego (esc)",
  "Repeatedly, as the assistant reply streams":
    "Repetidamente, mientras llega la respuesta del asistente",
  Responses: "Responses",
  "Resume Session": "Retomar la sesión",
  Review: "Revisar",
  Ripgrep: "Ripgrep",
  "Run /auth to configure authentication.":
    "Ejecuta /auth para configurar la autenticación.",
  "Run /model --vision without an argument and choose the exact endpoint.":
    "Ejecuta /model --vision sin argumento y elige el endpoint exacto.",
  "Run /model to select a model.": "Ejecuta /model para elegir un modelo.",
  "Run shell commands": "Ejecutar comandos del shell",
  "Running diagnostics...": "Ejecutando el diagnóstico…",
  "Safe mode active — skipping memory reload from include directories.":
    "Modo seguro activo: se salta recargar la memoria de los directorios incluidos.",
  "Save workflow": "Guardar el flujo",
  "Saved in {{path}}": "Guardado en {{path}}",
  "Saved to {{path}}": "Guardado en {{path}}",
  Scripted: "Con script",
  Search: "Buscar",
  "Search settings…": "Buscar en los ajustes…",
  "Search: ": "Buscar: ",
  "Select Models": "Elegir modelos",
  "Send a message to this agent": "Envía un mensaje a este agente",
  "Server is still starting up.": "El servidor todavía está arrancando.",
  "Service models saved.": "Modelos del servicio guardados.",
  "Service models saved. Configure a conversation model to start chatting.":
    "Modelos del servicio guardados. Configura un modelo de conversación para empezar a charlar.",
  "Session Preview": "Vista previa de la sesión",
  "Session deleted successfully.": "Sesión borrada correctamente.",
  "Session is still initializing — try again in a moment.":
    "La sesión todavía se está initializing: inténtalo en un momento.",
  "Settings could not be loaded. Check your settings files for syntax errors.":
    "No se pudieron cargar los ajustes. Revisa si tus ficheros de ajustes tienen errores de sintaxis.",
  "Settings file corrupted": "Fichero de ajustes dañado",
  "Settings service not available.": "El servicio de ajustes no está disponible.",
  Shortcuts: "Atajos",
  "Show LSP server status. Usage: /lsp [status]":
    "Muestra el estado del servidor LSP. Uso: /lsp [status]",
  "Skill Name": "Nombre de la habilidad",
  "Skill Stats For Nerds": "Estadísticas de habilidades, para expertos",
  "Skill calls: {{total}} ({{success}} ok, {{fail}} fail)":
    "Invocaciones de habilidades: {{total}} ({{success}} bien, {{fail}} mal)",
  "Skip this version": "Saltar esta versión",
  "Skipped existing server(s): {{names}}": "Servidores que ya existían y se saltaron: {{names}}",
  "Skipped unsupported server name(s): {{names}}":
    "Nombres de servidor no admitidos, saltados: {{names}}",
  "Space to toggle, Enter to confirm, Esc to cancel":
    "Espacio para marcar, Enter para confirmar, Esc para cancelar",
  "Standard OpenAI API format (most common)":
    "Formato de la API estándar de OpenAI (el más común)",
  "Starting insight generation...": "Empezando a generar conclusiones…",
  Stats: "Estadísticas",
  "Sub-agents": "Subagentes",
  "Successfully configured {{provider}}. Use /model to switch models.":
    "Se configuró {{provider}} correctamente. Usa /model para cambiar de modelo.",
  "Switch to Default Mode and allow once (recommended)":
    "Volver al modo por defecto y permitir una vez (recomendado)",
  "Team memory metadata is already complete.":
    "Los metadatos de la memoria del equipo ya están completos.",
  "Team memory migration requires enabled team memory in a trusted project.":
    "Migrar la memoria del equipo pide la memoria de equipo activada en un proyecto de confianza.",
  "Team memory migration started (task {{taskId}}).":
    "Migración de la memoria del equipo arrancada (tarea {{taskId}}).",
  "Team memory migration was not started: {{reason}}":
    "La migración de la memoria del equipo no arrancó: {{reason}}",
  "The /compress-fast command does not accept arguments.":
    "El comando /compress-fast no acepta argumentos.",
  "The API client has not been initialized yet.":
    "El cliente de la API todavía no está inicializado.",
  "The current model does not expose reasoning effort tiers.":
    "El modelo actual no ofrece niveles de esfuerzo de razonamiento.",
  "The fast model returned no usable title. Try `/rename <name>` to set one yourself.":
    "El modelo rápido no devolvió un título válido. Prueba con `/rename <nombre>` para ponerlo tú.",
  "The following JSON will be saved to settings.json:":
    "El siguiente JSON se guardará en settings.json:",
  "The standard prompt, with no extra style": "El prompt de serie, sin estilo extra",
  Thinking: "Pensando",
  "Thinking…": "Pensando…",
  "Thought briefly": "Pensó un momento",
  "Thought for": "Pensó durante",
  "Third-party Providers": "Proveedores de terceros",
  "This may take a couple minutes. Sit tight!": "Puede tardar un par de minutos. Aguanta…",
  "This model selection is not available in this session.":
    "Esta elección de modelo no está disponible en esta sesión.",
  "Tip: Use /model to switch between available {{plan}} models.":
    "Consejo: usa /model para cambiar entre los modelos disponibles de {{plan}}.",
  "Tips: Your credentials will not be modified.":
    "Consejo: no se tocará ninguna de tus credenciales.",
  "Title generation was cancelled.": "Se canceló la generación del título.",
  "To resume the original: /resume {{sessionId}}":
    "Para retomar la original: /resume {{sessionId}}",
  "Token Plan": "Token Plan",
  "Token usage is estimated until provider usage is received.":
    "El uso de tokens es estimado hasta que lleguen los datos del proveedor.",
  "Tool registry": "Registro de herramientas",
  "Turn off auto-generated skills": "Desactivar las habilidades autogeneradas",
  "Turn {{n}}": "Turno {{n}}",
  "URL:": "URL:",
  "Unknown argument(s)": "Argumento(s) desconocido(s)",
  "Unknown argument: {{arg}}": "Argumento desconocido: {{arg}}",
  "Unknown import source: {{source}}": "Origen de importación desconocido: {{source}}",
  "Untrusted MCP server in {{source}}": "Servidor MCP no confiable en {{source}}",
  "Update all": "Actualizar todo",
  Usage: "Uso",
  "Usage: /directory add <path>[,<path>,...] or /directory show":
    "Uso: /directory add <ruta>[,<ruta>,...] o /directory show",
  "Usage: /import-config [all|claude-code|claude-desktop] [--scope user|project]":
    "Uso: /import-config [all|claude-code|claude-desktop] [--scope user|project]",
  "Usage: /memory migrate-team": "Uso: /memory migrate-team",
  "Usage: /remember <text to remember>": "Uso: /remember <texto a recordar>",
  "Use ↑/↓ to scroll": "Usa ↑/↓ para desplazarte",
  "User memory": "Memoria de usuario",
  "Vision model '{{modelName}}' matches multiple configured endpoints.":
    "El modelo de visión «{{modelName}}» coincide con varios endpoints configurados.",
  "Warn threshold": "Umbral de aviso",
  "When AUTO-mode classification denies a tool call":
    "Cuando el clasificador del modo AUTO deniega una llamada a una herramienta",
  "When instruction files are loaded": "Cuando se cargan los ficheros de instrucciones",
  "When the turn ends due to an API error (fires instead of Stop)":
    "Cuando el turno acaba por un error de la API (se dispara en vez de Stop)",
  Workflow: "Flujo",
  "Working tree is clean.": "El árbol de trabajo está limpio.",
  "Working tree vs HEAD": "Árbol de trabajo frente a HEAD",
  "Workspace is untrusted; run /trust first or use --global.":
    "El espacio de trabajo no es de confianza: ejecuta /trust primero o usa --global.",
  "Writing heap snapshot, this may take a moment...":
    "Escribiendo la instantánea del heap, puede tardar un momento…",
  "[runId | p <runId>]": "[idEjecución | p <idEjecución>]",
  agents: "agentes",
  "auto memory": "memoria automática",
  available: "disponibles",
  binary: "binario",
  "check failed": "la comprobación falló",
  "client initialized": "cliente inicializado",
  "client not initialized": "cliente sin inicializar",
  "config not loaded": "configuración no cargada",
  "configured (not checked in non-interactive mode)":
    "configurado (sin comprobar en el modo sin interfaz)",
  "configured ({{authType}})": "configurado ({{authType}})",
  "current — cannot delete": "la actual: no se puede borrar",
  "edit ~/.qwen/settings.json, or run qwen interactively once":
    "edita ~/.jpcode/settings.json, o ejecuta jpcode en modo interactivo una vez",
  failures: "fallos",
  file: "fichero",
  files: "ficheros",
  "fire-and-forget; exit status is ignored":
    "fuego y olvido: se ignora el código de salida",
  "invalid ({{authType}})": "no válido ({{authType}})",
  loaded: "cargado",
  "more above": "hay más arriba",
  "more file": "más ficheros",
  "more files": "más ficheros",
  name: "nombre",
  "no longer running": "ya no está corriendo",
  "none configured": "ninguno configurado",
  "not available": "no disponible",
  "not configured": "sin configurar",
  "not found": "no encontrado",
  "not loaded": "sin cargar",
  "npm is not available. Some features may not work.":
    "npm no está disponible. Algunas cosas puede que no funcionen.",
  "npm version": "versión de npm",
  "o open full plan in editor": "o abre el plan entero en el editor",
  "or pass --openai-api-key, --openai-base-url, --model":
    "o pasa --openai-api-key, --openai-base-url, --model",
  "parse error": "error de análisis",
  passed: "correctas",
  phase: "fase",
  phases: "fases",
  project: "proyecto",
  "run qwen and use /auth to configure providers":
    "ejecuta jpcode y usa /auth para configurar los proveedores",
  "run qwen interactively and use /auth; OAuth cannot be configured with env vars alone":
    "ejecuta jpcode en modo interactivo y usa /auth; el OAuth no se puede configurar solo con variables de entorno",
  scope: "ámbito",
  "set BAILIAN_CODING_PLAN_API_KEY and use the Coding Plan base URL for your region":
    "pon BAILIAN_CODING_PLAN_API_KEY y usa la URL base del Coding Plan de tu región",
  "set BAILIAN_TOKEN_PLAN_API_KEY and use the Token Plan base URL for your region":
    "pon BAILIAN_TOKEN_PLAN_API_KEY y usa la URL base del Token Plan de tu región",
  "set OPENROUTER_API_KEY and OPENAI_BASE_URL=https://openrouter.ai/api/v1":
    "pon OPENROUTER_API_KEY y OPENAI_BASE_URL=https://openrouter.ai/api/v1",
  "set REQUESTY_API_KEY and OPENAI_BASE_URL=https://router.requesty.ai/v1":
    "pon REQUESTY_API_KEY y OPENAI_BASE_URL=https://router.requesty.ai/v1",
  "shell commands hidden - resize terminal to review":
    "comandos del shell ocultos: redimensiona el terminal para verlos",
  "show stderr to model and block tool call":
    "muestra stderr al modelo y bloquea la llamada a la herramienta",
  "subcommands:": "subcomandos:",
  unavailable: "no disponible",
  "unknown agent": "agente desconocido",
  user: "usuario",
  warnings: "avisos",
  "workflow active": "flujo activo",
  "{{count}} skill(s) pending review": "{{count}} habilidad(es) por revisar",
  "{{count}} tools registered": "{{count}} herramientas registradas",
  "{{effort}} is not available for this model — using the model/provider default.":
    "{{effort}} no está disponible para este modelo: se usa el del modelo o el del proveedor.",
  "{{name}}.js already exists in {{scope}} scope.":
    "{{name}}.js ya existe en el ámbito {{scope}}.",
  "{{plan}} configuration updated successfully.":
    "La configuración de {{plan}} se actualizó correctamente.",
  "… preview truncated (file too large) …":
    "… vista previa cortada (fichero demasiado grande) …",
  "…and up to {{n}} more (showing first {{shown}})":
    "…y hasta {{n}} más (enseñando los primeros {{shown}})",
  "…and {{n}} more (showing first {{shown}})":
    "…y {{n}} más (enseñando los primeros {{shown}})",
  "↑/↓: Navigate | Space: Toggle | Enter: Confirm | Esc: Cancel":
    "↑/↓: moverse | Espacio: marcar | Enter: confirmar | Esc: cancelar",
  "↑/↓: Navigate | ←/→: Switch tabs | Enter: Select | Esc: Cancel":
    "↑/↓: moverse | ←/→: cambiar de pestaña | Enter: elegir | Esc: cancelar",
  "↑↓ to navigate, Space to toggle, Enter to continue, Esc to go back":
    "↑↓ para moverse, Espacio para marcar, Enter para seguir, Esc para volver",
  "⚠  qwen auth has been removed.": "⚠  jpcode auth ya no existe.",

  /* ---- dos del catálogo inglés que faltaban ---- */
  "Change scope": "Cambiar de ámbito",
  "It is saved but does not apply while this workspace is untrusted.":
    "Se guarda, pero no se aplica mientras este espacio de trabajo no sea de confianza.",
};
