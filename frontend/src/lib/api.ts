import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { FieldErrors } from './schemas';
import { SESSION_COOKIE } from './session';

export interface Assignor {
  id: string;
  document: string;
  email: string;
  phone: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payable {
  id: string;
  value: string;
  emissionDate: string;
  assignor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorBody {
  message?: string | string[];
  errors?: { field: string; messages: string[] }[];
}

/** "payable.value" → "value": o formulário só conhece o nome do campo. */
function toFieldErrors(errors: ApiErrorBody['errors']): FieldErrors {
  return Object.fromEntries(
    (errors ?? []).map(({ field, messages }) => [field.split('.').pop() ?? field, messages]),
  );
}

export function apiUrl(path: string): string {
  return `${process.env.API_URL ?? 'http://localhost:3001'}${path}`;
}

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
  const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
  return new ApiError(
    response.status,
    message ?? 'A API não respondeu como esperado',
    toFieldErrors(body.errors),
  );
}

/**
 * Chama a API pelo servidor do Next com o token do cookie httpOnly. Se a API
 * responder 401 (token expirou), manda a pessoa para o login.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');

  const response = await fetch(apiUrl(path), {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (response.status === 401) redirect('/login?expired=1');
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Login não usa token, por isso fica fora do `api()`. */
export async function requestToken(
  login: string,
  password: string,
): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch(apiUrl('/integrations/auth'), {
    method: 'POST',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!response.ok) throw await parseError(response);
  return response.json();
}
