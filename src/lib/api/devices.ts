import { apiClient } from "./client";

export interface Device {
  guid: string;
  serial_number: string;
  type: string;
  alias?: string;
  notes?: string;
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

// New API response format: { success, data: [...items], pagination: {...} }
export interface DeviceListResponse {
  items: Device[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateDeviceRequest {
  serial_number: string;
  type: string;
  alias?: string;
  notes?: string;
}

export const deviceApi = {
  list: (data?: DeviceListRequest) =>
    apiClient.post<{ success: true; data: Device[]; pagination: DeviceListResponse }>("/device/list", data ?? {}).then((r) => ({
      items: r.data.data,
      total: r.data.pagination?.total ?? 0,
      page: r.data.pagination?.page ?? 1,
      limit: r.data.pagination?.limit ?? 10,
      total_pages: r.data.pagination?.total_pages ?? 1,
    })),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: Device }>(`/device/${guid}`),

  create: (data: CreateDeviceRequest) =>
    apiClient.post<{ success: true; data: Device }>("/device", data),

  update: (guid: string, data: Partial<CreateDeviceRequest>) =>
    apiClient.patch<{ success: true; data: Device }>(`/device/${guid}`, data),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/device/${guid}`),
};