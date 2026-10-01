# jpcode-dist

Artefactos de **jpcode** para instalarlo de una línea.

Aquí **no hay código fuente**: este repo solo publica el paquete que se descarga y se ejecuta. El
código vive en un repo privado, y lo que ves salir en cada release lo genera `build-dist.sh`.

## Instalar

Primero la base (lo único que no viaja en el paquete), **Qwen Code**:

```bash
npm i -g @qwen-code/qwen-code
```

Y luego jpcode:

```bash
curl -fsSL https://github.com/SoyJuanPiece/jpcode-dist/releases/latest/download/get.sh | bash
```

`get.sh` comprueba el SHA256 del paquete, lo descomprime en `~/.jpcode/src` y lanza su `install.sh`.
Después, `jpcode`.

Para clavar una versión o cambiar dónde se instala:

```bash
export JPCODE_VERSION=v0.1.0 JPCODE_SRC=~/jpcode
curl -fsSL https://github.com/SoyJuanPiece/jpcode-dist/releases/latest/download/get.sh | bash
```

## Contenido de cada release

| Fichero | Qué es |
| --- | --- |
| `jpcode-app.tar.gz` | El paquete que se instala. |
| `get.sh` | El instalador de la línea de arriba. |
| `SHA256SUMS` | Y `get.sh` lo comprueba antes de descomprimir nada. |

Todo se construye con `git archive` desde el repo privado, así que solo entra lo commiteado: sin
claves, sin caché, sin logs.

## Qué es y qué no es

El paquete va **minificado, no compilado**: sigue siendo JavaScript y un `strings` lo devuelve a la
superficie. Está así para no publicar el código fuente, no porque sea irreconocible.

Y tiene su lógica: jpcode funciona **parcheando tu propia copia de Qwen Code**, así que el código
tiene que ejecutarse en tu máquina de todas formas. Ocultarlo no era una opción realista.

Lo que sí se toma en serio: antes de publicar, el paquete minificado pasa el juego completo de
pruebas (209 aserciones). Si la minificación rompe algo, esa release no se sube.

## Base legal

jpcode se construye sobre **Qwen Code**, publicado bajo **Apache-2.0**. No redistribuye su código:
parchea la copia que ya tienes instalada. De la estética se toma solo el estilo visual.
