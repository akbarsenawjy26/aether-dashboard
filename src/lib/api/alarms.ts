import { apiClient } from "./client";

export interface Alarm {
  guid: string;
  device_guid: string;
  device_sn: string;
  device_alias?: string;
  location_name?: string;
  threshold_guid?: string;
  parameter_name: string;
  triggered_value: number;
  status: "active" | "acknowledged" | "resolved";
  severity: "info" | "warning" | "critical";
  triggered_at: string;
  resolved_at?: string;
  acknowledged_at?: string;
  acknowledged_by?: string;
}

export interface ListAlarmParams {
  device_guid?: string;
  location_guid?: string;
  status?: string;
  limit?: number;
  page?: number;
}

export interface AlarmStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
}

export const alarmApi = {
  listActive: (deviceGuid: string) =>
    apiClient.get<Alarm[]>(`/alarm/active/${deviceGuid}`),
  
  listHistory: (params: ListAlarmParams) =>
    apiClient.get<Alarm[]>(`/alarm/history`, { params }),
  
  getStats: (deviceGuid?: string) =>
    apiClient.get<AlarmStats>(`/alarm/stats`, { params: { device_guid: deviceGuid } }),
  
  acknowledge: (guid: string) =>
    apiClient.post<Alarm>(`/alarm/${guid}/acknowledge`),
  
  resolve: (guid: string) =>
    apiClient.post<Alarm>(`/alarm/${guid}/resolve`),
};
