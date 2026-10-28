import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { api, type Assignor, type Paginated } from '@/lib/api';
import { formatDocument } from '@/lib/format';

export const metadata: Metadata = { title: 'Cedentes' };

export default async function AssignorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const result = await api<Paginated<Assignor>>(`/integrations/assignor?page=${page}&pageSize=20`);

  return (
    <>
      <PageHeader
        title="Cedentes"
        description="Empresas e pessoas que cedem recebíveis."
        actions={
          <Link href="/assignors/new" className="btn-primary">
            Cadastrar cedente
          </Link>
        }
      />

      {result.data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="text-[17px] font-semibold">Nenhum cedente cadastrado</p>
          <p className="mt-1 text-[15px] text-muted">
            Todo recebível pertence a um cedente. Comece por ele.
          </p>
          <Link href="/assignors/new" className="btn-primary mt-6">
            Cadastrar cedente
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {result.data.map((assignor) => (
              <li key={assignor.id}>
                <Link
                  href={`/assignors/${assignor.id}`}
                  className="flex flex-col gap-0.5 px-5 py-4 transition-colors hover:bg-cedula-tint/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-semibold">{assignor.name}</span>
                  <span className="text-sm text-muted">{formatDocument(assignor.document)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination
            basePath="/assignors"
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            noun={['cedente', 'cedentes']}
          />
        </>
      )}
    </>
  );
}
