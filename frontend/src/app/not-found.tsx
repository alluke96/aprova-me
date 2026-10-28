import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="max-w-[420px] text-center">
        <h1 className="text-[28px] font-semibold">Registro não encontrado</h1>
        <p className="mt-2 text-[15px] text-muted">
          Ele pode ter sido excluído ou o endereço está incompleto.
        </p>
        <Link href="/payables" className="btn-primary mt-6">
          Ir para recebíveis
        </Link>
      </div>
    </main>
  );
}
