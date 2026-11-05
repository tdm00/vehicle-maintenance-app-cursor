import { describe, expect, it } from 'vitest';
import { fuelEconomy } from '../../src/domain/mpg';
import { garageReducer } from '../../src/domain/reducer';
import { emptyGarage } from '../../src/domain/storage';
import type { FuelUp, GarageData, ServiceRecord, Vehicle } from '../../src/domain/types';

const civic: Vehicle = {
  id: 'civic',
  description: 'Daily driver',
  make: 'Honda',
  model: 'Civic',
  year: 2010,
  color: '#112233',
  bodyType: 'car',
  mileage: 10620,
};

function fill(partial: Pick<FuelUp, 'id' | 'date' | 'odometer' | 'gallons'>): FuelUp {
  return { vehicleId: 'civic', cost: 30, ...partial };
}

const first = fill({ id: 'a', date: '2026-01-01', odometer: 10000, gallons: 12 });
const middle = fill({ id: 'b', date: '2026-02-01', odometer: 10300, gallons: 10 });
const last = fill({ id: 'c', date: '2026-03-01', odometer: 10620, gallons: 8 });

function garage(): GarageData {
  return { ...emptyGarage(), vehicles: [civic], fuelUps: [first, middle, last] };
}

describe('update fuel', () => {
  it('editing a middle fill-up changes that mpg and the running average', () => {
    const state = garage();
    const before = fuelEconomy(state.fuelUps);
    const edited = garageReducer(state, { type: 'update-fuel', fuel: { ...middle, gallons: 20 } });
    const after = fuelEconomy(edited.fuelUps);

    expect(before.perFill.find((row) => row.id === 'b')).toMatchObject({ mpg: 30, runningAverage: 30 });
    expect(before.perFill.find((row) => row.id === 'c')?.mpg).toBeCloseTo(40);
    expect(before.average).toBeCloseTo(620 / 18);

    expect(after.perFill.find((row) => row.id === 'b')?.mpg).toBeCloseTo(15);
    expect(after.perFill.find((row) => row.id === 'b')?.runningAverage).toBeCloseTo(15);
    expect(after.perFill.find((row) => row.id === 'c')?.mpg).toBeCloseTo(40);
    expect(after.perFill.find((row) => row.id === 'c')?.runningAverage).toBeCloseTo(620 / 28);
    expect(after.average).toBeCloseTo(620 / 28);

    const moved = garageReducer(state, { type: 'update-fuel', fuel: { ...middle, odometer: 10400 } });
    const movedEconomy = fuelEconomy(moved.fuelUps);
    expect(movedEconomy.perFill.find((row) => row.id === 'b')?.mpg).toBeCloseTo(40);
    expect(movedEconomy.perFill.find((row) => row.id === 'b')?.runningAverage).toBeCloseTo(40);
    expect(movedEconomy.perFill.find((row) => row.id === 'c')?.mpg).toBeCloseTo(27.5);
  });

  it('raises stored mileage only when the edited odometer is higher', () => {
    const state = garage();
    const lowered = garageReducer(state, { type: 'update-fuel', fuel: { ...middle, odometer: 10100 } });
    expect(lowered.vehicles[0]?.mileage).toBe(10620);
    expect(lowered.fuelUps.find((fuel) => fuel.id === 'b')?.odometer).toBe(10100);

    const raised = garageReducer(lowered, { type: 'update-fuel', fuel: { ...last, odometer: 11000 } });
    expect(raised.vehicles[0]?.mileage).toBe(11000);
    expect(raised.fuelUps.find((fuel) => fuel.id === 'c')?.odometer).toBe(11000);

    const missing = garageReducer(state, { type: 'update-fuel', fuel: { ...middle, id: 'missing', odometer: 99999 } });
    expect(missing).toBe(state);
  });
});

describe('duplicate ids', () => {
  it('does not append a vehicle, fill-up, or service whose id already exists', () => {
    const state = garage();
    expect(garageReducer(state, { type: 'add-vehicle', vehicle: { ...civic, description: 'copy' } })).toBe(state);
    expect(garageReducer(state, { type: 'add-fuel', fuel: { ...middle, odometer: 99999 } })).toBe(state);

    const service: ServiceRecord = {
      id: 's1',
      vehicleId: 'civic',
      date: '2026-04-01',
      serviceTypeIds: ['oil-change'],
      cost: 40,
      mileage: 11000,
    };
    const added = garageReducer(state, { type: 'add-service', service });
    expect(added.services).toEqual([service]);
    expect(added.vehicles[0]?.mileage).toBe(11000);
    expect(garageReducer(added, { type: 'add-service', service: { ...service, cost: 1, mileage: 20000 } })).toBe(added);
  });

  it('does not move a fill-up onto another vehicle', () => {
    const other: Vehicle = { ...civic, id: 'other', description: 'Other', mileage: 1000 };
    const state = { ...garage(), vehicles: [civic, other] };
    const moved = garageReducer(state, { type: 'update-fuel', fuel: { ...middle, vehicleId: 'other', odometer: 20000 } });
    expect(moved).toBe(state);
    expect(moved.fuelUps.find((fuel) => fuel.id === middle.id)?.vehicleId).toBe('civic');
    expect(moved.vehicles.find((vehicle) => vehicle.id === 'other')?.mileage).toBe(1000);
  });
});

describe('update vehicle', () => {
  it('replaces the vehicle so insurance is saved and cleared', () => {
    const policy = { company: 'Acme Mutual', policyNumber: 'POL-100', expiresOn: '2027-06-01', phone: '555-0100' };
    const saved = garageReducer(garage(), { type: 'update-vehicle', vehicle: { ...civic, insurance: policy } });
    expect(saved.vehicles[0]?.insurance).toEqual(policy);

    const without = { ...saved.vehicles[0]! };
    delete without.insurance;
    const cleared = garageReducer(saved, { type: 'update-vehicle', vehicle: without });
    expect(cleared.vehicles[0]?.insurance).toBeUndefined();
    expect(cleared.vehicles[0]?.description).toBe(civic.description);

    const kept = garageReducer(saved, {
      type: 'add-fuel',
      fuel: { id: 'z', vehicleId: 'civic', date: '2026-04-01', odometer: 12000, gallons: 9, cost: 30 },
    });
    expect(kept.vehicles[0]?.mileage).toBe(12000);
    expect(kept.vehicles[0]?.insurance).toEqual(policy);
  });
});
