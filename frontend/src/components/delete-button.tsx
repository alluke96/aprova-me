'use client';

import { useTransition } from 'react';

interface DeleteButtonProps {
  action: () => Promise<void>;
  confirmation: string;
  label?: string;
}

export function DeleteButton({ action, confirmation, label = 'Excluir' }: DeleteButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn-danger"
      disabled={pending}
      onClick={() => {
        if (window.confirm(confirmation)) startTransition(() => action());
      }}
    >
      {pending ? 'Excluindo…' : label}
    </button>
  );
}
