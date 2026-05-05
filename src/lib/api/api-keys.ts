import { apiClient } from "./client";

export interface APIKey {
  guid: string;
  name: string;
  key_masked: string;
  key_full?: string; // only shown once at creation
  device_guid?: string;
  device_sn?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface APIKeyListRequest {
  search?: string;
  page?: number;
  limit?: number;
}

export interface APIKeyListResponse {
  items: APIKey[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateAPIKeyRequest {
  name: string;
  device_guid?: string;
  expires_at?: string;
}

export const apiKeyApi = {
  list: (data?: APIKeyListRequest) =>
    apiClient.post<{ success: true; data: APIKey[]; pagination: APIKeyListResponse }>(
      "/apikey/list",
      data ?? {}
    ).then((r) => ({
      items: r.data.data,
      total: r.data.pagination?.total ?? 0,
      page: r.data.pagination?.page ?? 1,
      limit: r.data.pagination?.limit ?? 10,
      total_pages: r.data.pagination?.total_pages ?? 1,
    })),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: APIKey }>(`/apikey/${guid}`),

  create: (data: CreateAPIKeyRequest) =>
    apiClient.post<{ success: true; data: APIKey }>("/apikey", data),

  update: (guid: string, data: Partial<CreateAPIKeyRequest>) =>
    apiClient.patch<{ success: true; data: APIKey }>(`/apikey/${guid}`, data),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/apikey/${guid}`),
};