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
}

export interface CreateLocationRequest {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export const locationApi = {
  list: (data?: LocationListRequest) =>
    apiClient.post<{ success: true; data: LocationListResponse }>("/location/list", data ?? {}),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: Location }>(`/location/${guid}`),

  create: (data: CreateLocationRequest) =>
    apiClient.post<{ success: true; data: Location }>("/location", data),

  update: (guid: string, data: Partial<CreateLocationRequest>) =>
    apiClient.patch<{ success: true; data: Location }>(`/location/${guid}`, data),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/location/${guid}`),
};