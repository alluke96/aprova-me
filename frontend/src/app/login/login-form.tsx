'use client';

import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import { Field } from '@/components/field';
import { FormMessage } from '@/components/form-message';
import { initialFormState } from '@/lib/form-state';

export function LoginForm({ from }: { from?: string }) {
  const [state, action, pending] = useActionState(login, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-5" aria-label="Entrar">
      {from && <input type="hidden" name="from" value={from} />}
      <FormMessage message={state.message} />

      <Field id="login" label="Login" errors={state.fieldErrors?.login}>
        {(props) => (
          <input
            {...props}
            name="login"
            autoComplete="username"
            className="field-input"
            defaultValue="aprovame"
            required
          />
        )}
      </Field>

      <Field id="password" label="Senha" errors={state.fieldErrors?.password}>
        {(props) => (
          <input
            {...props}
            name="password"
            type="password"
            autoComplete="current-password"
            className="field-input"
            required
          />
        )}
      </Field>

      <button type="submit" className="btn-primary mt-2" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
