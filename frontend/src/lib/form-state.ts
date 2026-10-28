import type { FieldErrors } from './schemas';

/** Resposta das Server Actions de formulário. */
export interface FormState {
  message?: string;
  fieldErrors?: FieldErrors;
}

export const initialFormState: FormState = {};
