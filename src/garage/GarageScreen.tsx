import { useState } from 'react';
import { todayISO } from '../domain/dates';
import { garageTasks } from '../domain/due';
import type { FuelUp, ServiceRecord, ServiceType, Vehicle } from '../domain/types';
import { ConfirmRemoveDialog, FuelDialog, ServiceDialog, ServiceTypesDialog, VehicleDialog } from './forms';
import { TaskList } from './TaskList';
import { useGarage } from './useGarage';
import { VehicleDetail } from './VehicleDetail';
import { VehicleList } from './VehicleList';

type DialogState = 'create' | 'edit' | 'remove' | 'service' | 'fuel' | 'types' | null;

function createId(): string {
  return crypto.randomUUID();
}

export function GarageScreen() {
  const { data, dispatch } = useGarage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const selected = data.vehicles.find((vehicle) => vehicle.id === selectedId) ?? data.vehicles[0] ?? null;
  const tasks = garageTasks(data, todayISO());

  function selectVehicle(id: string) {
    setSelectedId(id);
    document.getElementById('vehicle-detail')?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Maintenance log</p>
            <h1 className="font-display text-4xl leading-none">Garage</h1>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-muted sm:block">Vehicles, fuel economy, and what is due — kept in this browser.</p>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-7xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-4 lg:grid-cols-[18rem_minmax(0,1fr)_20rem] lg:items-start">
        <VehicleList vehicles={data.vehicles} selectedId={selected?.id ?? null} onSelect={selectVehicle} onAdd={() => setDialog('create')} />
        <VehicleDetail
          vehicle={selected}
          serviceTypes={data.serviceTypes}
          services={data.services}
          fuelUps={data.fuelUps}
          onEdit={() => setDialog('edit')}
          onRemove={() => setDialog('remove')}
          onLogService={() => setDialog('service')}
          onLogFuel={() => setDialog('fuel')}
        />
        <TaskList tasks={tasks} onSelectVehicle={selectVehicle} onManageTypes={() => setDialog('types')} />
      </main>

      {dialog === 'create' ? (
        <VehicleDialog
          title="New vehicle"
          submitLabel="Save vehicle"
          onClose={() => setDialog(null)}
          onSubmit={(draft) => {
            const vehicle: Vehicle = { ...draft, id: createId() };
            dispatch({ type: 'add-vehicle', vehicle });
            setSelectedId(vehicle.id);
            setDialog(null);
          }}
        />
      ) : null}

      {dialog === 'edit' && selected ? (
        <VehicleDialog
          title="Edit vehicle"
          submitLabel="Save changes"
          initial={selected}
          onClose={() => setDialog(null)}
          onSubmit={(draft) => {
            dispatch({ type: 'update-vehicle', vehicle: { ...selected, ...draft } });
            setDialog(null);
          }}
        />
      ) : null}

      {dialog === 'remove' && selected ? (
        <ConfirmRemoveDialog
          name={selected.description}
          onClose={() => setDialog(null)}
          onConfirm={() => {
            dispatch({ type: 'remove-vehicle', id: selected.id });
            setSelectedId(null);
            setDialog(null);
          }}
        />
      ) : null}

      {dialog === 'service' && selected ? (
        <ServiceDialog
          vehicle={selected}
          serviceTypes={data.serviceTypes}
          onClose={() => setDialog(null)}
          onSubmit={(draft) => {
            const service: ServiceRecord = { ...draft, id: createId(), vehicleId: selected.id };
            dispatch({ type: 'add-service', service });
            setDialog(null);
          }}
        />
      ) : null}

      {dialog === 'fuel' && selected ? (
        <FuelDialog
          vehicle={selected}
          onClose={() => setDialog(null)}
          onSubmit={(draft) => {
            const fuel: FuelUp = { ...draft, id: createId(), vehicleId: selected.id };
            dispatch({ type: 'add-fuel', fuel });
            setDialog(null);
          }}
        />
      ) : null}

      {dialog === 'types' ? (
        <ServiceTypesDialog
          serviceTypes={data.serviceTypes}
          onClose={() => setDialog(null)}
          onAdd={(draft) => {
            const serviceType: ServiceType = { ...draft, id: createId(), builtIn: false };
            dispatch({ type: 'add-service-type', serviceType });
          }}
          onRemove={(id) => dispatch({ type: 'remove-service-type', id })}
        />
      ) : null}
    </div>
  );
}
