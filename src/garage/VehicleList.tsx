import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { VehicleArt } from '../components/VehicleArt';
import { formatNumber } from '../domain/format';
import type { Vehicle } from '../domain/types';

export function VehicleList({
  vehicles,
  selectedId,
  onSelect,
  onAdd,
}: {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Card aria-label="Vehicles" className="p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">Vehicles</h2>
        <Button onClick={onAdd}>Add vehicle</Button>
      </div>
      {vehicles.length === 0 ? (
        <p className="px-1 py-6 text-sm text-muted">The garage is empty. Add the first vehicle to start a log.</p>
      ) : (
        <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {vehicles.map((vehicle) => {
            const selected = vehicle.id === selectedId;
            return (
              <li key={vehicle.id} className="min-w-44 lg:min-w-0">
                <button
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(vehicle.id)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-2 py-2 text-left ${selected ? 'border-accent bg-[#fff3e8]' : 'border-transparent hover:bg-[#f6f0e4]'}`}
                >
                  <VehicleArt bodyType={vehicle.bodyType} color={vehicle.color} className="h-12 w-20 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{vehicle.description}</span>
                    <span className="block truncate text-xs text-muted">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                    <span className="block text-xs text-muted">{formatNumber(vehicle.mileage)} mi</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
