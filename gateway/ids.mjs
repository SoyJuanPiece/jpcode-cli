/**
 * IDs con el formato de opencode: prefijo + 12 hex de timestamp + 14 chars random.
 * Sirven tanto para `x-opencode-session`/`x-opencode-request` (que el servidor de
 * Zen valida por forma) como para los ids de tool calls y mensajes.
 *
 * Está aquí y no en un módulo concreto porque lo usan los tres: el servidor, el
 * puente de Anthropic y el registro de proveedores.
 */
import { randomBytes } from "node:crypto";

const ID_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** User-Agent del cliente oficial. El tier gratis y el endpoint `go` lo miran. */
export const ZEN_UA = "opencode/1.18.31";

export function ocId(prefix) {
  const value = BigInt(Date.now()) * 0x1000n + BigInt(Math.floor(Math.random() * 4096));
  let time = "";
  for (let i = 0; i < 6; i++) time += ((value >> BigInt(40 - 8 * i)) & 0xffn).toString(16).padStart(2, "0");
  return prefix + time + Array.from(randomBytes(14), (b) => ID_CHARS[b % ID_CHARS.length]).join("");
}
