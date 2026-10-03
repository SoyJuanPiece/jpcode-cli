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

/* ---- La captura del bucle (0.2.14): el modelo repite la llamada sin parar. ----
 * Es lo que reventaba con "Fatal process out of memory". Nótese que la etiqueta
 * de cierre ni siquiera está: `<tool_reflect` queda cortado a mitad. */
export const CAPTURA_BUCLE =
  ("Primero reviso qué hay en el Escritorio.][minimax>[<tool_call>" +
   '{"pattern":"C:/Users/Usuario/Desktop"/><tool_reflect').repeat(400);

/* ---- La captura de 0.2.15: la llamada sin cerrar, que se quedaba a la vista. ----
 * El modelo abre `<invoke name="cmd">`, escribe el comando y nunca llega a
 * cerrar. Antes solo se borraba la etiqueta de apertura y en pantalla se leía el
 * XML crudo entero. */
export const CAPTURA_SIN_CERRAR =
  'Primero reviso qué hay en el Escritorio para ver si ya existe la carpeta.][minimax>[' +
  '<invoke name="cmd"><command>cmd /c dir /b "%USERPROFILE%\\OneDrive\\Desktop" 2>nul || echo "no oneDrive desktop"';
