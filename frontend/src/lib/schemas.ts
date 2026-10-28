import { z } from 'zod';
import { parseMoneyInput } from './format';

/**
 * Regras do enunciado validadas no navegador antes de enviar (nível 1 do front)
 * e de novo no servidor antes de chamar a API. A API valida uma terceira vez.
 */
const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, { message: `Informe ${label}`, abort: true })
    .max(max, `Use no máximo ${max} caracteres`);

export const moneySchema = z
  .string()
  .trim()
  .min(1, { message: 'Informe o valor', abort: true })
  .transform((input, context) => {
    const value = parseMoneyInput(input);
    if (!value || Number(value) <= 0) {
      context.addIssue({ code: 'custom', message: 'Use um valor maior que zero, ex.: 1.500,50' });
      return z.NEVER;
    }
    return value;
  });

export const dateSchema = z
  .string()
  .min(1, { message: 'Informe a data de emissão', abort: true })
  .refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    // "2026-02-30" vira 2 de março no Date; comparar de volta pega isso.
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, 'Use uma data válida');

const uuidSchema = (message: string) => z.string().uuid(message);

export const payableSchema = z.object({
  id: uuidSchema('Identificador inválido, recarregue a página'),
  value: moneySchema,
  emissionDate: dateSchema,
  assignor: uuidSchema('Escolha um cedente'),
});

export const payableUpdateSchema = payableSchema.omit({ id: true });

const DOCUMENT_PATTERN = /^([0-9]{11}|[0-9A-Z]{12}[0-9]{2})$/;

export const assignorSchema = z.object({
  id: uuidSchema('Identificador inválido, recarregue a página'),
  document: requiredText('o CPF ou CNPJ', 30).refine(
    (value) => DOCUMENT_PATTERN.test(value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase()),
    'Use um CPF (11 dígitos) ou CNPJ (14 caracteres)',
  ),
  email: requiredText('o e-mail', 140).pipe(z.string().email('Use um e-mail válido')),
  phone: requiredText('o telefone', 20).regex(
    /^[0-9+()\-\s]+$/,
    'Use só números e os símbolos + ( ) -',
  ),
  name: requiredText('o nome ou razão social', 140),
});

export const loginSchema = z.object({
  login: requiredText('o login', 60),
  password: z.string().min(1, 'Informe a senha').max(72, 'Use no máximo 72 caracteres'),
});

export type FieldErrors = Record<string, string[] | undefined>;

/** Converte o FormData e valida, devolvendo os erros por campo. */
export function validateForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { success: true; data: z.output<T> } | { success: false; fieldErrors: FieldErrors } {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) return { success: true, data: result.data };
  return { success: false, fieldErrors: z.flattenError(result.error).fieldErrors as FieldErrors };
}
