import { apiClient } from "./client";

export interface TelemetryReading {
  device_sn: string;
  device_type?: string;
  device_name?: string;
  readings: Record<string, number>;
  timestamp: string;
}

export interface HistoryRequest {
  start: string;
  stop: string;
  limit?: number;
  order?: "asc" | "desc";
  window?: string;
}

export interface HistoryResponse {
  device_sn: string;
  columns: string[];
  values: (string | number)[][];
  row_count: number;
}

export const telemetryApi = {
  write: (data: {
    device_sn: string;
    readings: Record<string, number>;
    timestamp?: string;
  }) => apiClient.post("/telemetry", data),

  history: (deviceSn: string, data: HistoryRequest) =>
    apiClient.post<{ success: true; data: HistoryResponse }>(
      `/telemetry/history/${deviceSn}`,
      data
    ),
};