'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { initialFormState, type FormState } from '@/lib/form-state';
import { payableSchema, payableUpdateSchema, validateForm } from '@/lib/schemas';
import { Combobox, type ComboboxOption } from './combobox';
import { Field } from './field';
import { FormMessage } from './form-message';
import { useFieldErrors } from './use-field-errors';

interface PayableFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  assignors: ComboboxOption[];
  mode: 'create' | 'edit';
  defaults?: { id?: string; value?: string; emissionDate?: string; assignor?: string };
}

export function PayableForm({ action, assignors, mode, defaults = {} }: PayableFormProps) {
  const [state, dispatch, pending] = useActionState(action, initialFormState);
  const [, startTransition] = useTransition();
  // Gerado uma vez por tela: dois cliques em salvar mandam o mesmo id e a API não duplica.
  const [id] = useState(() => defaults.id ?? crypto.randomUUID());
  const [value, setValue] = useState(defaults.value ?? '');
  const [emissionDate, setEmissionDate] = useState(defaults.emissionDate ?? '');
  const [assignor, setAssignor] = useState(defaults.assignor ?? '');
  const { errorsFor, markEdited, submitted, hasClientErrors } = useFieldErrors(state.fieldErrors);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = validateForm(mode === 'create' ? payableSchema : payableUpdateSchema, formData);

    // Barra campos vazios ou fora das regras antes de enviar (nível 1 do front).
    if (!result.success) {
      submitted(result.fieldErrors);
      return;
    }
    submitted(null);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-label="Recebível">
      {mode === 'create' && <input type="hidden" name="id" value={id} />}
      <FormMessage message={hasClientErrors ? undefined : state.message} />

      <Field
        id="assignor"
        label="Cedente"
        hint="Busque pelo nome ou pelo CPF/CNPJ."
        errors={errorsFor('assignor')}
      >
        {(props) => (
          <Combobox
            {...props}
            name="assignor"
            options={assignors}
            value={assignor}
            onChange={(next) => {
              setAssignor(next);
              markEdited('assignor');
            }}
            placeholder="Digite para buscar"
            emptyMessage="Nenhum cedente encontrado"
          />
        )}
      </Field>
      {mode === 'create' && (
        <p className="-mt-4 text-[13px] text-muted">
          O cedente ainda não existe?{' '}
          <Link href="/assignors/new?returnTo=payable" className="link">
            Cadastre o cedente
          </Link>{' '}
          e volte para cá.
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="value" label="Valor (R$)" hint="Ex.: 1.500,50" errors={errorsFor('value')}>
          {(props) => (
            <input
              {...props}
              name="value"
              inputMode="decimal"
              autoComplete="off"
              className="field-input text-right font-semibold"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                markEdited('value');
              }}
              required
            />
          )}
        </Field>

        <Field id="emissionDate" label="Data de emissão" errors={errorsFor('emissionDate')}>
          {(props) => (
            <input
              {...props}
              type="date"
              name="emissionDate"
              className="field-input"
              value={emissionDate}
              onChange={(event) => {
                setEmissionDate(event.target.value);
                markEdited('emissionDate');
              }}
              required
            />
          )}
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Salvando…' : mode === 'create' ? 'Cadastrar recebível' : 'Salvar alterações'}
        </button>
        <Link href={mode === 'create' ? '/payables' : `/payables/${id}`} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
