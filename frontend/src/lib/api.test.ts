import { api, ApiError, requestToken } from './api';

const cookieStore = { get: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

function respond(status: number, body?: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
}

describe('cliente da API', () => {
  beforeEach(() => {
    cookieStore.get.mockReturnValue({ value: 'jwt' });
  });

  it('envia o token do cookie como Bearer', async () => {
    const fetchMock = respond(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api('/integrations/payable')).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/integrations/payable');
    expect(init.headers.Authorization).toBe('Bearer jwt');
    expect(init.cache).toBe('no-store');
  });

  it('manda para o login sem cookie', async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expect(api('/x')).rejects.toThrow('REDIRECT /login');
  });

  it('manda para o login quando o token expira', async () => {
    vi.stubGlobal('fetch', respond(401, { message: 'Não autorizado' }));

    await expect(api('/x')).rejects.toThrow('REDIRECT /login?expired=1');
  });

  it('traduz erros de validação da API por campo', async () => {
    vi.stubGlobal(
      'fetch',
      respond(400, {
        message: 'Dados inválidos',
        errors: [{ field: 'payable.value', messages: ['valor inválido'] }],
      }),
    );

    const error = await api('/x').catch((e: ApiError) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({ value: ['valor inválido'] });
  });

  it('aceita respostas sem corpo (204)', async () => {
    vi.stubGlobal('fetch', respond(204));

    await expect(api('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('pede o token sem enviar Authorization', async () => {
    const fetchMock = respond(200, { access_token: 'novo', expires_in: 60 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestToken('aprovame', 'aprovame')).resolves.toMatchObject({
      access_token: 'novo',
    });
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });
});
