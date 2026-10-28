import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  errors?: string[];
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/** Rótulo, dica e erros ligados ao campo por id, para leitores de tela. */
export function Field({ id, label, hint, errors, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = errors?.length ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(errorId), 'aria-describedby': describedBy })}
      {hint && !errorId && (
        <p id={hintId} className="text-[13px] text-muted">
          {hint}
        </p>
      )}
      {errorId && (
        <p id={errorId} role="alert" className="text-[13px] font-medium text-alert">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
