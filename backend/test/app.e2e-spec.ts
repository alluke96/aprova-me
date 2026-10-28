import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { createTransport } from 'nodemailer';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { MAIL_TRANSPORT } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { hashPassword } from '../src/users/password';
import { WorkerModule } from '../src/worker.module';

/**
 * Teste ponta a ponta contra Postgres e Redis reais (sobem como serviços no CI
 * ou com `docker compose up postgres redis`). Sobe a API e o worker no mesmo
 * processo e percorre o fluxo inteiro, inclusive o lote assíncrono.
 */
describe('Aprova-me (e2e)', () => {
  let app: INestApplication;
  let worker: INestApplicationContext;
  let prisma: PrismaService;
  let token: string;
  const sentMail: { subject: string; to: string }[] = [];

  const assignor = {
    id: randomUUID(),
    document: '529.982.247-25',
    email: 'cedente@empresa.com',
    phone: '(41) 99999-0000',
    name: 'Empresa Cedente LTDA',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication<NestExpressApplication>());
    await app.init();

    const jsonTransport = createTransport({ jsonTransport: true });
    const workerRef = await Test.createTestingModule({ imports: [WorkerModule] })
      .overrideProvider(MAIL_TRANSPORT)
      .useValue({
        sendMail: async (mail: { subject: string; to: string }) => {
          sentMail.push(mail);
          return jsonTransport.sendMail(mail);
        },
      })
      .compile();
    worker = await workerRef.init();

    prisma = app.get(PrismaService);
    await prisma.batchItem.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.payable.deleteMany();
    await prisma.assignor.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: { login: 'aprovame', passwordHash: await hashPassword('aprovame') },
    });
  });

  afterAll(async () => {
    await worker?.close();
    await app?.close();
  });

  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('health é público', async () => {
    await api().get('/health').expect(200, { status: 'ok' });
  });

  it('bloqueia rotas sem token', async () => {
    const response = await api().get('/integrations/payable').expect(401);
    expect(response.body.message).toBe('Não autorizado');
  });

  it('gera token com as credenciais do enunciado', async () => {
    const response = await api()
      .post('/integrations/auth')
      .send({ login: 'aprovame', password: 'aprovame' })
      .expect(200);

    expect(response.body).toMatchObject({ token_type: 'Bearer', expires_in: 60 });
    token = response.body.access_token;
  });

  it('recusa credenciais erradas', async () => {
    await api().post('/integrations/auth').send({ login: 'aprovame', password: 'x' }).expect(401);
  });

  it('mostra cada campo inválido', async () => {
    const response = await api()
      .post('/integrations/payable')
      .set(auth())
      .send({ payable: { id: 'x', value: null, emissionDate: '2026-02-30', assignor: assignor.id } })
      .expect(400);

    expect(response.body.errors.map((error: { field: string }) => error.field)).toEqual([
      'payable.id',
      'payable.value',
      'payable.emissionDate',
    ]);
  });

  const payable = { id: randomUUID(), value: '1500.50', emissionDate: '2026-10-28' };

  it('cadastra recebível e cedente (nível 1 e 2)', async () => {
    const response = await api()
      .post('/integrations/payable')
      .set(auth())
      .send({ payable: { ...payable, assignor: assignor.id }, assignor })
      .expect(201);

    expect(response.body.payable).toMatchObject({ ...payable, assignor: assignor.id });
    expect(response.body.assignor).toMatchObject({ id: assignor.id, document: '52998224725' });
  });

  it('é idempotente: reenviar o mesmo recebível não duplica', async () => {
    await api()
      .post('/integrations/payable')
      .set(auth())
      .send({ payable: { ...payable, assignor: assignor.id } })
      .expect(201);

    expect(await prisma.payable.count()).toBe(1);
  });

  it('consulta, edita e exclui', async () => {
    await api().get(`/integrations/payable/${payable.id}`).set(auth()).expect(200);
    await api().get(`/integrations/assignor/${assignor.id}`).set(auth()).expect(200);

    const updated = await api()
      .patch(`/integrations/payable/${payable.id}`)
      .set(auth())
      .send({ value: 99.9 })
      .expect(200);
    expect(updated.body.value).toBe('99.90');

    await api().delete(`/integrations/assignor/${assignor.id}`).set(auth()).expect(409);
    await api().delete(`/integrations/payable/${payable.id}`).set(auth()).expect(204);
    await api().get(`/integrations/payable/${payable.id}`).set(auth()).expect(404);
  });

  it('processa um lote em segundo plano e manda os e-mails (níveis 7 e 8)', async () => {
    const good = Array.from({ length: 20 }, () => ({
      id: randomUUID(),
      value: '10.00',
      emissionDate: '2026-10-28',
      assignor: assignor.id,
    }));
    const orphan = { ...good[0], id: randomUUID(), assignor: randomUUID() };

    const created = await api()
      .post('/integrations/payable/batch')
      .set(auth())
      .send({ payables: [...good, orphan] })
      .expect(202);

    const batchId = created.body.id;
    let batch = created.body;
    for (let i = 0; i < 60 && batch.status !== 'COMPLETED'; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      batch = (await api().get(`/integrations/payable/batch/${batchId}`).set(auth())).body;
    }

    expect(batch).toMatchObject({ status: 'COMPLETED', total: 21, succeeded: 20, failed: 1 });
    expect(batch.failures[0].payableId).toBe(orphan.id);

    for (let i = 0; i < 20 && sentMail.length < 2; i++) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    expect(sentMail.map((mail) => mail.subject)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('[Fila morta]'),
        `Lote ${batchId} processado: 20 sucesso(s), 1 falha(s)`,
      ]),
    );
  });
});
