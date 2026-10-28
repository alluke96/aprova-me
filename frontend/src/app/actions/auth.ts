'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiError, requestToken } from '@/lib/api';
import type { FormState } from '@/lib/form-state';
import { loginSchema, validateForm } from '@/lib/schemas';
import { safeRedirectPath, SESSION_COOKIE } from '@/lib/session';

/**
 * Troca login e senha pelo JWT e guarda num cookie httpOnly. O token nunca fica
 * acessível ao JavaScript da página, o que protege contra roubo por XSS.
 */
export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = validateForm(loginSchema, formData);
  if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

  try {
    const { access_token, expires_in } = await requestToken(
      parsed.data.login,
      parsed.data.password,
    );
    (await cookies()).set(SESSION_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { message: 'Login ou senha incorretos.' };
    }
    if (error instanceof ApiError && error.status === 429) {
      return { message: 'Muitas tentativas. Espere um minuto e tente de novo.' };
    }
    return { message: 'Não foi possível falar com a API. Tente de novo em instantes.' };
  }

  redirect(safeRedirectPath(formData.get('from')?.toString()));
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect('/login');
}
