import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { deletePayable } from '@/app/actions/payables';
import { DeleteButton } from '@/components/delete-button';
import { Notice } from '@/components/notice';
import { PageHeader } from '@/components/page-header';
import { api, ApiError, type Assignor, type Payable } from '@/lib/api';
import { formatDate, formatDocument, formatMoney, shortId } from '@/lib/format';

export const metadata: Metadata = { title: 'Recebível' };

const SAVED_MESSAGES: Record<string, string> = {
  created: 'Recebível cadastrado.',
  updated: 'Alterações salvas.',
};

async function load(id: string): Promise<{ payable: Payable; assignor: Assignor }> {
  try {
    const payable = await api<Payable>(`/integrations/payable/${id}`);
    const assignor = await api<Assignor>(`/integrations/assignor/${payable.assignor}`);
    return { payable, assignor };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
    throw error;
  }
}

export default async function PayablePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const { payable, assignor } = await load(id);

  return (
    <>
      <PageHeader
        title={`Recebível ${shortId(payable.id)}`}
        back={
          <Link href="/payables" className="link w-fit text-sm">
            Voltar para recebíveis
          </Link>
        }
        actions={
          <>
            <Link href={`/payables/${payable.id}/edit`} className="btn-secondary">
              Editar
            </Link>
            <DeleteButton
              action={deletePayable.bind(null, payable.id)}
              confirmation={`Excluir o recebível de ${formatMoney(payable.value)}? Essa ação não pode ser desfeita.`}
            />
          </>
        }
      />

      {saved && SAVED_MESSAGES[saved] && (
        <div className="mb-6">
          <Notice>{SAVED_MESSAGES[saved]}</Notice>
        </div>
      )}

      {/* A ficha imita uma duplicata: canhoto à esquerda, separado por um picote. */}
      <article
        aria-label="Ficha do recebível"
        className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-[200px_1fr]"
      >
        <div className="relative flex flex-col justify-between gap-6 border-b border-dashed border-line bg-cedula-tint/50 p-6 sm:border-r-2 sm:border-b-0">
          <span
            aria-hidden
            className="absolute -right-3 -top-3 hidden size-6 rounded-full border border-line bg-paper sm:block"
          />
          <span
            aria-hidden
            className="absolute -right-3 -bottom-3 hidden size-6 rounded-full border border-line bg-paper sm:block"
          />
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="text-muted">Número</dt>
              <dd className="font-semibold">{shortId(payable.id)}</dd>
            </div>
            <div>
              <dt className="text-muted">Emissão</dt>
              <dd className="font-semibold">{formatDate(payable.emissionDate)}</dd>
            </div>
          </dl>
          <p className="text-[13px] text-muted">Cadastrado em {formatDate(payable.createdAt)}</p>
        </div>

        <div className="flex flex-col gap-8 p-6 sm:p-8">
          <div>
            <p className="text-sm text-muted">Valor do recebível</p>
            <p className="mt-1 text-[44px] leading-none font-semibold tracking-[-0.02em] text-ink sm:text-[56px]">
              {formatMoney(payable.value)}
            </p>
          </div>

          <dl className="grid gap-5 border-t border-line pt-6 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Cedente</dt>
              <dd className="mt-0.5">
                <Link href={`/assignors/${assignor.id}`} className="link">
                  {assignor.name}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">CPF ou CNPJ do cedente</dt>
              <dd className="mt-0.5 font-medium">{formatDocument(assignor.document)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted">Identificador completo</dt>
              <dd className="mt-0.5 font-medium break-all text-ink-soft">{payable.id}</dd>
            </div>
          </dl>
        </div>
      </article>
    </>
  );
}
