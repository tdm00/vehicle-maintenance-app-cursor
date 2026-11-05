import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../../src/App';
import { todayISO } from '../../src/domain/dates';
import { formatDate, formatNumber } from '../../src/domain/format';
import { STORAGE_KEY } from '../../src/domain/types';

async function addCivic(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Add vehicle' }));
  await user.type(screen.getByLabelText('Description'), 'Daily driver');
  await user.type(screen.getByLabelText('Year'), '2010');
  await user.type(screen.getByLabelText('Make'), 'Honda');
  await user.type(screen.getByLabelText('Model'), 'Civic');
  await user.type(screen.getByLabelText('Mileage'), '8000');
  await user.selectOptions(screen.getByLabelText('Body type'), 'car');
  await user.click(screen.getByRole('button', { name: 'Save vehicle' }));
}

describe('garage screen', () => {
  it('adds a vehicle, logs service and fuel, and clears the suggestion', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await addCivic(user);
    expect(screen.getByRole('heading', { name: 'Daily driver' })).toBeInTheDocument();
    expect(screen.getAllByText('2010 Honda Civic').length).toBeGreaterThan(0);

    const tasks = screen.getByRole('region', { name: 'Garage tasks' });
    expect(within(tasks).getByRole('button', { name: /Oil change/i })).toHaveTextContent('Due — never serviced');

    await user.click(screen.getByRole('button', { name: 'Log service' }));
    await user.click(screen.getByRole('checkbox', { name: 'Oil change' }));
    await user.click(screen.getByRole('button', { name: 'Save service' }));

    expect(within(tasks).queryByRole('button', { name: /Oil change/i })).not.toBeInTheDocument();
    expect(within(tasks).getByRole('button', { name: /Tire rotation/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Service history' })).toHaveTextContent('Oil change');

    await user.click(screen.getByRole('button', { name: 'Log fill-up' }));
    await user.clear(screen.getByLabelText('Odometer'));
    await user.type(screen.getByLabelText('Odometer'), '8000');
    await user.type(screen.getByLabelText('Gallons'), '10');
    await user.type(screen.getByLabelText('Fuel cost'), '32');
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));
    expect(screen.getByLabelText('Average fuel economy')).toHaveTextContent('—');

    await user.click(screen.getByRole('button', { name: 'Log fill-up' }));
    await user.clear(screen.getByLabelText('Odometer'));
    await user.type(screen.getByLabelText('Odometer'), '8300');
    await user.type(screen.getByLabelText('Gallons'), '10');
    await user.type(screen.getByLabelText('Fuel cost'), '33');
    await user.click(screen.getByRole('button', { name: 'Save fill-up' }));

    expect(screen.getByLabelText('Average fuel economy')).toHaveTextContent('30.0 mpg');
    expect(screen.getByRole('table')).toHaveTextContent('30.0 mpg');

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).toContain('Daily driver');
    expect(saved).toContain('"version":1');

    unmount();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Daily driver' })).toBeInTheDocument();
    expect(screen.getByLabelText('Average fuel economy')).toHaveTextContent('30.0 mpg');
    expect(within(screen.getByRole('region', { name: 'Garage tasks' })).queryByRole('button', { name: /Oil change/i })).not.toBeInTheDocument();
  });

  it('edits and removes a vehicle, and lets the user change service types', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addCivic(user);

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    await user.clear(screen.getByLabelText('Description'));
    await user.type(screen.getByLabelText('Description'), 'Weekend car');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('heading', { name: 'Weekend car' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Service types' }));
    await user.click(screen.getByRole('button', { name: 'Remove Wipers' }));
    await user.type(screen.getByLabelText('Type name'), 'Differential');
    await user.type(screen.getByLabelText('Miles'), '20000');
    await user.type(screen.getByLabelText('Months'), '24');
    await user.click(screen.getByRole('button', { name: 'Add service type' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    const tasks = screen.getByRole('region', { name: 'Garage tasks' });
    expect(within(tasks).queryByRole('button', { name: /Wipers/i })).not.toBeInTheDocument();
    expect(within(tasks).getByRole('button', { name: /Differential/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    await user.click(screen.getByRole('button', { name: 'Remove vehicle' }));
    expect(screen.queryByRole('heading', { name: 'Weekend car' })).not.toBeInTheDocument();
    expect(screen.getByText(/garage is empty/i)).toBeInTheDocument();
  });

  it('edits a fill-up and shows the new mpg and running average', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addCivic(user);

    async function logFill(odometer: string, gallons: string, cost: string) {
      await user.click(screen.getByRole('button', { name: 'Log fill-up' }));
      await user.clear(screen.getByLabelText('Odometer'));
      await user.type(screen.getByLabelText('Odometer'), odometer);
      await user.type(screen.getByLabelText('Gallons'), gallons);
      await user.type(screen.getByLabelText('Fuel cost'), cost);
      await user.click(screen.getByRole('button', { name: 'Save fill-up' }));
    }

    await logFill('8000', '12', '30');
    await logFill('8300', '10', '31');
    await logFill('8620', '8', '32');

    function fuelRow(odometer: string) {
      const row = screen.getAllByRole('row').find((candidate) => candidate.textContent?.includes(odometer));
      if (!row) throw new Error(`No fill-up row for ${odometer}`);
      return row;
    }

    expect(screen.getByLabelText('Average fuel economy')).toHaveTextContent('34.4 mpg');
    expect(fuelRow('8,300')).toHaveTextContent('30.0 mpg');
    expect(fuelRow('8,620')).toHaveTextContent('40.0 mpg');
    expect(fuelRow('8,620')).toHaveTextContent('34.4 mpg');

    await user.click(screen.getByRole('button', { name: `Edit fill-up ${formatDate(todayISO())} ${formatNumber(8300)}` }));
    expect(screen.getByRole('heading', { name: 'Edit fill-up' })).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue(todayISO());
    expect(screen.getByLabelText('Odometer')).toHaveValue('8300');
    expect(screen.getByLabelText('Gallons')).toHaveValue('10');
    expect(screen.getByLabelText('Fuel cost')).toHaveValue('31');

    await user.clear(screen.getByLabelText('Gallons'));
    await user.type(screen.getByLabelText('Gallons'), '20');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(screen.queryByRole('heading', { name: 'Edit fill-up' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Average fuel economy')).toHaveTextContent('22.1 mpg');
    const edited = fuelRow('8,300');
    expect(edited).toHaveTextContent('15.0 mpg');
    expect(edited).not.toHaveTextContent('30.0 mpg');
    expect(within(edited).getAllByRole('cell')[2]).toHaveTextContent('20');
    expect(fuelRow('8,620')).toHaveTextContent('40.0 mpg');
    expect(fuelRow('8,620')).toHaveTextContent('22.1 mpg');
  });
});
