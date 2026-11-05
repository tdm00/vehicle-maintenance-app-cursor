import { normalizeGarage } from './storage';
import type { GarageData } from './types';

export const BACKUP_VERSION = 2 as const;
const LEGACY_BACKUP_VERSION = 1 as const;

/** PBKDF2-HMAC-SHA256 iterations stored on version 2 files. */
export const BACKUP_ITERATIONS = 100_000;
const MAX_BACKUP_ITERATIONS = 1_000_000;
const SALT_BYTES = 16;

export type BackupFailure = 'format' | 'passphrase' | 'signature' | 'validation';

export class BackupError extends Error {
  readonly reason: BackupFailure;

  constructor(reason: BackupFailure) {
    super(reason);
    this.name = 'BackupError';
    this.reason = reason;
  }
}

export interface BackupFile {
  version: typeof BACKUP_VERSION;
  salt: string;
  iterations: number;
  payload: GarageData;
  signature: string;
}

const encoder = new TextEncoder();

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortValue((value as Record<string, unknown>)[key]);
    return sorted;
  }
  return value;
}

/** Object keys are sorted at every level so the signature does not depend on key order. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function arrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function requirePassphrase(passphrase: string): void {
  if (passphrase.trim() === '') throw new BackupError('passphrase');
}

async function passphraseHmacKey(passphrase: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(passphrase), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

async function derivedHmacKey(passphrase: string, salt: Uint8Array, iterations: number, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: arrayBuffer(salt), iterations },
    material,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    [usage],
  );
}

async function signatureMatches(key: CryptoKey, payload: unknown, signature: string): Promise<boolean> {
  const bytes = hexToBytes(signature);
  if (!bytes) return false;
  try {
    return await crypto.subtle.verify('HMAC', key, arrayBuffer(bytes), encoder.encode(canonicalJson(payload)));
  } catch {
    return false;
  }
}

type SignedEnvelope =
  | { version: typeof LEGACY_BACKUP_VERSION; payload: unknown; signature: string }
  | { version: typeof BACKUP_VERSION; payload: unknown; signature: string; salt: Uint8Array; iterations: number };

function envelope(value: unknown): SignedEnvelope | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.signature !== 'string' || !('payload' in record)) return null;
  if (record.version === LEGACY_BACKUP_VERSION) {
    return { version: LEGACY_BACKUP_VERSION, payload: record.payload, signature: record.signature };
  }
  if (record.version !== BACKUP_VERSION || typeof record.salt !== 'string' || typeof record.iterations !== 'number') return null;
  if (!Number.isInteger(record.iterations) || record.iterations < BACKUP_ITERATIONS || record.iterations > MAX_BACKUP_ITERATIONS) return null;
  const salt = hexToBytes(record.salt);
  if (!salt || salt.byteLength < SALT_BYTES || salt.byteLength > SALT_BYTES * 4) return null;
  return { version: BACKUP_VERSION, payload: record.payload, signature: record.signature, salt, iterations: record.iterations };
}

async function verificationKey(passphrase: string, signed: SignedEnvelope): Promise<CryptoKey> {
  if (signed.version === LEGACY_BACKUP_VERSION) return passphraseHmacKey(passphrase, 'verify');
  return derivedHmacKey(passphrase, signed.salt, signed.iterations, 'verify');
}

export async function createBackup(garage: GarageData, passphrase: string): Promise<BackupFile> {
  requirePassphrase(passphrase);
  const payload = JSON.parse(JSON.stringify(garage)) as GarageData;
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await derivedHmacKey(passphrase, salt, BACKUP_ITERATIONS, 'sign');
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalJson(payload)));
  return {
    version: BACKUP_VERSION,
    salt: bytesToHex(salt),
    iterations: BACKUP_ITERATIONS,
    payload,
    signature: bytesToHex(new Uint8Array(signatureBytes)),
  };
}

export async function readBackup(file: unknown, passphrase: string): Promise<GarageData> {
  requirePassphrase(passphrase);
  const signed = envelope(file);
  if (!signed) throw new BackupError('format');
  let key: CryptoKey;
  try {
    key = await verificationKey(passphrase, signed);
  } catch {
    throw new BackupError('signature');
  }
  const verified = await signatureMatches(key, signed.payload, signed.signature);
  if (!verified) throw new BackupError('signature');
  const garage = normalizeGarage(signed.payload);
  if (!garage) throw new BackupError('validation');
  return garage;
}
