import { Button } from '../components/Button';
import { Card } from '../components/Card';
import type { GarageTask } from '../domain/due';

export function TaskList({
  tasks,
  onSelectVehicle,
  onManageTypes,
}: {
  tasks: GarageTask[];
  onSelectVehicle: (id: string) => void;
  onManageTypes: () => void;
}) {
  const overdue = tasks.filter((task) => task.status === 'overdue').length;
  const dueSoon = tasks.length - overdue;

  return (
    <Card aria-label="Garage tasks" className="p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-xl">Garage tasks</h2>
          <p className="text-xs text-muted">
            {overdue} overdue · {dueSoon} due soon
          </p>
        </div>
        <Button variant="secondary" onClick={onManageTypes}>
          Service types
        </Button>
      </div>
      {tasks.length === 0 ? (
        <p className="px-1 py-6 text-sm text-muted">Nothing is due. Logged service stays ahead of the schedule.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onSelectVehicle(task.vehicleId)}
                className="w-full rounded-xl border border-line px-3 py-2 text-left hover:border-accent"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{task.serviceTypeName}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${task.status === 'overdue' ? 'bg-[#fde8ee] text-overdue' : 'bg-[#f8ecd4] text-soon'}`}
                  >
                    {task.status === 'overdue' ? 'Overdue' : 'Due soon'}
                  </span>
                </span>
                <span className="mt-1 block text-sm">{task.vehicleName}</span>
                <span className="block text-xs text-muted">{task.vehicleDetail}</span>
                <span className={`mt-1 block text-xs ${task.status === 'overdue' ? 'text-overdue' : 'text-soon'}`}>{task.headline}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
