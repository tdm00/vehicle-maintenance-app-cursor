import { useState, type FormEvent } from 'react';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { SelectField, TextField } from '../components/Field';
import { todayISO } from '../domain/dates';
import { BODY_TYPES, BODY_TYPE_LABELS, type BodyType, type FuelUp, type ServiceRecord, type ServiceType, type Vehicle } from '../domain/types';

export interface VehicleDraft {
  description: string;
  make: string;
  model: string;
  year: number;
  color: string;
  bodyType: BodyType;
  mileage: number;
}

function integer(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

function decimal(value: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(value.trim())) return null;
  return Number(value.trim());
}

export function VehicleDialog({
  title,
  submitLabel,
  initial,
  onClose,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial?: Vehicle;
  onClose: () => void;
  onSubmit: (draft: VehicleDraft) => void;
}) {
  const [description, setDescription] = useState(initial?.description ?? '');
  const [make, setMake] = useState(initial?.make ?? '');
  const [model, setModel] = useState(initial?.model ?? '');
  const [year, setYear] = useState(initial ? String(initial.year) : '');
  const [color, setColor] = useState(initial?.color ?? '#1e3a5f');
  const [bodyType, setBodyType] = useState<BodyType>(initial?.bodyType ?? 'car');
  const [mileage, setMileage] = useState(initial ? String(initial.mileage) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const yearNumber = integer(year);
    const mileageNumber = integer(mileage);
    if (!description.trim()) next.description = 'Description is required.';
    if (!make.trim()) next.make = 'Make is required.';
    if (!model.trim()) next.model = 'Model is required.';
    if (yearNumber == null || yearNumber < 1900 || yearNumber > 2100) next.year = 'Enter a year from 1900 to 2100.';
    if (mileageNumber == null) next.mileage = 'Enter the current mileage.';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) next.color = 'Choose a color.';
    setErrors(next);
    if (Object.keys(next).length > 0 || yearNumber == null || mileageNumber == null) return;
    onSubmit({
      description: description.trim(),
      make: make.trim(),
      model: model.trim(),
      year: yearNumber,
      color,
      bodyType,
      mileage: mileageNumber,
    });
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="vehicle-form">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="vehicle-form" className="flex flex-col gap-3" noValidate onSubmit={submit}>
        <TextField label="Description" value={description} onChange={(event) => setDescription(event.target.value)} error={errors.description} />
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} error={errors.year} />
          <TextField label="Make" value={make} onChange={(event) => setMake(event.target.value)} error={errors.make} />
          <TextField label="Model" value={model} onChange={(event) => setModel(event.target.value)} error={errors.model} />
        </div>
        <TextField label="Mileage" inputMode="numeric" value={mileage} onChange={(event) => setMileage(event.target.value)} error={errors.mileage} />
        <SelectField label="Body type" value={bodyType} onChange={(event) => setBodyType(event.target.value as BodyType)}>
          {BODY_TYPES.map((type) => (
            <option key={type} value={type}>
              {BODY_TYPE_LABELS[type]}
            </option>
          ))}
        </SelectField>
        <TextField label="Color" type="color" value={color} onChange={(event) => setColor(event.target.value)} error={errors.color} />
        </form>
    </Dialog>
  );
}

export function ServiceDialog({
  vehicle,
  serviceTypes,
  onClose,
  onSubmit,
}: {
  vehicle: Vehicle;
  serviceTypes: ServiceType[];
  onClose: () => void;
  onSubmit: (service: Omit<ServiceRecord, 'id' | 'vehicleId'>) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [mileage, setMileage] = useState(String(Math.round(vehicle.mileage)));
  const [cost, setCost] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const mileageNumber = integer(mileage);
    const costNumber = cost.trim() === '' ? null : decimal(cost);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Enter a service date.';
    if (mileageNumber == null) next.mileage = 'Enter the mileage at service.';
    if (cost.trim() !== '' && (costNumber == null || costNumber < 0)) next.cost = 'Enter a cost, or leave it blank.';
    if (selected.length === 0) next.types = 'Choose at least one service type.';
    setErrors(next);
    if (Object.keys(next).length > 0 || mileageNumber == null) return;
    onSubmit({ date, mileage: mileageNumber, cost: costNumber, serviceTypeIds: selected });
  }

  return (
    <Dialog
      title="Log service"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="service-form">
            Save service
          </Button>
        </>
      }
    >
      <form id="service-form" className="flex flex-col gap-3" noValidate onSubmit={submit}>
        <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} error={errors.date} />
        <TextField label="Mileage at service" inputMode="numeric" value={mileage} onChange={(event) => setMileage(event.target.value)} error={errors.mileage} />
        <TextField label="Cost (optional)" inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} error={errors.cost} />
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Service types</legend>
          {serviceTypes.length === 0 ? <p className="text-sm text-muted">Add a service type before logging work.</p> : null}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {serviceTypes.map((type) => (
              <label key={type.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input type="checkbox" checked={selected.includes(type.id)} onChange={() => toggle(type.id)} />
                {type.name}
              </label>
            ))}
          </div>
          {errors.types ? <p className="text-sm text-overdue">{errors.types}</p> : null}
        </fieldset>
      </form>
    </Dialog>
  );
}

export function FuelDialog({
  vehicle,
  onClose,
  onSubmit,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onSubmit: (fuel: Omit<FuelUp, 'id' | 'vehicleId'>) => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [odometer, setOdometer] = useState(String(Math.round(vehicle.mileage)));
  const [gallons, setGallons] = useState('');
  const [cost, setCost] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const odometerNumber = integer(odometer);
    const gallonNumber = decimal(gallons);
    const costNumber = decimal(cost);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Enter the fill-up date.';
    if (odometerNumber == null) next.odometer = 'Enter the odometer.';
    if (gallonNumber == null || gallonNumber <= 0) next.gallons = 'Enter the gallons pumped.';
    if (costNumber == null) next.cost = 'Enter the fuel cost.';
    setErrors(next);
    if (Object.keys(next).length > 0 || odometerNumber == null || gallonNumber == null || costNumber == null) return;
    onSubmit({ date, odometer: odometerNumber, gallons: gallonNumber, cost: costNumber });
  }

  return (
    <Dialog
      title="Log fill-up"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="fuel-form">
            Save fill-up
          </Button>
        </>
      }
    >
      <form id="fuel-form" className="flex flex-col gap-3" noValidate onSubmit={submit}>
        <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} error={errors.date} />
        <TextField label="Odometer" inputMode="numeric" value={odometer} onChange={(event) => setOdometer(event.target.value)} error={errors.odometer} />
        <TextField label="Gallons" inputMode="decimal" value={gallons} onChange={(event) => setGallons(event.target.value)} error={errors.gallons} />
        <TextField label="Fuel cost" inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} error={errors.cost} />
      </form>
    </Dialog>
  );
}

export function ServiceTypesDialog({
  serviceTypes,
  onClose,
  onAdd,
  onRemove,
}: {
  serviceTypes: ServiceType[];
  onClose: () => void;
  onAdd: (type: Omit<ServiceType, 'id' | 'builtIn'>) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [miles, setMiles] = useState('');
  const [months, setMonths] = useState('');
  const [error, setError] = useState('');

  function add(event: FormEvent) {
    event.preventDefault();
    const milesNumber = integer(miles);
    const monthsNumber = integer(months);
    if (!name.trim()) {
      setError('Name the service type.');
      return;
    }
    if (milesNumber == null || monthsNumber == null || (milesNumber === 0 && monthsNumber === 0)) {
      setError('Enter a mileage interval, a month interval, or both.');
      return;
    }
    setError('');
    onAdd({ name: name.trim(), miles: milesNumber, months: monthsNumber });
    setName('');
    setMiles('');
    setMonths('');
  }

  return (
    <Dialog title="Service types" onClose={onClose}>
      <ul className="mb-4 flex flex-col gap-2">
        {serviceTypes.map((type) => (
          <li key={type.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
            <span>
              <span className="block text-sm font-medium">{type.name}</span>
              <span className="text-xs text-muted">
                {type.miles.toLocaleString('en-US')} miles or {type.months} months
                {type.builtIn ? ' · Built in' : ''}
              </span>
            </span>
            <Button variant="ghost" onClick={() => onRemove(type.id)}>
              Remove {type.name}
            </Button>
          </li>
        ))}
      </ul>
      <form className="flex flex-col gap-3 border-t border-line pt-4" noValidate onSubmit={add}>
        <TextField label="Type name" value={name} onChange={(event) => setName(event.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Miles" inputMode="numeric" value={miles} onChange={(event) => setMiles(event.target.value)} />
          <TextField label="Months" inputMode="numeric" value={months} onChange={(event) => setMonths(event.target.value)} />
        </div>
        {error ? <p className="text-sm text-overdue">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" variant="secondary">
            Add service type
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ConfirmRemoveDialog({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog
      title="Remove vehicle"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Remove vehicle
          </Button>
        </>
      }
    >
      <p className="text-sm leading-6">Remove {name}? Service records and fill-ups for this vehicle will be deleted from this browser.</p>
    </Dialog>
  );
}
