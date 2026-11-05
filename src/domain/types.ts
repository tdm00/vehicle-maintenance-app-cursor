export const BODY_TYPES = ['car', 'truck', 'van', 'suv'] as const;

export type BodyType = (typeof BODY_TYPES)[number];

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  car: 'Car',
  truck: 'Truck',
  van: 'Van',
  suv: 'SUV',
};

export interface Vehicle {
  id: string;
  description: string;
  make: string;
  model: string;
  year: number;
  color: string;
  bodyType: BodyType;
  mileage: number;
}

export interface ServiceType {
  id: string;
  name: string;
  miles: number;
  months: number;
  builtIn: boolean;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  date: string;
  serviceTypeIds: string[];
  cost: number | null;
  mileage: number;
}

export interface FuelUp {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  gallons: number;
  cost: number;
}

export interface GarageData {
  version: 1;
  vehicles: Vehicle[];
  serviceTypes: ServiceType[];
  services: ServiceRecord[];
  fuelUps: FuelUp[];
}

export const SCHEMA_VERSION = 1 as const;

export const STORAGE_KEY = 'vm.garage';

export interface Interval {
  miles: number;
  months: number;
}
