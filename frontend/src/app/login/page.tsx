import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; from?: string }>;
}) {
  const { expired, from } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <p className="text-[20px] font-semibold tracking-[-0.01em] text-ink">aprova-me</p>
          <h1 className="mt-6 text-[28px] leading-tight font-semibold tracking-[-0.01em]">
            Entre para cadastrar recebíveis
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Por segurança, cada sessão dura 1 minuto.
          </p>
        </div>

        {expired && (
          <p
            role="status"
            className="mb-6 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink"
          >
            Sua sessão expirou. Entre de novo para continuar de onde parou.
          </p>
        )}

        <LoginForm from={from} />
      </div>
    </main>
  );
}
