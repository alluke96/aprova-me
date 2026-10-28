import { decodeToken, isTokenExpired, safeRedirectPath, tokenExpiresAt } from './session';

function tokenWith(payload: object): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.assinatura`;
}

describe('sessão', () => {
  const now = Date.UTC(2026, 9, 28, 12, 0, 0);

  it('lê o payload do JWT', () => {
    expect(decodeToken(tokenWith({ sub: 'u1', login: 'aprovame' }))).toEqual({
      sub: 'u1',
      login: 'aprovame',
    });
  });

  it('calcula quando o token expira', () => {
    expect(tokenExpiresAt(tokenWith({ exp: now / 1000 + 60 }))).toBe(now + 60_000);
  });

  it('identifica token expirado, válido e inválido', () => {
    expect(isTokenExpired(tokenWith({ exp: now / 1000 - 1 }), now)).toBe(true);
    expect(isTokenExpired(tokenWith({ exp: now / 1000 + 60 }), now)).toBe(false);
    expect(isTokenExpired('lixo', now)).toBe(true);
    expect(isTokenExpired(tokenWith({ sub: 'sem-exp' }), now)).toBe(true);
  });

  it('só redireciona para caminhos internos', () => {
    expect(safeRedirectPath('/assignors')).toBe('/assignors');
    expect(safeRedirectPath('//evil.com')).toBe('/payables');
    expect(safeRedirectPath('https://evil.com')).toBe('/payables');
    expect(safeRedirectPath('/login')).toBe('/payables');
    expect(safeRedirectPath(undefined)).toBe('/payables');
  });
});
