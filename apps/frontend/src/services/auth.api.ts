// ─── API base helper ─────────────────────────────────────────────

interface ApiError {
  code: string;
  message: string;
}

class ApiException extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiException';
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include', // always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error: ApiError = data?.error ?? { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred' };
    throw new ApiException(error.message, error.code, res.status);
  }

  return data?.data as T;
}

// ─── Auth API ─────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
}

export async function apiRegister(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiLogout(): Promise<void> {
  await apiRequest<void>('/api/auth/logout', { method: 'POST' });
}

export async function apiGetMe(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/me');
}

export { ApiException };
