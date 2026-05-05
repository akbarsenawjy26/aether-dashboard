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
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: User["role"];
}

export const userApi = {
  list: (data?: UserListRequest) =>
    apiClient.post<{ success: true; data: UserListResponse }>("/user/list", data ?? {}),

  get: (guid: string) =>
    apiClient.get<{ success: true; data: User }>(`/user/${guid}`),

  create: (data: CreateUserRequest) =>
    apiClient.post<{ success: true; data: User }>("/user", data),

  update: (guid: string, data: Partial<CreateUserRequest>) =>
    apiClient.patch<{ success: true; data: User }>(`/user/${guid}`, data),

  delete: (guid: string) =>
    apiClient.delete<{ success: true }>(`/user/${guid}`),
};