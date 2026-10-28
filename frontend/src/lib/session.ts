/** Cookie httpOnly com o JWT da API. O JavaScript do navegador não consegue lê-lo. */
export const SESSION_COOKIE = 'aprovame_session';

interface JwtPayload {
  sub?: string;
  login?: string;
  exp?: number;
}

/**
 * Lê o payload do JWT sem validar a assinatura. Serve só para decisões de
 * navegação (redirecionar antes de expirar); quem valida de verdade é a API.
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

/** Momento em que o token expira, em milissegundos. */
export function tokenExpiresAt(token: string): number | null {
  const exp = decodeToken(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

export function isTokenExpired(token: string, now = Date.now()): boolean {
  const expiresAt = tokenExpiresAt(token);
  return expiresAt === null || expiresAt <= now;
}

/** Aceita só caminhos internos, para o `?from=` não virar redirecionamento aberto. */
export function safeRedirectPath(path: string | null | undefined, fallback = '/payables'): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
    return fallback;
  }
  return path;
}
