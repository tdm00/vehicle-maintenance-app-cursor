import { SERVICE_IDS } from './defaults';
import type { BodyType, Interval, ServiceType } from './types';

export interface IntervalVehicle {
  make: string;
  model: string;
  year: number;
  bodyType: BodyType;
  mileage: number;
}

interface IntervalRule {
  serviceTypeId: string;
  interval: Interval;
  matches: (vehicle: IntervalVehicle) => boolean;
}

function name(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Specific schedules win over the generic interval stored on the service type.
 * First match wins, so make/model comes before body, mileage, and year.
 */
const RULES: readonly IntervalRule[] = [
  {
    serviceTypeId: SERVICE_IDS.oil,
    interval: { miles: 10_000, months: 12 },
    matches: (vehicle) => name(vehicle.make) === 'toyota' && name(vehicle.model) === 'prius',
  },
  {
    serviceTypeId: SERVICE_IDS.oil,
    interval: { miles: 4_000, months: 3 },
    matches: (vehicle) => vehicle.bodyType === 'truck',
  },
  {
    serviceTypeId: SERVICE_IDS.oil,
    interval: { miles: 4_000, months: 3 },
    matches: (vehicle) => vehicle.mileage >= 150_000,
  },
  {
    serviceTypeId: SERVICE_IDS.oil,
    interval: { miles: 7_500, months: 6 },
    matches: (vehicle) => vehicle.year >= 2018,
  },
  {
    serviceTypeId: SERVICE_IDS.tire,
    interval: { miles: 5_000, months: 6 },
    matches: (vehicle) => vehicle.bodyType === 'truck',
  },
  {
    serviceTypeId: SERVICE_IDS.plugs,
    interval: { miles: 60_000, months: 72 },
    matches: (vehicle) => vehicle.year >= 2016,
  },
  {
    serviceTypeId: SERVICE_IDS.coolant,
    interval: { miles: 50_000, months: 60 },
    matches: (vehicle) => vehicle.year >= 2020,
  },
  {
    serviceTypeId: SERVICE_IDS.cabin,
    interval: { miles: 12_000, months: 12 },
    matches: (vehicle) => vehicle.bodyType === 'van',
  },
];

export function lookupInterval(serviceType: Pick<ServiceType, 'id' | 'miles' | 'months'>, vehicle: IntervalVehicle): Interval {
  const rule = RULES.find((candidate) => candidate.serviceTypeId === serviceType.id && candidate.matches(vehicle));
  if (rule) return { ...rule.interval };
  return { miles: serviceType.miles, months: serviceType.months };
}
