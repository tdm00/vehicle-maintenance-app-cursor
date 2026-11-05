import { describe, expect, it } from 'vitest';
import { builtInServiceTypes } from '../../src/domain/defaults';
import { emptyGarage, loadGarage, migrate, saveGarage, type KeyValueStore } from '../../src/domain/storage';
import { STORAGE_KEY, type GarageData, type Vehicle } from '../../src/domain/types';

function memory(): KeyValueStore & { raw(): string | null } {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    raw: () => items.get(STORAGE_KEY) ?? null,
  };
}

const civic: Vehicle = {
  id: 'civic',
  description: 'Daily driver',
  make: 'Honda',
  model: 'Civic',
  year: 2010,
  color: '#112233',
  bodyType: 'car',
  mileage: 8000,
};

describe('localStorage load, save, and migration', () => {
  it('starts a new garage with the built-in service types', () => {
    const garage = loadGarage(memory());
    expect(garage.version).toBe(1);
    expect(garage.vehicles).toEqual([]);
    expect(garage.serviceTypes.map((type) => type.name)).toEqual(builtInServiceTypes().map((type) => type.name));
  });

  it('round-trips a saved garage', () => {
    const store = memory();
    const data: GarageData = {
      ...emptyGarage(),
      vehicles: [civic],
      services: [
        { id: 's1', vehicleId: 'civic', date: '2026-03-01', serviceTypeIds: ['oil-change'], cost: 45.5, mileage: 7500 },
      ],
      fuelUps: [{ id: 'f1', vehicleId: 'civic', date: '2026-04-01', odometer: 8000, gallons: 10.5, cost: 32 }],
    };
    saveGarage(store, data);
    expect(loadGarage(store)).toEqual(data);
    expect(store.raw()).toContain('"version":1');
  });

  it('migrates an unversioned vehicle list and seeds service types', () => {
    const migrated = migrate({ vehicles: [civic, { id: 'bad' }] });
    expect(migrated.version).toBe(1);
    expect(migrated.vehicles).toEqual([civic]);
    expect(migrated.serviceTypes).toHaveLength(builtInServiceTypes().length);
    expect(migrated.services).toEqual([]);
    expect(migrated.fuelUps).toEqual([]);
  });

  it('migrates a version 0 document the same way', () => {
    const migrated = migrate({ version: 0, vehicles: [{ ...civic, color: 'blue' }] });
    expect(migrated.vehicles[0]?.color).toBe('#1e3a5f');
    expect(migrated.serviceTypes.map((type) => type.id)).toContain('oil-change');
  });

  it('keeps a version 1 garage that removed built-in types', () => {
    const custom = emptyGarage();
    custom.serviceTypes = [{ id: 'diff', name: 'Differential', miles: 20000, months: 24, builtIn: false }];
    const store = memory();
    saveGarage(store, custom);
    const loaded = loadGarage(store);
    expect(loaded.serviceTypes).toEqual(custom.serviceTypes);
  });

  it('seeds built-in types when a version 1 document has none stored', () => {
    const loaded = migrate({ version: 1, vehicles: [civic], services: [], fuelUps: [] });
    expect(loaded.vehicles).toEqual([civic]);
    expect(loaded.serviceTypes).toHaveLength(10);
  });

  it('drops invalid records and returns a fresh garage for garbage', () => {
    expect(loadGarage({ getItem: () => '{', setItem: () => undefined }).version).toBe(1);
    expect(migrate('nope').vehicles).toEqual([]);
    expect(migrate({ version: 2, vehicles: [civic] }).vehicles).toEqual([]);
    const cleaned = migrate({
      version: 1,
      vehicles: [civic, { id: 'skip' }],
      serviceTypes: builtInServiceTypes(),
      services: [
        { id: 'ok', vehicleId: 'civic', date: '2026-01-02', serviceTypeIds: ['oil-change'], cost: null, mileage: 10 },
        { id: 'orphan', vehicleId: 'missing', date: '2026-01-02', serviceTypeIds: ['oil-change'], cost: null, mileage: 10 },
        { id: 'bad-date', vehicleId: 'civic', date: 'yesterday', serviceTypeIds: ['oil-change'], mileage: 10 },
      ],
      fuelUps: [{ id: 'fuel', vehicleId: 'civic', date: '2026-01-03', odometer: 11, gallons: 2, cost: 5 }],
    });
    expect(cleaned.services.map((service) => service.id)).toEqual(['ok']);
    expect(cleaned.fuelUps).toHaveLength(1);
  });
});
