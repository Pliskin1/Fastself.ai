export const color = {
  base: '#03040D',
  paper: '#F6F2EA',
  mist: '#D4D6E6',
  mistStrong: '#DADCEB',
  sun: '#FFC86E',
  sunLink: '#FFD38A',
  sunCtaTop: '#FFE0A0',
  sunCtaBottom: '#FFB547',
  sunInk: '#1F1404',
  teal: '#62D6C4',
  tealInk: '#A6EEE2',
  ember: '#FF8F73',
  emberInk: '#FFC7B8',
  ink: '#0B0D24',
  solidCard: '#151829',
  androidGlass: 'rgba(22,26,58,0.82)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassFill: 'rgba(255,255,255,0.06)',
} as const;

export type LevelKey = 'voda' | 'ulje' | 'riba' | 'bezmesa' | 'mrsno';

export const level: Record<LevelKey, { hex: string; rgb: string; ink: string; title: string; short: string }> = {
  voda: { hex: '#9EC5FF', rgb: '158,197,255', ink: '#CFE2FF', title: 'Post na vodi', short: 'voda' },
  ulje: { hex: '#D9D77E', rgb: '217,215,126', ink: '#ECEBB4', title: 'Post na ulju', short: 'ulje' },
  riba: { hex: '#62D6C4', rgb: '98,214,196', ink: '#A6EEE2', title: 'Riba dozvoljena', short: 'riba' },
  bezmesa: { hex: '#F3CB8C', rgb: '243,203,140', ink: '#F9E0B8', title: 'Bez mesa', short: 'bez mesa' },
  mrsno: { hex: 'rgba(246,242,234,0.5)', rgb: '246,242,234', ink: '#C4C6DA', title: 'Mrsno', short: 'mrsno' },
};

export const space = { 4: 4, 6: 6, 8: 8, 10: 10, 12: 12, 14: 14, 16: 16, 18: 18, 20: 20, 22: 22 } as const;
export const layout = { screenPadding: 20, sectionGap: 18, minHit: 44 } as const;

export const radius = {
  chip: 16,
  input: 22,
  card: 26,
  button: 28,
  tabBar: 33,
  sheet: 36,
  screen: 48,
} as const;
