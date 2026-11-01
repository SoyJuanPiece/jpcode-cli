/**
 * ¿Hay que limpiar la terminal al abrir jpcode?
 *
 * Está aparte del launcher por una razón: la decisión tiene cinco guardas y
 * probarla dentro de bin/jpcode.mjs significaba arrancar el motor entero para
 * cada caso. Aquí es una función pura —le pasas el entorno y devuelve sí o no—
 * y se prueba sola.
 *
 * Por qué limpiar, y por qué no trae parpadeo: lo que se quiere es que al abrir
 * no haya nada más que el CLI. Eso es UNA secuencia, escrita una vez, antes de
 * que el motor exista en pantalla. Después el historial se escribe en el
 * scrollback (`useTerminalBuffer`) y no se repinta nunca, así que no parpadea.
 * OpenCode lo resuelve con dos modos de pantalla; copiar eso sí daría
 * parpadeo, y no hace falta.
 *
 *   limpiarTerminal({ isTTY, argv, env })
 */

export const SECUENCIA = "\x1b[2J\x1b[3J\x1b[H";

/**
 * @param {object}   o
 * @param {boolean}  o.isTTY  ¿stdout es una terminal?
 * @param {string[]} o.argv   los argumentos, sin node ni el script
 * @param {object}   o.env    el entorno
 */
export function limpiarTerminal({ isTTY, argv = [], env = {} }) {
  /* Sin terminal no hay pantalla que limpiar, y los bytes de escape se irían
     al fichero o al proceso siguiente. */
  if (!isTTY) return { limpiar: false, motivo: "stdout no es una TTY" };

  /* Subcomandos con salida propia: `doctor` pinta un informe y sale, y --json
     tiene que poder irrevocable a un pipe sin que se cuelen escapes. */
  if (argv[0] === "doctor") return { limpiar: false, motivo: "es doctor" };
  if (argv.includes("--json")) return { limpiar: false, motivo: "pide --json" };

  /* Apagado explícito, sin tener que tocar el código. */
  if (env.JPCODE_NO_CLEAR === "1") return { limpiar: false, motivo: "JPCODE_NO_CLEAR=1" };

  /* En CI no hay pantalla y casi siempre la salida se recoge. */
  if (env.CI === "true") return { limpiar: false, motivo: "CI=true" };

  return { limpiar: true, motivo: "sesión interactiva" };
}

/** Limpia de verdad. Nunca lanza: un terminal que no acepta la secuencia no
 *  es motivo para no arrancar. */
export function limpiar(stream) {
  try {
    stream.write(SECUENCIA);
    return true;
  } catch {
    return false;
  }
}
