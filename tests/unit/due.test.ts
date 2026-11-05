import { describe, expect, it } from 'vitest';
import { addMonths } from '../../src/domain/dates';
import { builtInServiceTypes, SERVICE_IDS } from '../../src/domain/defaults';
import { assessInsurance, assessService, garageTasks } from '../../src/domain/due';
import { emptyGarage } from '../../src/domain/storage';
import type { Vehicle } from '../../src/domain/types';

const oil = { miles: 5_000, months: 3 };

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    description: 'Daily driver',
    make: 'Honda',
    model: 'Civic',
    year: 2010,
    color: '#112233',
    bodyType: 'car',
    mileage: 8_000,
    ...overrides,
  };
}

describe('due and overdue rules', () => {
  it('adds months without rolling past the end of a short month', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2026-01-15', 3)).toBe('2026-04-15');
  });

  it('treats a never-serviced type as due', () => {
    const result = assessService({
      interval: oil,
      lastDate: null,
      lastMileage: null,
      currentMileage: 8_000,
      today: '2026-06-15',
    });
    expect(result.status).toBe('overdue');
    expect(result.headline).toBe('Due — never serviced');
    expect(result.urgency).toBeCloseTo(1.6);
  });

  it('stays on schedule just after a service', () => {
    const result = assessService({
      interval: oil,
      lastDate: '2026-06-15',
      lastMileage: 8_000,
      currentMileage: 8_100,
      today: '2026-06-15',
    });
    expect(result.status).toBe('ok');
  });

  it('marks mileage that reaches the interval as overdue', () => {
    const result = assessService({
      interval: oil,
      lastDate: '2026-06-15',
      lastMileage: 8_000,
      currentMileage: 13_000,
      today: '2026-06-20',
    });
    expect(result.status).toBe('overdue');
    expect(result.headline).toBe('Due now');
  });

  it('marks mileage past the interval as overdue by the extra miles', () => {
    const result = assessService({
      interval: oil,
      lastDate: '2026-06-15',
      lastMileage: 8_000,
      currentMileage: 14_200,
      today: '2026-07-01',
    });
    expect(result.status).toBe('overdue');
    expect(result.headline).toBe('Overdue by 1,200 miles');
    expect(result.urgency).toBeGreaterThan(1);
  });

  it('marks the last fifth of an interval as due soon', () => {
    const dueSoon = assessService({
      interval: oil,
      lastDate: '2026-06-15',
      lastMileage: 8_000,
      currentMileage: 12_000,
      today: '2026-06-20',
    });
    expect(dueSoon.status).toBe('due-soon');
    expect(dueSoon.headline).toBe('Due soon — 1,000 miles left');

    const notYet = assessService({
      interval: oil,
      lastDate: '2026-06-15',
      lastMileage: 8_000,
      currentMileage: 11_999,
      today: '2026-06-20',
    });
    expect(notYet.status).toBe('ok');
  });

  it('marks a service as overdue when the time interval has elapsed', () => {
    const overdue = assessService({
      interval: oil,
      lastDate: '2026-01-15',
      lastMileage: 8_000,
      currentMileage: 8_100,
      today: '2026-04-15',
    });
    expect(overdue.status).toBe('overdue');
    expect(overdue.headline).toBe('Due now');

    const later = assessService({
      interval: oil,
      lastDate: '2026-01-15',
      lastMileage: 8_000,
      currentMileage: 8_100,
      today: '2026-06-15',
    });
    expect(later.status).toBe('overdue');
    expect(later.headline).toBe('Overdue by 2 months');

    const dayBefore = assessService({
      interval: oil,
      lastDate: '2026-01-15',
      lastMileage: 8_000,
      currentMileage: 8_100,
      today: '2026-04-14',
    });
    expect(dayBefore.status).toBe('due-soon');
    expect(dayBefore.headline).toBe('Due soon — 1 day left');
  });

  it('uses the latest service of that type and ignores other types', () => {
    const data = emptyGarage();
    data.vehicles = [vehicle({ mileage: 20_000 })];
    data.services = [
      { id: 'old', vehicleId: 'v1', date: '2024-01-01', serviceTypeIds: [SERVICE_IDS.oil], cost: null, mileage: 1_000 },
      {
        id: 'recent',
        vehicleId: 'v1',
        date: '2026-06-01',
        serviceTypeIds: [SERVICE_IDS.oil, SERVICE_IDS.tire],
        cost: 40,
        mileage: 19_800,
      },
    ];
    const tasks = garageTasks(data, '2026-06-10');
    expect(tasks.some((task) => task.serviceTypeId === SERVICE_IDS.oil)).toBe(false);
    expect(tasks.some((task) => task.serviceTypeId === SERVICE_IDS.tire)).toBe(false);
    expect(tasks.some((task) => task.serviceTypeId === SERVICE_IDS.brake)).toBe(true);
  });

  it('sorts garage tasks by how overdue they are', () => {
    const data = emptyGarage();
    data.serviceTypes = builtInServiceTypes().filter((type) => type.id === SERVICE_IDS.oil);
    data.vehicles = [
      vehicle({ id: 'low', description: 'Around town', mileage: 3_000 }),
      vehicle({ id: 'high', description: 'Highway', mileage: 20_000 }),
    ];
    const tasks = garageTasks(data, '2026-06-15');
    expect(tasks.map((task) => task.vehicleId)).toEqual(['high', 'low']);
    expect(tasks[0].urgency).toBeGreaterThan(tasks[1].urgency);
    expect(tasks.every((task) => task.status === 'overdue')).toBe(true);
  });

  it('puts overdue items ahead of due-soon items', () => {
    const data = emptyGarage();
    data.serviceTypes = builtInServiceTypes().filter((type) => type.id === SERVICE_IDS.oil || type.id === SERVICE_IDS.tire);
    data.vehicles = [vehicle({ mileage: 10_000 })];
    data.services = [
      { id: 'oil', vehicleId: 'v1', date: '2026-06-01', serviceTypeIds: [SERVICE_IDS.oil], cost: null, mileage: 4_000 },
      { id: 'tire', vehicleId: 'v1', date: '2026-06-01', serviceTypeIds: [SERVICE_IDS.tire], cost: null, mileage: 5_100 },
    ];
    const tasks = garageTasks(data, '2026-06-15');
    expect(tasks.map((task) => task.serviceTypeId)).toEqual([SERVICE_IDS.oil, SERVICE_IDS.tire]);
    expect(tasks[0].status).toBe('overdue');
    expect(tasks[1].status).toBe('due-soon');
  });
});

describe('insurance expiration', () => {
  const today = '2026-06-01';

  it('is expired, due soon within 30 days, or fine', () => {
    expect(assessInsurance('2026-05-31', today)).toMatchObject({ status: 'expired', headline: 'Overdue by 1 day' });
    expect(assessInsurance('2026-06-01', today)).toMatchObject({ status: 'due-soon', headline: 'Due now' });
    expect(assessInsurance('2026-07-01', today)).toMatchObject({ status: 'due-soon', headline: 'Due soon — 30 days left' });
    expect(assessInsurance('2026-07-02', today).status).toBe('fine');
  });

  it('lists expired and due-soon policies with the other tasks, expired first', () => {
    const data = emptyGarage();
    data.serviceTypes = [];
    data.vehicles = [
      vehicle({
        id: 'soon',
        description: 'Soon',
        insurance: { company: 'A', policyNumber: '1', expiresOn: '2026-06-20' },
      }),
      vehicle({
        id: 'late',
        description: 'Late',
        insurance: { company: 'B', policyNumber: '2', expiresOn: '2026-05-01' },
      }),
      vehicle({
        id: 'fine',
        description: 'Fine',
        insurance: { company: 'C', policyNumber: '3', expiresOn: '2026-12-01' },
      }),
    ];
    const tasks = garageTasks(data, today);
    expect(tasks.map((task) => task.vehicleId)).toEqual(['late', 'soon']);
    expect(tasks[0]).toMatchObject({ serviceTypeName: 'Insurance', status: 'overdue', vehicleName: 'Late' });
    expect(tasks[1]).toMatchObject({ serviceTypeName: 'Insurance', status: 'due-soon', vehicleName: 'Soon' });
  });
});
