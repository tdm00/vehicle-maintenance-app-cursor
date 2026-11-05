import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { VehicleArt } from '../components/VehicleArt';
import { todayISO } from '../domain/dates';
import { assessService } from '../domain/due';
import { formatDate, formatMoney, formatMpg, formatNumber } from '../domain/format';
import { lookupInterval } from '../domain/intervals';
import { economyById, fuelEconomy } from '../domain/mpg';
import { BODY_TYPE_LABELS, type FuelUp, type ServiceRecord, type ServiceType, type Vehicle } from '../domain/types';

function serviceNames(types: ServiceType[], ids: string[]): string {
  return ids.map((id) => types.find((type) => type.id === id)?.name ?? 'Removed service').join(', ');
}

export function VehicleDetail({
  vehicle,
  serviceTypes,
  services,
  fuelUps,
  onEdit,
  onRemove,
  onLogService,
  onLogFuel,
}: {
  vehicle: Vehicle | null;
  serviceTypes: ServiceType[];
  services: ServiceRecord[];
  fuelUps: FuelUp[];
  onEdit: () => void;
  onRemove: () => void;
  onLogService: () => void;
  onLogFuel: () => void;
}) {
  if (!vehicle) {
    return (
      <Card id="vehicle-detail" aria-label="Selected vehicle" className="flex min-h-64 items-center justify-center p-6 text-center">
        <p className="max-w-sm text-sm text-muted">Select a vehicle, or add one, to log service and fuel.</p>
      </Card>
    );
  }

  const vehicleServices = services
    .filter((service) => service.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.mileage - a.mileage);
  const vehicleFuel = fuelUps
    .filter((fuel) => fuel.vehicleId === vehicle.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer || a.id.localeCompare(b.id));
  const economy = fuelEconomy(vehicleFuel);
  const byFill = economyById(economy);
  const today = todayISO();

  return (
    <Card id="vehicle-detail" aria-label="Selected vehicle" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{BODY_TYPE_LABELS[vehicle.bodyType]}</p>
          <h2 className="font-display text-3xl leading-tight">{vehicle.description}</h2>
          <p className="text-sm text-muted">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="danger" onClick={onRemove}>
            Remove
          </Button>
        </div>
      </div>

      <VehicleArt bodyType={vehicle.bodyType} color={vehicle.color} className="mx-auto mt-2 h-32 w-full max-w-md" />

      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted">Mileage</dt>
          <dd className="font-medium">{formatNumber(vehicle.mileage)} mi</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Color</dt>
          <dd className="flex items-center gap-2 font-medium">
            <span className="inline-block h-4 w-4 rounded-full border border-line" style={{ background: vehicle.color }} />
            {vehicle.color}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Fuel average</dt>
          <dd>
            <output aria-label="Average fuel economy" className="font-medium">
              {formatMpg(economy.average)}
            </output>
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onLogService}>Log service</Button>
        <Button variant="secondary" onClick={onLogFuel}>
          Log fill-up
        </Button>
      </div>

      <section className="mt-6" aria-label="Fuel log">
        <h3 className="font-display text-xl">Fuel</h3>
        <p className="mb-2 text-xs text-muted">The first fill-up is stored and left out of the average. Later fill-ups divide miles since the previous one by gallons.</p>
        {vehicleFuel.length === 0 ? (
          <p className="text-sm text-muted">Log two fill-ups to calculate miles per gallon.</p>
        ) : (
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Odometer</th>
                  <th className="py-2 pr-3 font-medium">Gallons</th>
                  <th className="py-2 pr-3 font-medium">Cost</th>
                  <th className="py-2 pr-3 font-medium">MPG</th>
                  <th className="py-2 font-medium">Running average</th>
                </tr>
              </thead>
              <tbody>
                {vehicleFuel.map((fuel) => {
                  const row = byFill.get(fuel.id);
                  return (
                    <tr key={fuel.id} className="border-b border-line/70">
                      <td className="py-2 pr-3">{formatDate(fuel.date)}</td>
                      <td className="py-2 pr-3">{formatNumber(fuel.odometer)}</td>
                      <td className="py-2 pr-3">{fuel.gallons}</td>
                      <td className="py-2 pr-3">{formatMoney(fuel.cost)}</td>
                      <td className="py-2 pr-3">{formatMpg(row?.mpg ?? null)}</td>
                      <td className="py-2">{formatMpg(row?.runningAverage ?? null)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6" aria-label="Service history">
        <h3 className="font-display text-xl">Service history</h3>
        {vehicleServices.length === 0 ? (
          <p className="mt-1 text-sm text-muted">No service recorded yet. Every type is treated as due until the first visit.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {vehicleServices.map((service) => (
              <li key={service.id} className="rounded-xl border border-line px-3 py-2 text-sm">
                <span className="font-medium">{serviceNames(serviceTypes, service.serviceTypeIds)}</span>
                <span className="mt-1 block text-xs text-muted">
                  {formatDate(service.date)} · {formatNumber(service.mileage)} mi
                  {service.cost != null ? ` · ${formatMoney(service.cost)}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm font-medium">Service schedule</summary>
        <ul className="mt-2 flex flex-col gap-2">
          {serviceTypes.map((type) => {
            const last = vehicleServices.find((service) => service.serviceTypeIds.includes(type.id));
            const interval = lookupInterval(type, vehicle);
            const assessment = assessService({
              interval,
              lastDate: last?.date ?? null,
              lastMileage: last?.mileage ?? null,
              currentMileage: vehicle.mileage,
              today,
            });
            return (
              <li key={type.id} className="text-sm">
                <span className="font-medium">{type.name}</span>
                <span className="text-muted">
                  {' '}
                  · {formatNumber(interval.miles)} miles or {interval.months} months · {assessment.headline || 'On schedule'}
                </span>
              </li>
            );
          })}
        </ul>
      </details>
    </Card>
  );
}
