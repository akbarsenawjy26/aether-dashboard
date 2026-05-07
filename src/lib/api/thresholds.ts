import { apiClient } from "./client";

export interface Threshold {
  guid: string;
  device_guid: string;
  parameter_name: string;
  min_value: number | null;
  max_value: number | null;
  severity: "info" | "warning" | "critical";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateThresholdRequest {
  device_guid: string;
  parameter_name: string;
  min_value?: number | null;
  max_value?: number | null;
  severity: string;
  is_active: boolean;
}

export interface UpdateThresholdRequest {
  parameter_name?: string;
  min_value?: number | null;
  max_value?: number | null;
  severity?: string;
  is_active?: boolean;
}

export const thresholdApi = {
  listByDevice: (deviceGuid: string) =>
    apiClient.get<Threshold[]>(`/threshold/device/${deviceGuid}`),
  
  get: (guid: string) =>
    apiClient.get<Threshold>(`/threshold/${guid}`),
  
  create: (data: CreateThresholdRequest) =>
    apiClient.post<Threshold>(`/threshold`, data),
  
  update: (guid: string, data: UpdateThresholdRequest) =>
    apiClient.patch<Threshold>(`/threshold/${guid}`, data),
  
  delete: (guid: string) =>
    apiClient.delete(`/threshold/${guid}`),
};
