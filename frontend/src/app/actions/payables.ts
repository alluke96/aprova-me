'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { FormState } from '@/lib/form-state';
import { payableSchema, payableUpdateSchema, validateForm } from '@/lib/schemas';

function toFormState(error: unknown): FormState {
  if (error instanceof ApiError) {
    return { message: error.message, fieldErrors: error.fieldErrors };
  }
  throw error;
}

/**
 * Cadastra o recebível. O id vem do formulário, gerado uma vez quando a tela
 * abre: se a pessoa clicar duas vezes em salvar, a API recebe o mesmo id e não
 * duplica o registro.
 */
export async function createPayable(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = validateForm(payableSchema, formData);
  if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

  try {
    await api('/integrations/payable', {
      method: 'POST',
      body: JSON.stringify({ payable: parsed.data }),
    });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath('/payables');
  redirect(`/payables/${parsed.data.id}?saved=created`);
}

export async function updatePayable(
  id: string,
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = validateForm(payableUpdateSchema, formData);
  if (!parsed.success) return { fieldErrors: parsed.fieldErrors };

  try {
    await api(`/integrations/payable/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(parsed.data),
    });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath('/payables');
  redirect(`/payables/${id}?saved=updated`);
}

export async function deletePayable(id: string): Promise<void> {
  await api(`/integrations/payable/${id}`, { method: 'DELETE' });
  revalidatePath('/payables');
  redirect('/payables?deleted=1');
}
