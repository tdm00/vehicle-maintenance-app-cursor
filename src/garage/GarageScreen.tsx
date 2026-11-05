import { useState } from 'react';
import { Button } from '../components/Button';
import { BackupError, createBackup, readBackup } from '../domain/backup';
import { todayISO } from '../domain/dates';
import { garageTasks } from '../domain/due';
import type { FuelUp, GarageData, ServiceRecord, ServiceType, Vehicle } from '../domain/types';
import { ConfirmRemoveDialog, ExportDialog, FuelDialog, ImportDialog, ServiceDialog, ServiceTypesDialog, VehicleDialog } from './forms';
import { TaskList } from './TaskList';
import { useGarage } from './useGarage';
import { VehicleDetail } from './VehicleDetail';
import { VehicleList } from './VehicleList';

type DialogState = 'create' | 'edit' | 'remove' | 'service' | 'fuel' | 'types' | 'export' | 'import' | null;

function downloadBackup(body: string) {
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'garage-backup.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readBackupText(text: string, passphrase: string): Promise<GarageData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new BackupError('format');
  }
  return readBackup(parsed, passphrase);
}

function createId(): string {
  return crypto.randomUUID();
}

export function GarageScreen() {
  const { data, dispatch, replace } = useGarage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [fuelEdit, setFuelEdit] = useState<FuelUp | null>(null);
  const selected = data.vehicles.find((vehicle) => vehicle.id === selectedId) ?? data.vehicles[0] ?? null;
  const tasks = garageTasks(data, todayISO());

  function selectVehicle(id: string) {
    setSelectedId(id);
    document.getElementById('vehicle-detail')?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted">Maintenance log</p>
            <h1 className="font-display text-4xl leading-none">Garage</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <p className="hidden max-w-xs text-right text-sm text-muted sm:block">Vehicles, fuel economy, and what is due — kept in this browser.</p>
            <Button variant="secondary" onClick={() => setDialog('export')}>
              Export
            </Button>
            <Button variant="secondary" onClick={() => setDialog('import')}>
              Import
            </Button>
          </div>
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
          onEditFuel={setFuelEdit}
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

      {fuelEdit && selected ? (
        <FuelDialog
          key={fuelEdit.id}
          vehicle={selected}
          initial={fuelEdit}
          onClose={() => setFuelEdit(null)}
          onSubmit={(draft) => {
            dispatch({ type: 'update-fuel', fuel: { ...fuelEdit, ...draft } });
            setFuelEdit(null);
          }}
        />
      ) : null}

      {dialog === 'export' ? (
        <ExportDialog
          onClose={() => setDialog(null)}
          onExport={async (passphrase) => {
            const file = await createBackup(data, passphrase);
            downloadBackup(`${JSON.stringify(file, null, 2)}\n`);
          }}
        />
      ) : null}

      {dialog === 'import' ? (
        <ImportDialog
          onClose={() => setDialog(null)}
          onRead={readBackupText}
          onConfirm={(garage) => {
            replace(garage);
            setSelectedId((current) => (current && garage.vehicles.some((vehicle) => vehicle.id === current) ? current : null));
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
