import type { CityId } from '../types';

export interface City {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: Readonly<Record<CityId, City>> = {
  podgorica: { name: 'Podgorica', lat: 42.4304, lng: 19.2594 },
  niksic: { name: 'Nikšić', lat: 42.7731, lng: 18.9445 },
  bar: { name: 'Bar', lat: 42.0931, lng: 19.1003 },
  ulcinj: { name: 'Ulcinj', lat: 41.9294, lng: 19.2244 },
  'bijelo-polje': { name: 'Bijelo Polje', lat: 43.0383, lng: 19.7476 },
  rozaje: { name: 'Rožaje', lat: 42.8333, lng: 20.1667 },
  pljevlja: { name: 'Pljevlja', lat: 43.3567, lng: 19.3584 },
  berane: { name: 'Berane', lat: 42.8425, lng: 19.8733 },
  plav: { name: 'Plav', lat: 42.5969, lng: 19.945 },
  'herceg-novi': { name: 'Herceg Novi', lat: 42.4531, lng: 18.5375 },
  cetinje: { name: 'Cetinje', lat: 42.3931, lng: 18.9116 },
};

const RAD = Math.PI / 180;

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * RAD;
  const dLng = (lng2 - lng1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** The supported city closest to a coordinate. */
export function closestCity(lat: number, lng: number): CityId {
  let best: CityId = 'podgorica';
  let bestD = Infinity;
  for (const id of Object.keys(CITIES) as CityId[]) {
    const c = CITIES[id];
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}
