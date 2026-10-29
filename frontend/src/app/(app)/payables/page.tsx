import type { Metadata } from 'next';
import Link from 'next/link';
import { deletePayable } from '@/app/actions/payables';
import { DeleteButton } from '@/components/delete-button';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { api, type Paginated, type Payable } from '@/lib/api';
import { formatDate, formatMoney, shortId } from '@/lib/format';

export const metadata: Metadata = { title: 'Recebíveis' };

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; deleted?: string }>;
}) {
  const { page: pageParam, deleted } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const result = await api<Paginated<Payable>>(`/integrations/payable?page=${page}&pageSize=20`);

  return (
    <>
      <PageHeader
        title="Recebíveis"
        description="Os mais recentes aparecem primeiro."
        actions={
          <Link href="/payables/new" className="btn-primary">
            Cadastrar recebível
          </Link>
        }
      />

      <div className="mb-6">
        <Notice>{deleted ? 'Recebível excluído.' : null}</Notice>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-[17px] font-semibold">Nenhum recebível cadastrado</p>
          <p className="mt-1 text-[15px] text-muted">
            Cadastre o primeiro para ele aparecer aqui.
          </p>
          <Link href="/payables/new" className="btn-primary mt-6">
            Cadastrar recebível
          </Link>
        </div>
      ) : (
        <>
          {/* No celular, uma lista que cabe na tela; editar e excluir ficam no detalhe. */}
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface sm:hidden">
            {result.data.map((payable) => (
              <li key={payable.id}>
                <Link
                  href={`/payables/${payable.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 active:bg-cedula-tint/40"
                >
                  <span className="flex flex-col">
                    <span className="text-[17px] font-semibold">{formatMoney(payable.value)}</span>
                    <span className="text-sm text-muted">
                      Emissão {formatDate(payable.emissionDate)}
                    </span>
                  </span>
                  <span className="text-sm text-ink-soft">{shortId(payable.id)}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface sm:block">
            <table className="w-full min-w-[640px] text-left text-[15px]">
              <caption className="sr-only">Lista de recebíveis</caption>
              <thead className="border-b border-line text-[13px] text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Recebível
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    Valor
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Emissão
                  </th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((payable) => (
                  <tr key={payable.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3.5">
                      <Link href={`/payables/${payable.id}`} className="link" title={payable.id}>
                        {shortId(payable.id)}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap">
                      {formatMoney(payable.value)}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {formatDate(payable.emissionDate)}
                    </td>
                    <td className="px-5 py-2">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/payables/${payable.id}/edit`}
                          className="btn-secondary px-3 py-1.5 text-sm"
                        >
                          Editar
                        </Link>
                        <DeleteButton
                          action={deletePayable.bind(null, payable.id)}
                          confirmation={`Excluir o recebível de ${formatMoney(payable.value)}? Essa ação não pode ser desfeita.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/payables"
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            noun={['recebível', 'recebíveis']}
          />
        </>
      )}
    </>
  );
}
