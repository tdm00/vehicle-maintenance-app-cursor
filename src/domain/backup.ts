import { normalizeGarage } from './storage';
import type { GarageData } from './types';

export const BACKUP_VERSION = 1 as const;

export type BackupFailure = 'format' | 'signature' | 'validation';

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

async function hmacKey(passphrase: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(passphrase), { name: 'HMAC', hash: 'SHA-256' }, false, [usage]);
}

async function signCanonical(payload: unknown, passphrase: string): Promise<string> {
  const key = await hmacKey(passphrase, 'sign');
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalJson(payload)));
  return bytesToHex(new Uint8Array(signature));
}

async function signatureMatches(payload: unknown, passphrase: string, signature: string): Promise<boolean> {
  const bytes = hexToBytes(signature);
  if (!bytes) return false;
  const key = await hmacKey(passphrase, 'verify');
  const signatureBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  try {
    return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(canonicalJson(payload)));
  } catch {
    return false;
  }
}

function envelope(value: unknown): { payload: unknown; signature: string } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== BACKUP_VERSION || typeof record.signature !== 'string' || !('payload' in record)) return null;
  return { payload: record.payload, signature: record.signature };
}

export async function createBackup(garage: GarageData, passphrase: string): Promise<BackupFile> {
  const payload = JSON.parse(JSON.stringify(garage)) as GarageData;
  const signature = await signCanonical(payload, passphrase);
  return { version: BACKUP_VERSION, payload, signature };
}

export async function readBackup(file: unknown, passphrase: string): Promise<GarageData> {
  const signed = envelope(file);
  if (!signed) throw new BackupError('format');
  const verified = await signatureMatches(signed.payload, passphrase, signed.signature);
  if (!verified) throw new BackupError('signature');
  const garage = normalizeGarage(signed.payload);
  if (!garage) throw new BackupError('validation');
  return garage;
}
