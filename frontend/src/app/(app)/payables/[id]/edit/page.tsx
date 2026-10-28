import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updatePayable } from '@/app/actions/payables';
import { PageHeader } from '@/components/page-header';
import { PayableForm } from '@/components/payable-form';
import { api, ApiError, type Payable } from '@/lib/api';
import { shortId, toMoneyInput } from '@/lib/format';
import { assignorOptions } from '@/lib/options';

export const metadata: Metadata = { title: 'Editar recebível' };

export default async function EditPayablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [payable, assignors] = await Promise.all([
    api<Payable>(`/integrations/payable/${id}`).catch((error: unknown) => {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
      throw error;
    }),
    assignorOptions(),
  ]);

  return (
    <>
      <PageHeader
        title={`Editar recebível ${shortId(payable.id)}`}
        back={
          <Link href={`/payables/${payable.id}`} className="link w-fit text-sm">
            Voltar para o recebível
          </Link>
        }
      />
      <div className="max-w-[640px] rounded-lg border border-line bg-surface p-6 sm:p-8">
        <PayableForm
          action={updatePayable.bind(null, payable.id)}
          assignors={assignors}
          mode="edit"
          defaults={{
            id: payable.id,
            value: toMoneyInput(payable.value),
            emissionDate: payable.emissionDate,
            assignor: payable.assignor,
          }}
        />
      </div>
    </>
  );
}
