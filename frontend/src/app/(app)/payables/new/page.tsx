import type { Metadata } from 'next';
import Link from 'next/link';
import { createPayable } from '@/app/actions/payables';
import { PageHeader } from '@/components/page-header';
import { PayableForm } from '@/components/payable-form';
import { assignorOptions } from '@/lib/options';

export const metadata: Metadata = { title: 'Novo recebível' };

export default async function NewPayablePage({
  searchParams,
}: {
  searchParams: Promise<{ assignor?: string }>;
}) {
  const [{ assignor }, assignors] = await Promise.all([searchParams, assignorOptions()]);

  return (
    <>
      <PageHeader
        title="Novo recebível"
        back={
          <Link href="/payables" className="link w-fit text-sm">
            Voltar para recebíveis
          </Link>
        }
      />
      <div className="max-w-[640px] rounded-lg border border-line bg-surface p-6 sm:p-8">
        <PayableForm
          action={createPayable}
          assignors={assignors}
          mode="create"
          defaults={{ assignor }}
        />
      </div>
    </>
  );
}
