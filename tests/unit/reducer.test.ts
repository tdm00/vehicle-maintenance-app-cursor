import { describe, expect, it } from 'vitest';
import { fuelEconomy } from '../../src/domain/mpg';
import { garageReducer } from '../../src/domain/reducer';
import { emptyGarage } from '../../src/domain/storage';
import type { FuelUp, GarageData, Vehicle } from '../../src/domain/types';

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
