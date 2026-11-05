import { describe, expect, it } from 'vitest';
import { BackupError, BACKUP_ITERATIONS, canonicalJson, createBackup, readBackup } from '../../src/domain/backup';
import { emptyGarage } from '../../src/domain/storage';
import type { GarageData } from '../../src/domain/types';

const passphrase = 'correct horse';

const garage: GarageData = {
  ...emptyGarage(),
  vehicles: [
    {
      id: 'civic',
      description: 'Daily driver',
      make: 'Honda',
      model: 'Civic',
      year: 2010,
      color: '#112233',
      bodyType: 'car',
      mileage: 10620,
    },
  ],
  services: [{ id: 's1', vehicleId: 'civic', date: '2026-03-01', serviceTypeIds: ['oil-change'], cost: 45.5, mileage: 10000 }],
  fuelUps: [
    { id: 'a', vehicleId: 'civic', date: '2026-01-01', odometer: 10000, gallons: 12, cost: 30 },
    { id: 'b', vehicleId: 'civic', date: '2026-02-01', odometer: 10300, gallons: 10, cost: 31 },
    { id: 'c', vehicleId: 'civic', date: '2026-03-01', odometer: 10620, gallons: 8, cost: 32 },
  ],
};

function flipHexBit(hex: string): string {
  const first = Number.parseInt(hex.slice(0, 2), 16) ^ 0x01;
  return first.toString(16).padStart(2, '0') + hex.slice(2);
}

function flipBit(text: string): string {
  return String.fromCharCode(text.charCodeAt(0) ^ 1) + text.slice(1);
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, item]) => [key, reverseKeys(item)]),
    );
  }
  return value;
}

async function version1Backup(payload: GarageData, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonicalJson(payload)));
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { version: 1 as const, payload, signature: hex };
}

describe('signed garage backup', () => {
  it('rejects an empty passphrase', async () => {
    const file = await createBackup(garage, passphrase);
    await expect(createBackup(garage, '')).rejects.toMatchObject({ name: 'BackupError', reason: 'passphrase' });
    await expect(createBackup(garage, '   ')).rejects.toMatchObject({ reason: 'passphrase' });
    await expect(createBackup(garage, '\n\t')).rejects.toMatchObject({ reason: 'passphrase' });
    await expect(readBackup(file, '')).rejects.toMatchObject({ reason: 'passphrase' });
    await expect(readBackup(file, ' \t ')).rejects.toMatchObject({ reason: 'passphrase' });
  });

  it('rejects a flipped bit or the wrong passphrase', async () => {
    const file = await createBackup(garage, passphrase);
    await expect(readBackup({ ...file, signature: flipHexBit(file.signature) }, passphrase)).rejects.toMatchObject({
      name: 'BackupError',
      reason: 'signature',
    });

    const tampered = {
      ...file,
      payload: {
        ...file.payload,
        vehicles: file.payload.vehicles.map((vehicle, index) => (index === 0 ? { ...vehicle, description: flipBit(vehicle.description) } : vehicle)),
      },
    };
    await expect(readBackup(tampered, passphrase)).rejects.toMatchObject({ reason: 'signature' });
    await expect(readBackup(file, 'wrong passphrase')).rejects.toBeInstanceOf(BackupError);
    await expect(readBackup(file, 'wrong passphrase')).rejects.toMatchObject({ reason: 'signature' });
  });

  it('round-trips a valid backup without storing the passphrase', async () => {
    const file = await createBackup(garage, passphrase);
    const serialized = JSON.stringify(file);
    expect(serialized).not.toContain(passphrase);
    expect(file.version).toBe(2);
    expect(file.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(file.iterations).toBeGreaterThanOrEqual(BACKUP_ITERATIONS);
    expect(file.signature).toMatch(/^[0-9a-f]{64}$/);

    await expect(readBackup(JSON.parse(serialized), passphrase)).resolves.toEqual(garage);
    await expect(readBackup({ ...file, iterations: file.iterations + BACKUP_ITERATIONS }, passphrase)).rejects.toMatchObject({ reason: 'signature' });
    await expect(readBackup({ ...file, salt: flipHexBit(file.salt) }, passphrase)).rejects.toMatchObject({ reason: 'signature' });

    const reordered = JSON.parse(serialized) as { version: number; payload: unknown; signature: string };
    reordered.payload = reverseKeys(reordered.payload);
    await expect(readBackup(reordered, passphrase)).resolves.toEqual(garage);
  });

  it('still imports a version 1 file signed with the raw passphrase', async () => {
    const file = await version1Backup(garage, passphrase);
    await expect(readBackup(file, passphrase)).resolves.toEqual(garage);
    await expect(readBackup({ ...file, signature: flipHexBit(file.signature) }, passphrase)).rejects.toMatchObject({ reason: 'signature' });
    await expect(readBackup(file, 'wrong passphrase')).rejects.toMatchObject({ reason: 'signature' });
  });

  it('keeps insurance on the signed garage payload', async () => {
    const insured: GarageData = {
      ...garage,
      vehicles: [
        {
          ...garage.vehicles[0]!,
          insurance: {
            company: 'Acme Mutual',
            policyNumber: 'POL-100',
            expiresOn: '2027-06-01',
            phone: '555-0100',
            notes: 'Full coverage',
          },
        },
      ],
    };
    const file = await createBackup(insured, passphrase);
    expect(file.payload.vehicles[0]?.insurance?.policyNumber).toBe('POL-100');
    await expect(readBackup(JSON.parse(JSON.stringify(file)), passphrase)).resolves.toEqual(insured);
  });

  it('rejects a signed payload that fails validation', async () => {
    const bogus = {
      version: 1 as const,
      vehicles: [{ id: 'bad' }],
      serviceTypes: [],
      services: [],
      fuelUps: [],
    };
    const file = await createBackup(bogus as unknown as GarageData, passphrase);
    await expect(readBackup(file, passphrase)).rejects.toMatchObject({ reason: 'validation' });
  });
});
