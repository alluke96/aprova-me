'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { initialFormState, type FormState } from '@/lib/form-state';
import { assignorSchema, validateForm } from '@/lib/schemas';
import { Field } from './field';
import { FormMessage } from './form-message';
import { useFieldErrors } from './use-field-errors';

interface AssignorFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  returnTo?: 'payable';
}

const FIELDS = [
  {
    name: 'name',
    label: 'Nome ou razão social',
    autoComplete: 'organization',
    maxLength: 140,
    wide: true,
  },
  {
    name: 'document',
    label: 'CPF ou CNPJ',
    hint: 'Com ou sem pontuação. Aceita o CNPJ alfanumérico.',
    maxLength: 30,
  },
  { name: 'phone', label: 'Telefone', type: 'tel', autoComplete: 'tel', maxLength: 20 },
  { name: 'email', label: 'E-mail', type: 'email', autoComplete: 'email', maxLength: 140, wide: true },
] as const;

type FieldName = (typeof FIELDS)[number]['name'];

export function AssignorForm({ action, returnTo }: AssignorFormProps) {
  const [state, dispatch, pending] = useActionState(action, initialFormState);
  const [, startTransition] = useTransition();
  const [id] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<Record<FieldName, string>>({
    name: '',
    document: '',
    phone: '',
    email: '',
  });
  const { errorsFor, markEdited, submitted, hasClientErrors } = useFieldErrors(state.fieldErrors);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = validateForm(assignorSchema, formData);
    if (!result.success) {
      submitted(result.fieldErrors);
      return;
    }
    submitted(null);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-label="Cedente">
      <input type="hidden" name="id" value={id} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <FormMessage message={hasClientErrors ? undefined : state.message} />

      <div className="grid gap-6 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.name} className={'wide' in field && field.wide ? 'sm:col-span-2' : ''}>
            <Field
              id={field.name}
              label={field.label}
              hint={'hint' in field ? field.hint : undefined}
              errors={errorsFor(field.name)}
            >
              {(props) => (
                <input
                  {...props}
                  name={field.name}
                  type={'type' in field ? field.type : 'text'}
                  autoComplete={'autoComplete' in field ? field.autoComplete : 'off'}
                  maxLength={field.maxLength}
                  className="field-input"
                  value={values[field.name]}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, [field.name]: event.target.value }));
                    markEdited(field.name);
                  }}
                  required
                />
              )}
            </Field>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Salvando…' : 'Cadastrar cedente'}
        </button>
        <Link href={returnTo ? '/payables/new' : '/assignors'} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
