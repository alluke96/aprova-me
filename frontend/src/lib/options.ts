import 'server-only';
import type { ComboboxOption } from '@/components/combobox';
import { api, type Assignor, type Paginated } from './api';
import { formatDocument } from './format';

/**
 * Cedentes para o combobox. Carrega os 100 primeiros em ordem alfabética e o
 * filtro acontece no navegador; com milhares de cedentes, o próximo passo seria
 * buscar na API conforme a pessoa digita (a rota já aceita `?search=`).
 */
export async function assignorOptions(): Promise<ComboboxOption[]> {
  const { data } = await api<Paginated<Assignor>>('/integrations/assignor?pageSize=100');
  return data.map((assignor) => ({
    value: assignor.id,
    label: assignor.name,
    description: formatDocument(assignor.document),
  }));
}
