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


/* ---- 0.2.16: el texto literal de la pantalla, con el arreglo YA puesto ----
 *
 * Esto sale de lo que el usuario vio en 0.2.16, y es el caso que hizo
 * inútil la limpieza del texto: el modelo manda la llamada nativa Y el XML
 * repetido en el texto a la vez. Transcrito de la consola, no de la foto,
 * para poder comprobarlo. */
export const CAPTURA_0_2_16 =
  "Voy a revisar primero qué hay en tu Escritorio para ver si ya existe algún proyecto relacionado.]" +
  "[minimax>[{<\u200Btool_call>[\n" +
  "][minimax>[<invoke\n" +
  'name="glob">][minimax>[<pattern>C:\\Users\\Usuario\\Desktop\\*}]][minimax>[{</pattern>][minimax>[{</invoke\n' +
  'name="glob">][minimax>[<pattern>C:\\Users\\Usuario\\Desktop\\*\\**\\clash*>][minimax>[{</pattern>][minimax>[{</invoke>\n' +
  "][minimax>[{</\u200Btool_call>";


/* ---- 0.2.20: otro formato nuevo, este con <parameter name="..."> ----
 *
 * Antes los argumentos venían como <pattern>valor</pattern>. Ahora el modelo
 * escribe <parameter name="pattern">valor</parameter>, y además se cuela un
 * <globe_placeholder /> suelto que no es una herramienta. */
export const CAPTURA_0_2_20 =
  "Voy a revisar primero qué hay en tu Escritorio por si ya existe una carpeta del clan.]" +
  "[minimax>[{<\u200Btool_call>[\n" +
  "<globe_placeholder />\n" +
  '<invoke name="glob">\n<parameter name="pattern">C:\\Users\\Usuario\\Desktop\\* **</parameter>\n</invoke>\n' +
  '<invoke name="glob">\n<parameter name="pattern">C:\\Users\\Usuario\\Desktop\\*\\**</parameter>\n</invoke>\n' +
  "][minimax>[{</\u200Btool_call>";
