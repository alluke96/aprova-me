import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logout } from '@/app/actions/auth';
import { NavLink } from '@/components/nav-link';
import { SessionTimer } from '@/components/session-timer';
import { decodeToken, SESSION_COOKIE, tokenExpiresAt } from '@/lib/session';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const expiresAt = token ? tokenExpiresAt(token) : null;
  if (!token || !expiresAt) redirect('/login');
  const user = decodeToken(token)?.login;

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      {/* No celular vira uma barra compacta no topo; no desktop, uma coluna fixa. */}
      <aside className="flex flex-col gap-3 bg-ink px-5 py-4 text-paper md:sticky md:top-0 md:h-dvh md:gap-6 md:py-6">
        <div className="flex items-center justify-between gap-4 md:block">
          <div>
            <p className="text-[18px] font-semibold tracking-[-0.01em] md:text-[20px]">aprova-me</p>
            <p className="hidden text-[13px] text-paper/70 md:block">Recebíveis e cedentes</p>
          </div>
          <form action={logout} className="md:hidden">
            <button type="submit" className="text-sm text-paper/80 underline underline-offset-4 hover:text-paper">
              Sair
            </button>
          </form>
        </div>

        <nav aria-label="Principal" className="flex gap-1 md:flex-col">
          <NavLink href="/payables">Recebíveis</NavLink>
          <NavLink href="/assignors">Cedentes</NavLink>
        </nav>

        <div className="flex items-baseline justify-between gap-3 border-t border-paper/15 pt-3 md:mt-auto md:flex-col md:items-start md:gap-2 md:pt-4">
          {user && <p className="text-sm font-medium">{user}</p>}
          <SessionTimer expiresAt={expiresAt} />
          <form action={logout} className="hidden md:block">
            <button type="submit" className="text-sm text-paper/80 underline underline-offset-4 hover:text-paper">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <main className="px-5 py-8 sm:px-10 sm:py-12">
        <div className="mx-auto max-w-[960px]">{children}</div>
      </main>
    </div>
  );
}
