import type { FuelUp, GarageData, ServiceRecord, ServiceType, Vehicle } from './types';

export type GarageAction =
  | { type: 'add-vehicle'; vehicle: Vehicle }
  | { type: 'update-vehicle'; vehicle: Vehicle }
  | { type: 'remove-vehicle'; id: string }
  | { type: 'add-service'; service: ServiceRecord }
  | { type: 'add-fuel'; fuel: FuelUp }
  | { type: 'update-fuel'; fuel: FuelUp }
  | { type: 'add-service-type'; serviceType: ServiceType }
  | { type: 'remove-service-type'; id: string };

function bumpMileage(vehicle: Vehicle, reading: number): Vehicle {
  return reading > vehicle.mileage ? { ...vehicle, mileage: reading } : vehicle;
}

export function garageReducer(state: GarageData, action: GarageAction): GarageData {
  switch (action.type) {
    case 'add-vehicle':
      return { ...state, vehicles: [...state.vehicles, action.vehicle] };
    case 'update-vehicle':
      return {
        ...state,
        vehicles: state.vehicles.map((vehicle) => (vehicle.id === action.vehicle.id ? action.vehicle : vehicle)),
      };
    case 'remove-vehicle':
      return {
        ...state,
        vehicles: state.vehicles.filter((vehicle) => vehicle.id !== action.id),
        services: state.services.filter((service) => service.vehicleId !== action.id),
        fuelUps: state.fuelUps.filter((fuel) => fuel.vehicleId !== action.id),
      };
    case 'add-service':
      return {
        ...state,
        vehicles: state.vehicles.map((vehicle) =>
          vehicle.id === action.service.vehicleId ? bumpMileage(vehicle, action.service.mileage) : vehicle,
        ),
        services: [...state.services, action.service],
      };
    case 'add-fuel':
      return {
        ...state,
        vehicles: state.vehicles.map((vehicle) =>
          vehicle.id === action.fuel.vehicleId ? bumpMileage(vehicle, action.fuel.odometer) : vehicle,
        ),
        fuelUps: [...state.fuelUps, action.fuel],
      };
    case 'update-fuel': {
      if (!state.fuelUps.some((fuel) => fuel.id === action.fuel.id)) return state;
      return {
        ...state,
        vehicles: state.vehicles.map((vehicle) =>
          vehicle.id === action.fuel.vehicleId ? bumpMileage(vehicle, action.fuel.odometer) : vehicle,
        ),
        fuelUps: state.fuelUps.map((fuel) => (fuel.id === action.fuel.id ? action.fuel : fuel)),
      };
    }
    case 'add-service-type':
      return { ...state, serviceTypes: [...state.serviceTypes, action.serviceType] };
    case 'remove-service-type':
      return { ...state, serviceTypes: state.serviceTypes.filter((serviceType) => serviceType.id !== action.id) };
    default:
      return state;
  }
}
