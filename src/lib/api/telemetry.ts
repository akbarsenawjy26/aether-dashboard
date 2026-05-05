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
  page?: number;
  offset?: number;
}

// Backend returns { success, data: TelemetryRecord[], pagination: {...} }
export interface TelemetryRecord {
  timestamp: string;
  fields: Record<string, number | string | boolean>;
}

export interface HistoryResponse {
  success: boolean;
  data: TelemetryRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  };
}

export const telemetryApi = {
  write: (data: {
    device_sn: string;
    readings: Record<string, number>;
    timestamp?: string;
  }) => apiClient.post("/telemetry", data),

  // Backend returns { success, data: TelemetryRecord[], pagination: {...} }
  history: (deviceSn: string, data: HistoryRequest) =>
    apiClient.post<HistoryResponse>(
      `/telemetry/history/${deviceSn}`,
      data
    ),
};