import { apiClient } from "./client";

export interface Location {
  guid: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  device_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LocationListRequest {
  search?: string;
  page?: number;
  limit?: number;
}

export interface LocationListResponse {
  items: Location[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateLocationRequest {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export const locationApi = {
  list: (data?: LocationListRequest) =>
    apiClient.post<{ success: true; data: Location[]; pagination: LocationListResponse }>("/location/list", data ?? {}).then((r) => ({
      items: r.data.data,
      total: r.data.pagination?.total ?? 0,
      page: r.data.pagination?.page ?? 1,
      limit: r.data.pagination?.limit ?? 10,
      total_pages: r.data.pagination?.total_pages ?? 1,
    })),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: Location }>(`/location/${guid}`),

  create: (data: CreateLocationRequest) =>
    apiClient.post<{ success: true; data: Location }>("/location", data),

  update: (guid: string, data: Partial<CreateLocationRequest>) =>
    apiClient.patch<{ success: true; data: Location }>(`/location/${guid}`, data),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/location/${guid}`),
};