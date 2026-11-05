import { describe, expect, it } from 'vitest';
import { builtInServiceTypes, SERVICE_IDS } from '../../src/domain/defaults';
import { lookupInterval, type IntervalVehicle } from '../../src/domain/intervals';
import type { ServiceType } from '../../src/domain/types';

function vehicle(overrides: Partial<IntervalVehicle> = {}): IntervalVehicle {
  return {
    make: 'Honda',
    model: 'Civic',
    year: 2010,
    bodyType: 'car',
    mileage: 40_000,
    ...overrides,
  };
}

function type(id: string): ServiceType {
  const found = builtInServiceTypes().find((item) => item.id === id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
}

describe('interval lookup', () => {
  it('uses the generic oil interval for an older car', () => {
    expect(lookupInterval(type(SERVICE_IDS.oil), vehicle())).toEqual({ miles: 5_000, months: 3 });
  });

  it('lengthens oil changes for newer cars', () => {
    expect(lookupInterval(type(SERVICE_IDS.oil), vehicle({ year: 2020 }))).toEqual({ miles: 7_500, months: 6 });
  });

  it('shortens oil changes for trucks even when the truck is new', () => {
    expect(lookupInterval(type(SERVICE_IDS.oil), vehicle({ year: 2022, bodyType: 'truck' }))).toEqual({ miles: 4_000, months: 3 });
  });

  it('shortens oil changes once mileage is high', () => {
    expect(lookupInterval(type(SERVICE_IDS.oil), vehicle({ year: 2019, mileage: 160_000 }))).toEqual({ miles: 4_000, months: 3 });
  });

  it('uses a make and model schedule for a Prius', () => {
    expect(lookupInterval(type(SERVICE_IDS.oil), vehicle({ make: 'Toyota', model: 'Prius', year: 2022 }))).toEqual({
      miles: 10_000,
      months: 12,
    });
  });

  it('adjusts tires, plugs, coolant, and cabin filters from the same table', () => {
    expect(lookupInterval(type(SERVICE_IDS.tire), vehicle({ bodyType: 'truck' }))).toEqual({ miles: 5_000, months: 6 });
    expect(lookupInterval(type(SERVICE_IDS.tire), vehicle())).toEqual({ miles: 6_000, months: 6 });
    expect(lookupInterval(type(SERVICE_IDS.plugs), vehicle({ year: 2014 }))).toEqual({ miles: 30_000, months: 36 });
    expect(lookupInterval(type(SERVICE_IDS.plugs), vehicle({ year: 2018 }))).toEqual({ miles: 60_000, months: 72 });
    expect(lookupInterval(type(SERVICE_IDS.coolant), vehicle({ year: 2015 }))).toEqual({ miles: 30_000, months: 24 });
    expect(lookupInterval(type(SERVICE_IDS.coolant), vehicle({ year: 2021 }))).toEqual({ miles: 50_000, months: 60 });
    expect(lookupInterval(type(SERVICE_IDS.cabin), vehicle({ bodyType: 'van' }))).toEqual({ miles: 12_000, months: 12 });
  });

  it('falls back to the generic interval stored on the service type', () => {
    const custom: ServiceType = { id: 'diff', name: 'Differential', miles: 20_000, months: 24, builtIn: false };
    expect(lookupInterval(custom, vehicle({ bodyType: 'truck', year: 2024, mileage: 180_000 }))).toEqual({
      miles: 20_000,
      months: 24,
    });

    const edited = { ...type(SERVICE_IDS.air), miles: 9_999, months: 9 };
    expect(lookupInterval(edited, vehicle({ year: 2024, bodyType: 'truck' }))).toEqual({ miles: 9_999, months: 9 });
  });
});
