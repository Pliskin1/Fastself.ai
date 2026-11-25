import type { Recipe } from '@fastself/core';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import KupovinaSheet from '@/app/(sheets)/kupovina';
import PlanTab from '@/app/(tabs)/plan';
import { renderUI } from '@/components/test-utils';
import { consents } from '@/db/repo';
import { mealPlan, type ApiResult, type MealPlanData } from '@/lib/api';
import { at, fixtureSettings, withProviders } from '@/test/utils';
import { flags } from '../flags';
import { saveMealPlan } from '../storage';

const mockShow = jest.fn();
jest.mock('@/components', () => ({
  ...jest.requireActual('@/components'),
  useToast: () => ({ show: (message: string) => mockShow(message) }),
}));
const mockListeners: (() => void)[] = [];
// One stable object, like the real navigation prop.
const mockNavigation = {
  addListener: (_event: string, cb: () => void) => {
    mockListeners.push(cb);
    return () => undefined;
  },
};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useNavigation: () => mockNavigation,
}));
jest.mock('@/lib/api', () => ({ mealPlan: jest.fn() }));

const api = mealPlan as jest.MockedFunction<typeof mealPlan>;
const NOW = at('2026-12-02T16:30');
const ORTHODOX = fixtureSettings({ orthodox: true });

const OK: Recipe = {
  id: 'ok',
  title: 'Salata od paradajza',
  timeMin: 5,
  meals: ['rucak', 'vecera'],
  cats: ['povrce'],
  ingredients: ['paradajz', 'krastavac'],
  steps: ['Isjeckaj povrće.'],
};
const BEANS: Recipe = { ...OK, id: 'beans', title: 'Grah salata', ingredients: ['grah', 'paradajz'] };
const MEAT: Recipe = {
  id: 'meat',
  title: 'Pileća supa',
  timeMin: 40,
  meals: ['rucak'],
  cats: ['meso'],
  ingredients: ['piletina'],
  steps: ['Skuvaj piletinu.'],
};

const answer = (input: Parameters<typeof mealPlan>[0]): ApiResult<MealPlanData> => ({
  ok: true,
  data: {
    days: input.days.map((day) => ({
      date: day.date,
      items: [
        { meal: 'rucak', recipe: OK },
        { meal: 'vecera', recipe: MEAT },
      ],
    })),
  },
});

const renderPlan = (settings = ORTHODOX) => render(withProviders(<PlanTab />, { settings, now: NOW }));

beforeEach(() => {
  jest.clearAllMocks();
  mockListeners.length = 0;
  flags.mealPlan = false;
});
afterAll(() => {
  flags.mealPlan = __DEV__;
});

describe('Plan screen', () => {
  it('shows 7 rows, the 7-day summary and "Danas" first', async () => {
    await renderPlan();
    expect(screen.getByText('Narednih 7 dana')).toBeTruthy();
    expect(screen.getByText('Danas')).toBeTruthy();
    expect(screen.getByText('2 dana voda')).toBeTruthy();
    expect(screen.getAllByText('Riba dozvoljena')).toHaveLength(3);
    expect(screen.getAllByTestId(/^plan-row-/)).toHaveLength(7);
  });

  it('switching to 30 days shows 30 rows and the 30-day summary', async () => {
    await renderPlan();
    await fireEvent.press(screen.getByTestId('seg-range-30'));
    expect(screen.getByText('Narednih 30 dana')).toBeTruthy();
    expect(screen.getAllByTestId(/^plan-row-/)).toHaveLength(30);
    expect(screen.getAllByText('Danas')).toHaveLength(1);
  });

  it('without practices every day is free and the card says so', async () => {
    await renderPlan(fixtureSettings());
    expect(screen.getByText('7 dana bez posta')).toBeTruthy();
  });

  it('Ramadan 2027 shows the dawn and iftar line', async () => {
    await render(
      withProviders(<PlanTab />, { settings: fixtureSettings({ ramadan: true }), now: at('2027-02-15T10:00') }),
    );
    expect(screen.getAllByText(/^Zora \d\d:\d\d, iftar \d\d:\d\d$/).length).toBeGreaterThan(0);
  });

  it('an IF setting shows the eating window line', async () => {
    await renderPlan(fixtureSettings({ ifOn: true, ifPlan: 16 }));
    expect(screen.getAllByText('Jelo 12:00–20:00').length).toBeGreaterThan(0);
  });
});

describe('Jelovnik card', () => {
  it('flag off: no button', async () => {
    await renderPlan();
    expect(screen.queryByTestId('btn-make-meal-plan')).toBeNull();
    expect(screen.queryByText('Jelovnik za sedmicu')).toBeNull();
  });

  it('flag off: a plan stored earlier shows no meal lines', async () => {
    const ui = withProviders(<PlanTab />, { settings: ORTHODOX, now: NOW });
    saveMealPlan('2026-12-02', [{ date: '2026-12-02', items: [{ meal: 'rucak', recipe: OK }] }]);
    await render(ui);
    expect(screen.getAllByTestId(/^plan-row-/)).toHaveLength(7);
    expect(screen.queryByText(/Salata od paradajza/)).toBeNull();
  });

  it('flag on: a plan stored earlier shows its meal lines and the shopping button', async () => {
    flags.mealPlan = true;
    const ui = withProviders(<PlanTab />, { settings: ORTHODOX, now: NOW });
    saveMealPlan('2026-12-02', [{ date: '2026-12-02', items: [{ meal: 'rucak', recipe: OK }] }]);
    await render(ui);
    expect(screen.getByText('Ručak: Salata od paradajza')).toBeTruthy();
    expect(screen.getByTestId('btn-shopping')).toBeTruthy();
  });

  it('flag on, no consent: opens the consent sheet and does not call the API', async () => {
    flags.mealPlan = true;
    await renderPlan();
    expect(screen.getByText('Napravi jelovnik za 7 dana')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-make-meal-plan'));
    expect(router.push).toHaveBeenCalledWith('/(sheets)/ai-pristanak');
    expect(api).not.toHaveBeenCalled();
  });

  it('back from the sheet with consent on runs the action once', async () => {
    flags.mealPlan = true;
    api.mockImplementation(async (input) => answer(input));
    await renderPlan();
    await fireEvent.press(screen.getByTestId('btn-make-meal-plan'));
    consents.set('ai', true);
    await act(async () => mockListeners.forEach((cb) => cb()));
    expect(api).toHaveBeenCalledTimes(1);
    await act(async () => mockListeners.forEach((cb) => cb()));
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('with consent: sends only days and avoid, shows loading, then meals and the shopping button', async () => {
    flags.mealPlan = true;
    let resolve: (r: ApiResult<MealPlanData>) => void = () => undefined;
    api.mockImplementation(() => new Promise((r) => (resolve = r)));
    await renderPlan();
    consents.set('ai', true);
    await fireEvent.press(screen.getByTestId('btn-make-meal-plan'));
    expect(api).toHaveBeenCalledTimes(1);
    const input = api.mock.calls[0]![0];
    expect(Object.keys(input).sort()).toEqual(['avoid', 'days']);
    expect(input.days).toHaveLength(7);
    expect(screen.getByText('Pravim jelovnik i provjeravam recepte')).toBeTruthy();
    expect(screen.queryByTestId('btn-make-meal-plan')).toBeNull();

    await act(async () => resolve(answer(input)));
    expect(screen.queryByTestId('plan-meal-loading')).toBeNull();
    expect(screen.getByText('Jelovnik je spreman i provjeren. Obroci su upisani uz dane ispod.')).toBeTruthy();
    expect(screen.getAllByText('Ručak: Salata od paradajza')).toHaveLength(7);
    expect(screen.queryByText(/Pileća supa/)).toBeNull();
    expect(screen.getByText('Napravi novi jelovnik')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('btn-shopping'));
    expect(router.push).toHaveBeenCalledWith('/(sheets)/kupovina');
  });

  it('an error shows the toast and the idle button again', async () => {
    flags.mealPlan = true;
    api.mockResolvedValue({ ok: false, error: 'offline' });
    await renderPlan();
    consents.set('ai', true);
    await fireEvent.press(screen.getByTestId('btn-make-meal-plan'));
    expect(mockShow).toHaveBeenCalledWith('Veza nije uspjela. Provjeri internet i pokušaj ponovo.');
    expect(screen.getByTestId('btn-make-meal-plan')).toBeTruthy();
    expect(screen.queryByTestId('btn-shopping')).toBeNull();
  });

  it('the 30-day range notes that plans are made week by week', async () => {
    flags.mealPlan = true;
    await renderPlan();
    await fireEvent.press(screen.getByTestId('seg-range-30'));
    expect(screen.getByText('Jelovnik pravimo sedmicu po sedmicu, da recepti prate post koji dolazi.')).toBeTruthy();
  });
});

describe('Kupovina sheet', () => {
  it('shows only the title and caption without a plan', async () => {
    await render(withProviders(<KupovinaSheet />, { now: NOW }));
    expect(screen.getByText('Spisak za kupovinu')).toBeTruthy();
    expect(screen.getByText('Iz jelovnika za narednih 7 dana. Označi ono što već imaš.')).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('lists items with counts, and a ticked row survives reopening', async () => {
    // withProviders starts a fresh database; the sheet itself is rendered after the plan is stored.
    withProviders(<KupovinaSheet />, { now: NOW });
    saveMealPlan('2026-12-02', [
      {
        date: '2026-12-02',
        items: [
          { meal: 'rucak', recipe: OK },
          { meal: 'vecera', recipe: BEANS },
        ],
      },
    ]);
    await renderUI(<KupovinaSheet />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByText('Paradajz')).toBeTruthy();
    expect(screen.getByText('za 2 obroka')).toBeTruthy();
    expect(screen.getAllByText(/^za /)).toHaveLength(1);

    const row = screen.getByTestId('shop-item-krastavac');
    expect(row.props.accessibilityState.checked).toBe(false);
    await fireEvent.press(row);
    expect(await screen.findByRole('checkbox', { name: 'Krastavac', checked: true })).toBeTruthy();

    screen.unmount();
    await renderUI(<KupovinaSheet />);
    expect(screen.getByRole('checkbox', { name: 'Krastavac', checked: true })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Grah', checked: false })).toBeTruthy();
  });
});
