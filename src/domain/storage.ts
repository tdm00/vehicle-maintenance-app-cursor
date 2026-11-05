import { builtInServiceTypes } from './defaults';
import { isISODate } from './dates';
import { BODY_TYPES, SCHEMA_VERSION, STORAGE_KEY, type BodyType, type FuelUp, type GarageData, type Insurance, type ServiceRecord, type ServiceType, type Vehicle } from './types';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function finite(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : null;
}

function bodyType(value: unknown): BodyType | null {
  return typeof value === 'string' && (BODY_TYPES as readonly string[]).includes(value) ? (value as BodyType) : null;
}

function optionalLine(value: unknown): string | undefined | null {
  if (value == null || value === '') return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** A missing policy is allowed. A partial or invalid policy rejects the vehicle. */
function normalizeInsurance(value: unknown): Insurance | undefined | null {
  if (value == null) return undefined;
  if (!isRecord(value)) return null;
  const company = text(value.company);
  const policyNumber = text(value.policyNumber);
  const expiresOn = typeof value.expiresOn === 'string' ? value.expiresOn.trim() : '';
  if (!company || !policyNumber || !isISODate(expiresOn)) return null;
  const phone = optionalLine(value.phone);
  const notes = optionalLine(value.notes);
  if (phone === null || notes === null) return null;
  const policy: Insurance = { company, policyNumber, expiresOn };
  if (phone) policy.phone = phone;
  if (notes) policy.notes = notes;
  return policy;
}

function normalizeVehicle(value: unknown): Vehicle | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const description = text(value.description);
  const make = text(value.make);
  const model = text(value.model);
  const year = finite(value.year);
  const mileage = finite(value.mileage);
  const type = bodyType(value.bodyType);
  const color = typeof value.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.color) ? value.color : '#1e3a5f';
  if (!id || !description || !make || !model || year == null || mileage == null || !type) return null;
  if (year < 1900 || year > 2100 || mileage < 0) return null;
  const insurance = normalizeInsurance(value.insurance);
  if (insurance === null) return null;
  const vehicle: Vehicle = {
    id,
    description,
    make,
    model,
    year: Math.round(year),
    color,
    bodyType: type,
    mileage,
  };
  if (insurance) vehicle.insurance = insurance;
  return vehicle;
}

function normalizeServiceType(value: unknown): ServiceType | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const name = text(value.name);
  const miles = finite(value.miles);
  const months = finite(value.months);
  if (!id || !name || miles == null || months == null || miles < 0 || months < 0) return null;
  if (miles === 0 && months === 0) return null;
  return { id, name, miles, months, builtIn: value.builtIn === true };
}

function normalizeService(value: unknown): ServiceRecord | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const vehicleId = text(value.vehicleId);
  const date = text(value.date);
  const mileage = finite(value.mileage);
  const ids = Array.isArray(value.serviceTypeIds) ? value.serviceTypeIds.filter((item): item is string => typeof item === 'string' && item.trim() !== '') : [];
  if (!id || !vehicleId || !date || !isISODate(date) || mileage == null || mileage < 0 || ids.length === 0) return null;
  const costNumber = value.cost == null || value.cost === '' ? null : finite(value.cost);
  if (value.cost != null && value.cost !== '' && (costNumber == null || costNumber < 0)) return null;
  return { id, vehicleId, date, serviceTypeIds: [...new Set(ids)], cost: costNumber, mileage };
}

function normalizeFuel(value: unknown): FuelUp | null {
  if (!isRecord(value)) return null;
  const id = text(value.id);
  const vehicleId = text(value.vehicleId);
  const date = text(value.date);
  const odometer = finite(value.odometer);
  const gallons = finite(value.gallons);
  const cost = finite(value.cost);
  if (!id || !vehicleId || !date || !isISODate(date) || odometer == null || gallons == null || cost == null) return null;
  if (odometer < 0 || gallons < 0 || cost < 0) return null;
  return { id, vehicleId, date, odometer, gallons, cost };
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function emptyGarage(): GarageData {
  return {
    version: SCHEMA_VERSION,
    vehicles: [],
    serviceTypes: builtInServiceTypes(),
    services: [],
    fuelUps: [],
  };
}

function normalizeV1(value: Record<string, unknown>): GarageData {
  const vehicles = uniqueById(Array.isArray(value.vehicles) ? value.vehicles.map(normalizeVehicle).filter((item): item is Vehicle => item !== null) : []);
  const serviceTypes = Array.isArray(value.serviceTypes)
    ? uniqueById(value.serviceTypes.map(normalizeServiceType).filter((item): item is ServiceType => item !== null))
    : builtInServiceTypes();
  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  const services = (Array.isArray(value.services) ? value.services.map(normalizeService).filter((item): item is ServiceRecord => item !== null) : []).filter((service) =>
    vehicleIds.has(service.vehicleId),
  );
  const fuelUps = (Array.isArray(value.fuelUps) ? value.fuelUps.map(normalizeFuel).filter((item): item is FuelUp => item !== null) : []).filter((fuel) =>
    vehicleIds.has(fuel.vehicleId),
  );
  return {
    version: SCHEMA_VERSION,
    vehicles,
    serviceTypes,
    services: uniqueById(services),
    fuelUps: uniqueById(fuelUps),
  };
}

/**
 * Accept a backup payload only when every record passes the normalizers.
 * Invalid, duplicate, or orphaned records fail the whole document.
 */
export function normalizeGarage(raw: unknown): GarageData | null {
  if (!isRecord(raw) || raw.version !== SCHEMA_VERSION) return null;
  if (!Array.isArray(raw.vehicles) || !Array.isArray(raw.serviceTypes) || !Array.isArray(raw.services) || !Array.isArray(raw.fuelUps)) return null;

  const vehicles = raw.vehicles.map(normalizeVehicle);
  const serviceTypes = raw.serviceTypes.map(normalizeServiceType);
  const services = raw.services.map(normalizeService);
  const fuelUps = raw.fuelUps.map(normalizeFuel);
  if (vehicles.some((item) => item == null) || serviceTypes.some((item) => item == null) || services.some((item) => item == null) || fuelUps.some((item) => item == null)) {
    return null;
  }

  const garage = normalizeV1({ version: SCHEMA_VERSION, vehicles, serviceTypes, services, fuelUps });
  if (garage.vehicles.length !== vehicles.length || garage.serviceTypes.length !== serviceTypes.length || garage.services.length !== services.length || garage.fuelUps.length !== fuelUps.length) {
    return null;
  }
  return garage;
}

export function migrate(raw: unknown): GarageData {
  if (!isRecord(raw)) return emptyGarage();
  if (raw.version === SCHEMA_VERSION) return normalizeV1(raw);
  if ((raw.version == null || raw.version === 0) && Array.isArray(raw.vehicles)) {
    const fresh = emptyGarage();
    fresh.vehicles = uniqueById(raw.vehicles.map(normalizeVehicle).filter((item): item is Vehicle => item !== null));
    return fresh;
  }
  return emptyGarage();
}

export function loadGarage(storage: KeyValueStore): GarageData {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw == null || raw.trim() === '') return emptyGarage();
  try {
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return emptyGarage();
  }
}

export function saveGarage(storage: KeyValueStore, data: GarageData): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: SCHEMA_VERSION }));
}
