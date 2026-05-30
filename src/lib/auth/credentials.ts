import { getSetting, setSetting } from "@/lib/db/repo";
import { DEFAULT_PIN } from "@/lib/db/seed";

// Local authentication for a single-user, offline finance vault:
//  - PIN stored as a salted SHA-256 hash (never plain text).
//  - Optional biometric unlock via WebAuthn platform authenticator
//    (fingerprint / Face ID). Without a server the OS biometric prompt itself
//    is the gate; we only persist the credential id locally.

const SETTING_PIN_HASH = "pin_hash";
const SETTING_PIN_SALT = "pin_salt";
const SETTING_PIN_DEFAULT = "pin_is_default";
const SETTING_CREDENTIAL = "webauthn_credential_id";

// --- small encoding helpers ------------------------------------------------

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  return toHex(await crypto.subtle.digest("SHA-256", data));
}

// --- PIN --------------------------------------------------------------------

export async function setPin(pin: string, isDefault = false): Promise<void> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const hash = await sha256Hex(salt + pin);
  await setSetting(SETTING_PIN_SALT, salt);
  await setSetting(SETTING_PIN_HASH, hash);
  await setSetting(SETTING_PIN_DEFAULT, isDefault ? "1" : "0");
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = getSetting(SETTING_PIN_SALT);
  const hash = getSetting(SETTING_PIN_HASH);
  if (!salt || !hash) return false;
  return (await sha256Hex(salt + pin)) === hash;
}

/** Seed the default PIN on first run so the user is never locked out. */
export async function ensureDefaultPin(): Promise<void> {
  if (!getSetting(SETTING_PIN_HASH)) await setPin(DEFAULT_PIN, true);
}

export function isPinDefault(): boolean {
  return getSetting(SETTING_PIN_DEFAULT) === "1";
}

// --- Biometric (WebAuthn) ---------------------------------------------------

export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isBiometricEnrolled(): boolean {
  return !!getSetting(SETTING_CREDENTIAL);
}

export async function enrollBiometric(): Promise<boolean> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Kas Harian Rumah", id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: "bunda",
        displayName: "Bunda",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!cred) return false;
  await setSetting(SETTING_CREDENTIAL, toBase64(new Uint8Array(cred.rawId)));
  return true;
}

export async function unlockWithBiometric(): Promise<boolean> {
  const stored = getSetting(SETTING_CREDENTIAL);
  if (!stored) return false;
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: "public-key", id: fromBase64(stored) }],
      userVerification: "required",
      timeout: 60000,
    },
  });
  return assertion !== null;
}

export async function disableBiometric(): Promise<void> {
  await setSetting(SETTING_CREDENTIAL, "");
}
