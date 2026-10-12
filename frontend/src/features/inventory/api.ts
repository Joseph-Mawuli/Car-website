import { apiRequest } from '@/lib/api';
import type { CurrencyCode, Paginated, VehicleDetailResponse, VehicleFacets, VehicleSummary } from '@/types';

export type VehicleSort = 'newest' | 'price_asc' | 'price_desc';
export type AvailabilityFilter = 'in_stock' | 'available' | 'reserved' | 'sold' | 'all';

export interface VehicleQuery {
  q?: string;
  make?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  condition?: string;
  availability?: AvailabilityFilter;
  minPrice?: number;
  maxPrice?: number;
  /** Currency min/max are in; omitted means the dealership's default currency. */
  priceCurrency?: CurrencyCode;
  minYear?: number;
  maxYear?: number;
  sort?: VehicleSort;
  page?: number;
  limit?: number;
}

export function listVehicles(query: VehicleQuery, signal?: AbortSignal) {
  return apiRequest<Paginated<VehicleSummary>>('/vehicles', { query: { ...query }, signal });
}

export function getVehicleFacets(signal?: AbortSignal) {
  return apiRequest<VehicleFacets>('/vehicles/facets', { signal });
}

export function getVehicle(slug: string, signal?: AbortSignal) {
  return apiRequest<VehicleDetailResponse>(`/vehicles/${encodeURIComponent(slug)}`, { signal });
}
