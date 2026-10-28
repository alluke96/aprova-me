'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function remainingSeconds(expiresAt: number): number {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
}

/**
 * O token da API dura só 1 minuto (regra do enunciado). Mostramos quanto falta
 * e, quando acaba, levamos a pessoa ao login (nível 4 do front) em vez de
 * deixá-la descobrir no próximo clique.
 */
export function SessionTimer({ expiresAt }: { expiresAt: number }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const left = remainingSeconds(expiresAt);
      setSeconds(left);
      if (left === 0) router.replace('/login?expired=1');
    };
    // Primeiro tique fora do corpo do efeito; o servidor não sabe a hora do navegador.
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [expiresAt, router]);

  if (seconds === null) return null;

  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  const ending = seconds <= 15;

  return (
    <p
      className={`text-[13px] ${ending ? 'font-semibold text-alert' : 'text-paper/70'}`}
      aria-live={ending ? 'polite' : 'off'}
    >
      Sessão expira em {minutes}:{rest}
    </p>
  );
}
