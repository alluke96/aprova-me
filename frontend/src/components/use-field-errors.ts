'use client';

import { useState } from 'react';
import type { FieldErrors } from '@/lib/schemas';

/**
 * Erros por campo, vindos da validação no navegador ou da API. O erro de um
 * campo some assim que a pessoa começa a corrigi-lo e volta a ser checado no
 * próximo envio.
 */
export function useFieldErrors(serverErrors?: FieldErrors) {
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const source = clientErrors ?? serverErrors ?? {};

  return {
    hasClientErrors: clientErrors !== null,
    errorsFor: (field: string) => (edited.has(field) ? undefined : source[field]),
    markEdited: (field: string) =>
      setEdited((current) => (current.has(field) ? current : new Set(current).add(field))),
    submitted: (errors: FieldErrors | null) => {
      setClientErrors(errors);
      setEdited(new Set());
    },
  };
}
