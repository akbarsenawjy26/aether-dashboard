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

// Backend returns { device_sn: string, data: TelemetryRecord[] }
export interface TelemetryRecord {
  timestamp: string;
  fields: Record<string, number | string | boolean>;
}

export const telemetryApi = {
  write: (data: {
    device_sn: string;
    readings: Record<string, number>;
    timestamp?: string;
  }) => apiClient.post("/telemetry", data),

  // Backend returns { device_sn, data: TelemetryRecord[] } directly (no success wrapper)
  history: (deviceSn: string, data: HistoryRequest) =>
    apiClient.post<{ device_sn: string; data: TelemetryRecord[] }>(
      `/telemetry/history/${deviceSn}`,
      data
    ),
};