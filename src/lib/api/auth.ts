import { apiClient } from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  guid: string;
  name: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  created_at: string;
  updated_at: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<{ success: true; data: AuthResponse }>("/auth/login", data),

  register: (data: RegisterRequest) =>
    apiClient.post<{ success: true; data: AuthResponse }>("/auth/register", data),

  logout: () => apiClient.post("/auth/logout"),

  refreshToken: (refreshToken: string) =>
    apiClient.post<{ success: true; data: AuthResponse }>(
      "/auth/token/refresh",
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    ),

  getMe: () => apiClient.get<{ success: true; data: User }>("/user/me"),
};