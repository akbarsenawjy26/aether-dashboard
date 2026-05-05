import { apiClient } from "./client";
import type { User } from "./auth";

export interface InstallationPoint {
  guid: string;
  name: string;
  device_guid?: string;
  device_sn?: string;
  location_guid?: string;
  location_name?: string;
  installed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InstallationPointListRequest {
  search?: string;
  page?: number;
  limit?: number;
  location_guid?: string;
}

export interface InstallationPointListResponse {
  items: InstallationPoint[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateInstallationPointRequest {
  name: string;
  device_guid?: string;
  location_guid?: string;
  installed_at?: string;
  notes?: string;
}

export const installationPointApi = {
  list: (data?: InstallationPointListRequest) =>
    apiClient.post<{ success: true; data: InstallationPoint[]; pagination: InstallationPointListResponse }>(
      "/installation-point/list",
      data ?? {}
    ).then((r) => ({
      items: r.data.data,
      total: r.data.pagination?.total ?? 0,
      page: r.data.pagination?.page ?? 1,
      limit: r.data.pagination?.limit ?? 10,
      total_pages: r.data.pagination?.total_pages ?? 1,
    })),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: InstallationPoint }>(
      `/installation-point/${guid}`
    ),

  getWithRelations: (guid: string) =>
    apiClient.get<{ success: true; data: InstallationPoint }>(
      `/installation-point/${guid}/relations`
    ),

  create: (data: CreateInstallationPointRequest) =>
    apiClient.post<{ success: true; data: InstallationPoint }>(
      "/installation-point",
      data
    ),

  update: (guid: string, data: Partial<CreateInstallationPointRequest>) =>
    apiClient.patch<{ success: true; data: InstallationPoint }>(
      `/installation-point/${guid}`,
      data
    ),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/installation-point/${guid}`),
};