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
      <aside className="flex flex-col gap-6 bg-ink px-5 py-6 text-paper md:sticky md:top-0 md:h-dvh">
        <div>
          <p className="text-[20px] font-semibold tracking-[-0.01em]">aprova-me</p>
          <p className="text-[13px] text-paper/70">Recebíveis e cedentes</p>
        </div>

        <nav aria-label="Principal" className="flex gap-1 md:flex-col">
          <NavLink href="/payables">Recebíveis</NavLink>
          <NavLink href="/assignors">Cedentes</NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-paper/15 pt-4">
          {user && <p className="text-sm font-medium">{user}</p>}
          <SessionTimer expiresAt={expiresAt} />
          <form action={logout}>
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
