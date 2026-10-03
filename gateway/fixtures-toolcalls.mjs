/* Los textos literales que salieron en las capturas del usuario, copiados a mano
 * desde lo que se vio en pantalla. No son una reconstrucción: son lo que se ve.
 *
 * Están aquí porque los dos intentos anteriores fallaron por probar contra un
 * formato inventado en lugar de contra el texto de verdad. La próxima vez que el
 * modelo cambie, esta es la referencia.
 *
 *   node gateway/test-toolcalls.mjs
 */

/* 0.2.13 — nombre en la línea siguiente, argumentos como etiquetas. */
export const CAPTURA_0_2_13 = [
  "Voy a revisar el Escritorio para ver si ya existe la carpeta del clan y qué hay dentro.]",
  "[minimax][{",
  "<tool_call>\n",
  "<invoke name\n",
  "glob\n",
  "><pattern>C:/Users/Usuario/Desktop/*\n",
  "][minimax>[</pattern>\n",
  "][minimax>[</invoke\n",
  "][minimax>[</invoke\n",
  '="glob\n',
  "][minimax>[<pattern>C:/Users/Usuario/OneDrive/Escritorio/*\n",
  "][minimax>[</pattern>\n",
  "][minimax>[</invoke\n",
  "][minimax>[</tool_call>",
].join("");

/* El mismo texto sin los caracteres invisibles que el renderizado no enseña. */
export const CAPTURA_SIN_INVISIBLES =
  "Voy a revisar el Escritorio para ver si ya existe la carpeta del clan y qué hay dentro.]" +
  "[minimax][{<tool_call>\n<invoke name\nglob\n><pattern>C:/Users/Usuario/Desktop/*\n" +
  "][minimax>[</pattern>\n][minimax>[</invoke\n][minimax>[</invoke\n" +
  '="glob\n][minimax>[<pattern>C:/Users/Usuario/OneDrive/Escritorio/*\n' +
  "][minimax>[</pattern>\n][minimax>[</invoke\n][minimax>[</tool_call>";

/* 0.2.14 — el formato limpio, con dos llamadas de glob en el mismo bloque.
 * Este es el caso bueno y el que hay que ver funcionar. */
export const CAPTURA_0_2_14 =
  "Voy a revisar el Escritorio para encontrar la carpeta del clan.]" +
  "[minimax][{<tool_call>\n" +
  '<invoke name="glob">][minimax>[<pattern>C:/Users/Usuario/Desktop/*</pattern>][minimax>[</invoke>\n' +
  '][minimax>[<invoke name="glob">][minimax>[<pattern>C:/Users/Usuario/Desktop/**/index.html</pattern>][minimax>[</invoke\n' +
  "][minimax>[</tool_call>";