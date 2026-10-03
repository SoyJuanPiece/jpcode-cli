/* Texto tal cual salía en pantalla en la captura del usuario (0.2.13), copiado a
 * mano desde el texto renderizado. Los tokens `][minimax>[` llevan además un
 * carácter de ancho cero que el renderizado no enseña; la variante sin él se
 * prueba aparte abajo.
 *
 * Se guarda aparte porque es el único caso que importa: el formato que se
 * dedujo del texto renderizado NO era este, y por eso 0.2.13 no lo arregló.
 * Este fichero es la referencia contra la que se prueba el parser.
 *
 *   node gateway/test-toolcalls.mjs
 */

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

/* El mismo texto sin los caracteres invisibles, por si el modelo los omite. */
export const CAPTURA_SIN_INVISIBLES =
  "Voy a revisar el Escritorio para ver si ya existe la carpeta del clan y qué hay dentro.]" +
  "[minimax][{<tool_call>\n<invoke name\nglob\n><pattern>C:/Users/Usuario/Desktop/*\n" +
  "][minimax>[</pattern>\n][minimax>[</invoke\n][minimax>[</invoke\n" +
  '="glob\n][minimax>[<pattern>C:/Users/Usuario/OneDrive/Escritorio/*\n' +
  "][minimax>[</pattern>\n][minimax>[</invoke\n][minimax>[</tool_call>";