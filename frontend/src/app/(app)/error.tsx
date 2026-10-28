'use client';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-lg border border-alert/30 bg-surface px-6 py-10">
      <h1 className="text-[22px] font-semibold">Não foi possível carregar esta tela</h1>
      <p className="mt-2 text-[15px] text-muted">
        A API pode estar fora do ar. Confira se ela está rodando e tente de novo.
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        Tentar de novo
      </button>
    </div>
  );
}
