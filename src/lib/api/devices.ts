import { apiClient } from "./client";

export interface Device {
  guid: string;
  name: string;
  serial_number: string;
  type: "sensor" | "gateway" | "controller" | "other";
  location_guid?: string;
  location_name?: string;
  status: "online" | "offline" | "unknown";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DeviceListRequest {
  search?: string;
  page?: number;
  limit?: number;
}

export interface DeviceListResponse {
  items: Device[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateDeviceRequest {
  name: string;
  serial_number: string;
  type: Device["type"];
  location_guid?: string;
  metadata?: Record<string, unknown>;
}

export const deviceApi = {
  list: (data?: DeviceListRequest) =>
    apiClient.post<{ success: true; data: DeviceListResponse }>("/device/list", data ?? {}),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: Device }>(`/device/${guid}`),

  create: (data: CreateDeviceRequest) =>
    apiClient.post<{ success: true; data: Device }>("/device", data),

  update: (guid: string, data: Partial<CreateDeviceRequest>) =>
    apiClient.patch<{ success: true; data: Device }>(`/device/${guid}`, data),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/device/${guid}`),
};