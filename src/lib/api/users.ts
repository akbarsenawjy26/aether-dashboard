import { apiClient } from "./client";

export interface User {
  guid: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  created_at: string;
  updated_at: string;
}

export interface UserListRequest {
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: User["role"];
}

export const userApi = {
  list: (data?: UserListRequest) =>
    apiClient.post<{ success: true; data: User[]; pagination: UserListResponse }>("/user/list", data ?? {}).then((r) => ({
      items: r.data.data,
      total: r.data.pagination?.total ?? 0,
      page: r.data.pagination?.page ?? 1,
      limit: r.data.pagination?.limit ?? 10,
      total_pages: r.data.pagination?.total_pages ?? 1,
    })),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: User }>(`/user/${guid}`),

  create: (data: CreateUserRequest) =>
    apiClient.post<{ success: true; data: User }>("/user", data),

  update: (guid: string, data: Partial<CreateUserRequest>) =>
    apiClient.patch<{ success: true; data: User }>(`/user/${guid}`, data),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/user/${guid}`),
};