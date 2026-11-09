// Shared API Client for VitrineFlex
const BASE_URL = 'http://localhost:8000';

export interface ApiResponse<T = any> {
  data: T;
  status: number;
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem('vitrineflex_jwt') || localStorage.getItem('token');
};

export const setStoredToken = (token: string): void => {
  localStorage.setItem('vitrineflex_jwt', token);
  localStorage.setItem('token', token);
};

export const clearStoredToken = (): void => {
  localStorage.removeItem('vitrineflex_jwt');
  localStorage.removeItem('token');
};

const handleAuthError = (status: number, errorBody: any) => {
  if (status === 401) {
    const code = errorBody?.error?.code || errorBody?.code;
    if (code === 'TOKEN_EXPIRED' || code === 'INVALID_TOKEN' || code === 'UNAUTHORIZED') {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: errorBody?.error || errorBody }));
    }
  }
};

export const api = {
  async get<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, { ...options, method: 'GET', headers });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      handleAuthError(res.status, errorBody);
      const msg = errorBody?.error?.message || errorBody?.detail || errorBody?.message || `HTTP error ${res.status}`;
      const err: any = new Error(msg);
      err.response = { data: errorBody, status: res.status };
      throw err;
    }
    const data = await res.json();
    return { data, status: res.status };
  },

  async post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, {
      ...options,
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      handleAuthError(res.status, errorBody);
      const msg = errorBody?.error?.message || errorBody?.detail || errorBody?.message || `HTTP error ${res.status}`;
      const err: any = new Error(msg);
      err.response = { data: errorBody, status: res.status };
      throw err;
    }
    const data = await res.json();
    return { data, status: res.status };
  },

  async patch<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, {
      ...options,
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      handleAuthError(res.status, errorBody);
      const msg = errorBody?.error?.message || errorBody?.detail || errorBody?.message || `HTTP error ${res.status}`;
      const err: any = new Error(msg);
      err.response = { data: errorBody, status: res.status };
      throw err;
    }
    const data = await res.json();
    return { data, status: res.status };
  },

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options?.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, { ...options, method: 'DELETE', headers });
    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      handleAuthError(res.status, errorBody);
      const msg = errorBody?.error?.message || errorBody?.detail || errorBody?.message || `HTTP error ${res.status}`;
      const err: any = new Error(msg);
      err.response = { data: errorBody, status: res.status };
      throw err;
    }
    const data = await res.json().catch(() => ({}));
    return { data, status: res.status };
  },
};
