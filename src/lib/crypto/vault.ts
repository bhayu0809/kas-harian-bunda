const MAGIC = "KHB1";
const PBKDF2_ITERATIONS = 250_000;

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.byteLength;
  });
  return out;
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: arrayBuffer(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export function isEncryptedPayload(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength > 4 &&
    bytes[0] === MAGIC.charCodeAt(0) &&
    bytes[1] === MAGIC.charCodeAt(1) &&
    bytes[2] === MAGIC.charCodeAt(2) &&
    bytes[3] === MAGIC.charCodeAt(3)
  );
}

export async function encryptBytes(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(password, salt);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: arrayBuffer(iv) }, key, arrayBuffer(bytes)));
  return concatBytes([new TextEncoder().encode(MAGIC), salt, iv, cipher]);
}

export async function decryptBytes(payload: Uint8Array, password: string): Promise<Uint8Array> {
  if (!isEncryptedPayload(payload)) return payload;

  const salt = payload.slice(4, 20);
  const iv = payload.slice(20, 32);
  const cipher = payload.slice(32);
  const key = await deriveKey(password, salt);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: arrayBuffer(iv) }, key, arrayBuffer(cipher)));
}
