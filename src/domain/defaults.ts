import type { ServiceType } from './types';

export const SERVICE_IDS = {
  oil: 'oil-change',
  tire: 'tire-rotation',
  brake: 'brake-inspection',
  air: 'air-filter',
  cabin: 'cabin-filter',
  coolant: 'coolant',
  transmission: 'transmission-fluid',
  plugs: 'spark-plugs',
  battery: 'battery',
  wipers: 'wipers',
} as const;

const BUILT_IN_SERVICE_TYPES: readonly ServiceType[] = [
  { id: SERVICE_IDS.oil, name: 'Oil change', miles: 5_000, months: 3, builtIn: true },
  { id: SERVICE_IDS.tire, name: 'Tire rotation', miles: 6_000, months: 6, builtIn: true },
  { id: SERVICE_IDS.brake, name: 'Brake inspection', miles: 12_000, months: 12, builtIn: true },
  { id: SERVICE_IDS.air, name: 'Air filter', miles: 15_000, months: 12, builtIn: true },
  { id: SERVICE_IDS.cabin, name: 'Cabin filter', miles: 15_000, months: 12, builtIn: true },
  { id: SERVICE_IDS.coolant, name: 'Coolant', miles: 30_000, months: 24, builtIn: true },
  { id: SERVICE_IDS.transmission, name: 'Transmission fluid', miles: 30_000, months: 24, builtIn: true },
  { id: SERVICE_IDS.plugs, name: 'Spark plugs', miles: 30_000, months: 36, builtIn: true },
  { id: SERVICE_IDS.battery, name: 'Battery', miles: 40_000, months: 36, builtIn: true },
  { id: SERVICE_IDS.wipers, name: 'Wipers', miles: 12_000, months: 6, builtIn: true },
];

export function builtInServiceTypes(): ServiceType[] {
  return BUILT_IN_SERVICE_TYPES.map((type) => ({ ...type }));
}
