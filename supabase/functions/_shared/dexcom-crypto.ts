// Shared Dexcom token crypto helpers.
// Single source of truth so the encode (write) and decode (read) sides can never
// drift apart again, the previous inline duplicates caused raw Uint8Arrays to be
// JSON-serialized into bytea columns, producing "iv length not equal to 12 or 16".

const TOKEN_ENC_KEY = Deno.env.get("DEXCOM_TOKEN_ENC_KEY") ?? "";

export function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/**
 * Postgres bytea hex input format. MUST be used for every write of encrypted
 * bytes through PostgREST, a raw Uint8Array serializes to {"0":12,...}.
 */
export function bytesToPgHex(bytes: Uint8Array): string {
  return "\\x" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// bytea from PostgREST arrives as base64 or "\x…" hex; normalize to Uint8Array.
export function coerceBytea(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (typeof v === "string") {
    if (v.startsWith("\\x")) return hexToBytes(v.slice(2));
    const bin = atob(v);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  throw new Error("unsupported bytea");
}

export async function aesGcmEncrypt(plain: string): Promise<{ ct: Uint8Array; iv: Uint8Array }> {
  const keyBytes = hexToBytes(TOKEN_ENC_KEY.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes as unknown as BufferSource, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      new TextEncoder().encode(plain) as unknown as BufferSource,
    ),
  );
  return { ct, iv };
}

export async function aesGcmDecrypt(ct: Uint8Array, iv: Uint8Array): Promise<string> {
  const keyBytes = hexToBytes(TOKEN_ENC_KEY.slice(0, 64));
  const key = await crypto.subtle.importKey("raw", keyBytes as unknown as BufferSource, "AES-GCM", false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ct as unknown as BufferSource,
  );

  return new TextDecoder().decode(pt);
}

/** Thrown when stored tokens cannot be decrypted (legacy corrupt rows). */
export class TokenDecryptError extends Error {
  constructor(cause?: unknown) {
    super("token_decrypt_failed" + (cause ? `:${cause instanceof Error ? cause.message : String(cause)}` : ""));
    this.name = "TokenDecryptError";
  }
}
