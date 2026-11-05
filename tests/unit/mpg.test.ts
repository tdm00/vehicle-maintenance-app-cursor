import { describe, expect, it } from 'vitest';
import { fuelEconomy } from '../../src/domain/mpg';
import type { FuelUp } from '../../src/domain/types';

function fill(partial: Partial<FuelUp> & Pick<FuelUp, 'id' | 'odometer' | 'gallons'>): FuelUp {
  return {
    vehicleId: 'v1',
    date: '2026-01-01',
    cost: 0,
    ...partial,
  };
}

describe('fuel economy', () => {
  it('returns nothing when there are no fill-ups', () => {
    expect(fuelEconomy([])).toEqual({ perFill: [], average: null });
  });

  it('stores a single fill-up and leaves it out of the average', () => {
    const result = fuelEconomy([fill({ id: 'a', odometer: 10000, gallons: 12, date: '2026-01-01' })]);
    expect(result.perFill).toEqual([{ id: 'a', mpg: null, runningAverage: null }]);
    expect(result.average).toBeNull();
  });

  it('divides miles since the previous fill-up by gallons', () => {
    const result = fuelEconomy([
      fill({ id: 'b', odometer: 10300, gallons: 10, date: '2026-02-01' }),
      fill({ id: 'a', odometer: 10000, gallons: 11, date: '2026-01-01' }),
    ]);
    expect(result.perFill.find((row) => row.id === 'a')).toEqual({ id: 'a', mpg: null, runningAverage: null });
    expect(result.perFill.find((row) => row.id === 'b')?.mpg).toBeCloseTo(30);
    expect(result.average).toBeCloseTo(30);
  });

  it('divides the span from the first odometer to the last by gallons after the first fill-up', () => {
    const result = fuelEconomy([
      fill({ id: 'c', odometer: 10620, gallons: 8, date: '2026-03-01' }),
      fill({ id: 'a', odometer: 10000, gallons: 12, date: '2026-01-01' }),
      fill({ id: 'b', odometer: 10300, gallons: 10, date: '2026-02-01' }),
    ]);
    expect(result.perFill.find((row) => row.id === 'b')?.mpg).toBeCloseTo(30);
    expect(result.perFill.find((row) => row.id === 'c')?.mpg).toBeCloseTo(40);
    expect(result.perFill.find((row) => row.id === 'c')?.runningAverage).toBeCloseTo(620 / 18);
    expect(result.average).toBeCloseTo(620 / 18);
  });

  it('ignores a zero-gallon fill in the gallon total and reports no per-fill mpg for it', () => {
    const result = fuelEconomy([
      fill({ id: 'a', odometer: 1000, gallons: 10 }),
      fill({ id: 'b', odometer: 1100, gallons: 0, date: '2026-02-01' }),
      fill({ id: 'c', odometer: 1200, gallons: 10, date: '2026-03-01' }),
    ]);
    expect(result.perFill.find((row) => row.id === 'b')?.mpg).toBeNull();
    expect(result.perFill.find((row) => row.id === 'c')?.mpg).toBeCloseTo(10);
    expect(result.average).toBeCloseTo(20);
  });

  it('returns no average when the odometer falls or no gallons were added after the first fill-up', () => {
    const backwards = fuelEconomy([
      fill({ id: 'a', odometer: 5000, gallons: 10 }),
      fill({ id: 'b', odometer: 4900, gallons: 8, date: '2026-02-01' }),
    ]);
    expect(backwards.perFill.find((row) => row.id === 'b')?.mpg).toBeNull();
    expect(backwards.average).toBeNull();

    const empty = fuelEconomy([
      fill({ id: 'a', odometer: 5000, gallons: 10 }),
      fill({ id: 'b', odometer: 5200, gallons: 0, date: '2026-02-01' }),
    ]);
    expect(empty.average).toBeNull();
  });
});
