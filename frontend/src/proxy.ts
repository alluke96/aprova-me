import { NextResponse, type NextRequest } from 'next/server';
import { isTokenExpired, SESSION_COOKIE } from '@/lib/session';

/**
 * Antes de qualquer página: sem sessão válida, vai para o login; com o token
 * vencido, apaga o cookie e avisa que expirou (nível 4 do front). É uma checagem
 * otimista para navegação; a API continua validando a assinatura do JWT.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = Boolean(token && !isTokenExpired(token));
  const onLogin = pathname === '/login';

  if (!hasSession && !onLogin) {
    const url = new URL('/login', request.url);
    if (token) url.searchParams.set('expired', '1');
    if (pathname !== '/') url.searchParams.set('from', `${pathname}${search}`);

    const response = NextResponse.redirect(url);
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (hasSession && onLogin) {
    return NextResponse.redirect(new URL('/payables', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico|webp)$).*)'],
};
