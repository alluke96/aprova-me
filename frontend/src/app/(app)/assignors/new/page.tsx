import type { Metadata } from 'next';
import Link from 'next/link';
import { createAssignor } from '@/app/actions/assignors';
import { AssignorForm } from '@/components/assignor-form';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Novo cedente' };

export default async function NewAssignorPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const fromPayable = returnTo === 'payable';

  return (
    <>
      <PageHeader
        title="Novo cedente"
        description={
          fromPayable ? 'Depois de salvar, você volta para o recebível com ele já escolhido.' : undefined
        }
        back={
          <Link href={fromPayable ? '/payables/new' : '/assignors'} className="link w-fit text-sm">
            {fromPayable ? 'Voltar para o recebível' : 'Voltar para cedentes'}
          </Link>
        }
      />
      <div className="max-w-[640px] rounded-lg border border-line bg-surface p-6 sm:p-8">
        <AssignorForm action={createAssignor} returnTo={fromPayable ? 'payable' : undefined} />
      </div>
    </>
  );
}
