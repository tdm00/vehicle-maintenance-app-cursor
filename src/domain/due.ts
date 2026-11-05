import { addMonths, daysBetween } from './dates';
import { formatNumber } from './format';
import { lookupInterval } from './intervals';
import type { GarageData, Interval, ServiceRecord } from './types';

export const DUE_SOON_RATIO = 0.8;

export type DueStatus = 'ok' | 'due-soon' | 'overdue';

export interface DueAssessment {
  status: DueStatus;
  urgency: number;
  headline: string;
}

export interface GarageTask {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleDetail: string;
  serviceTypeId: string;
  serviceTypeName: string;
  status: Exclude<DueStatus, 'ok'>;
  urgency: number;
  headline: string;
}

function latestService(services: readonly ServiceRecord[], vehicleId: string, serviceTypeId: string): ServiceRecord | null {
  let latest: ServiceRecord | null = null;
  for (const service of services) {
    if (service.vehicleId !== vehicleId || !service.serviceTypeIds.includes(serviceTypeId)) continue;
    if (!latest || service.date > latest.date || (service.date === latest.date && service.mileage > latest.mileage)) {
      latest = service;
    }
  }
  return latest;
}

function timeRatio(lastDate: string, today: string, months: number): { ratio: number; daysSince: number; intervalDays: number } {
  if (months <= 0) return { ratio: 0, daysSince: 0, intervalDays: 0 };
  const dueOn = addMonths(lastDate, months);
  const daysSince = daysBetween(lastDate, today);
  const intervalDays = Math.max(1, daysBetween(lastDate, dueOn));
  return { ratio: daysSince / intervalDays, daysSince, intervalDays };
}

function unit(count: number, singular: string, plural: string): string {
  const amount = Math.round(count);
  return `${formatNumber(amount)} ${amount === 1 ? singular : plural}`;
}

function headlineFor(status: DueStatus, milesRatio: number, timeRatioValue: number, milesSince: number, miles: number, daysSince: number, intervalDays: number): string {
  if (status === 'ok') return '';
  const useMiles = miles > 0 && milesRatio >= timeRatioValue;
  if (status === 'overdue') {
    if (useMiles) {
      const extra = Math.max(0, milesSince - miles);
      return extra === 0 ? 'Due now' : `Overdue by ${unit(extra, 'mile', 'miles')}`;
    }
    const daysOver = Math.max(0, daysSince - intervalDays);
    if (daysOver === 0) return 'Due now';
    if (daysOver >= 60) {
      const monthsOver = Math.max(1, Math.round(daysOver / 30.4375));
      return `Overdue by ${unit(monthsOver, 'month', 'months')}`;
    }
    return `Overdue by ${unit(daysOver, 'day', 'days')}`;
  }
  if (useMiles) return `Due soon — ${unit(Math.max(0, miles - milesSince), 'mile', 'miles')} left`;
  const daysLeft = Math.max(0, intervalDays - daysSince);
  return `Due soon — ${unit(daysLeft, 'day', 'days')} left`;
}

export function assessService(input: {
  interval: Interval;
  lastDate: string | null;
  lastMileage: number | null;
  currentMileage: number;
  today: string;
}): DueAssessment {
  const miles = input.interval.miles;
  const months = input.interval.months;

  if (input.lastDate == null || input.lastMileage == null) {
    const milesRatio = miles > 0 ? Math.max(0, input.currentMileage) / miles : 0;
    return {
      status: 'overdue',
      urgency: Math.max(1, milesRatio),
      headline: 'Due — never serviced',
    };
  }

  const milesSince = Math.max(0, input.currentMileage - input.lastMileage);
  const milesRatio = miles > 0 ? milesSince / miles : 0;
  const time = timeRatio(input.lastDate, input.today, months);
  const mileageOverdue = miles > 0 && milesSince >= miles;
  const timeOverdue = months > 0 && input.today >= addMonths(input.lastDate, months);
  const urgency = Math.max(milesRatio, time.ratio);
  let status: DueStatus = 'ok';
  if (mileageOverdue || timeOverdue) status = 'overdue';
  else if ((miles > 0 && milesRatio >= DUE_SOON_RATIO) || (months > 0 && time.ratio >= DUE_SOON_RATIO)) status = 'due-soon';

  return {
    status,
    urgency: status === 'overdue' ? Math.max(1, urgency) : urgency,
    headline: headlineFor(status, milesRatio, time.ratio, milesSince, miles, time.daysSince, time.intervalDays),
  };
}

export function garageTasks(data: GarageData, today: string): GarageTask[] {
  const tasks: GarageTask[] = [];
  for (const vehicle of data.vehicles) {
    for (const serviceType of data.serviceTypes) {
      const last = latestService(data.services, vehicle.id, serviceType.id);
      const interval = lookupInterval(serviceType, vehicle);
      const assessment = assessService({
        interval,
        lastDate: last?.date ?? null,
        lastMileage: last?.mileage ?? null,
        currentMileage: vehicle.mileage,
        today,
      });
      if (assessment.status === 'ok') continue;
      tasks.push({
        id: `${vehicle.id}:${serviceType.id}`,
        vehicleId: vehicle.id,
        vehicleName: vehicle.description,
        vehicleDetail: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        serviceTypeId: serviceType.id,
        serviceTypeName: serviceType.name,
        status: assessment.status,
        urgency: assessment.urgency,
        headline: assessment.headline,
      });
    }
  }

  tasks.sort(
    (a, b) =>
      b.urgency - a.urgency ||
      a.vehicleName.localeCompare(b.vehicleName) ||
      a.serviceTypeName.localeCompare(b.serviceTypeName),
  );
  return tasks;
}
