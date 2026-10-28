'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { FormState } from '@/lib/form-state';
import { assignorSchema, validateForm } from '@/lib/schemas';

export async function createAssignor(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = validateForm(assignorSchema, formData);
  if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

  try {
    await api('/integrations/assignor', { method: 'POST', body: JSON.stringify(parsed.data) });
  } catch (error) {
    if (error instanceof ApiError) {
      const message =
        error.status === 409 ? 'Já existe um cedente com este CPF ou CNPJ.' : error.message;
      return { message, fieldErrors: error.fieldErrors };
    }
    throw error;
  }

  revalidatePath('/assignors');
  // Quem veio do cadastro de recebível volta para lá com o cedente já escolhido.
  const returnTo = formData.get('returnTo')?.toString();
  redirect(
    returnTo === 'payable'
      ? `/payables/new?assignor=${parsed.data.id}`
      : `/assignors/${parsed.data.id}?saved=created`,
  );
}
