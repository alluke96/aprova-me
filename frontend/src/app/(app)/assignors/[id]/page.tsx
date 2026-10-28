import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { api, ApiError, type Assignor } from '@/lib/api';
import { formatDate, formatDocument } from '@/lib/format';

export const metadata: Metadata = { title: 'Cedente' };

export default async function AssignorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const assignor = await api<Assignor>(`/integrations/assignor/${id}`).catch((error: unknown) => {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  });

  const rows = [
    ['CPF ou CNPJ', formatDocument(assignor.document)],
    ['E-mail', assignor.email],
    ['Telefone', assignor.phone],
    ['Cadastrado em', formatDate(assignor.createdAt)],
  ];

  return (
    <>
      <PageHeader
        title={assignor.name}
        back={
          <Link href="/assignors" className="link w-fit text-sm">
            Voltar para cedentes
          </Link>
        }
        actions={
          <Link href={`/payables/new?assignor=${assignor.id}`} className="btn-primary">
            Cadastrar recebível deste cedente
          </Link>
        }
      />

      {saved === 'created' && (
        <div className="mb-6">
          <Notice>Cedente cadastrado.</Notice>
        </div>
      )}

      <dl className="divide-y divide-line rounded-lg border border-line bg-surface">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[200px_1fr]">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="font-medium break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
