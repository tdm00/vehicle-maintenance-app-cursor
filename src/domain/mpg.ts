import type { FuelUp } from './types';

export interface FillEconomy {
  id: string;
  mpg: number | null;
  runningAverage: number | null;
}

export interface FuelEconomy {
  perFill: FillEconomy[];
  average: number | null;
}

function byFillUp(a: FuelUp, b: FuelUp): number {
  return a.date.localeCompare(b.date) || a.odometer - b.odometer || a.id.localeCompare(b.id);
}

/**
 * Fill-ups are ordered by date. Per-fill MPG is miles since the previous
 * fill-up divided by gallons. Overall MPG is miles from the first odometer
 * to the last, divided by gallons pumped after the first fill-up. The first
 * fill-up has no prior odometer, so it is kept and left out of the average.
 */
export function fuelEconomy(fillUps: readonly FuelUp[]): FuelEconomy {
  const sorted = [...fillUps].sort(byFillUp);
  if (sorted.length === 0) return { perFill: [], average: null };

  const first = sorted[0];
  let gallonsAfterFirst = 0;
  const perFill = sorted.map((fill, index) => {
    if (index === 0) return { id: fill.id, mpg: null, runningAverage: null };
    const previous = sorted[index - 1];
    const miles = fill.odometer - previous.odometer;
    const mpg = fill.gallons > 0 && miles >= 0 ? miles / fill.gallons : null;
    if (fill.gallons > 0) gallonsAfterFirst += fill.gallons;
    const span = fill.odometer - first.odometer;
    const runningAverage = gallonsAfterFirst > 0 && span >= 0 ? span / gallonsAfterFirst : null;
    return { id: fill.id, mpg, runningAverage };
  });

  const last = sorted[sorted.length - 1];
  const span = last.odometer - first.odometer;
  const average = sorted.length >= 2 && gallonsAfterFirst > 0 && span >= 0 ? span / gallonsAfterFirst : null;
  return { perFill, average };
}

export function economyById(economy: FuelEconomy): Map<string, FillEconomy> {
  return new Map(economy.perFill.map((fill) => [fill.id, fill]));
}
