// Gera as capturas de tela do README com a aplicação rodando no docker compose.
// Uso: node scripts/screenshots/capture.mjs <pasta-de-saída>
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const API = 'http://localhost:3001';
const WEB = 'http://localhost:3000';
const MAIL = 'http://localhost:8025';
const OUT = process.argv[2] ?? 'out/screenshots';

// ---------- Dados de exemplo (empresas fictícias, documentos com dígitos válidos) ----------

function cnpj(base12) {
  const values = base12.split('').map((char) => char.charCodeAt(0) - 48);
  const digit = (weights) => {
    const rest = weights.reduce((sum, weight, index) => sum + weight * values[index], 0) % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  values.push(digit([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  values.push(digit([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]));
  return base12 + values.slice(12).join('');
}

function cpf(base9) {
  const digits = base9.split('').map(Number);
  const digit = (length) => {
    const sum = digits.slice(0, length).reduce((acc, d, i) => acc + d * (length + 1 - i), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  digits.push(digit(9));
  digits.push(digit(10));
  return digits.join('');
}

const assignors = [
  ['Padaria Pão do Bosque LTDA', cnpj('482193570001'), 'financeiro.paodobosque@exemplo.com.br', '(41) 3333-1001'],
  ['Metalúrgica Iguaçu S.A.', cnpj('193847260001'), 'contas@metalurgica-iguacu.exemplo.com', '(41) 3333-1002'],
  ['Distribuidora Araucária LTDA', cnpj('305918470001'), 'cobranca@araucaria.exemplo.com', '(41) 3333-1003'],
  ['Tecelagem Vale do Ivaí LTDA', cnpj('12ABC34501DE'), 'adm@valedoivai.exemplo.com', '(43) 3333-1004'],
  ['Café Serra Verde ME', cnpj('620483910001'), 'contato@cafeserraverde.exemplo.com', '(41) 99999-1005'],
  ['Ana Beatriz Costa', cpf('384920175'), 'ana.costa@exemplo.com.br', '(41) 99999-1006'],
].map(([name, document, email, phone]) => ({ id: randomUUID(), name, document, email, phone }));

const money = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
const day = (offset) => {
  const date = new Date(Date.UTC(2026, 9, 29) - offset * 86_400_000);
  return date.toISOString().slice(0, 10);
};

// ---------- Cliente da API (o token dura 1 minuto, então renova sempre que preciso) ----------

let token = null;
let tokenAt = 0;

async function call(path, init = {}) {
  if (!token || Date.now() - tokenAt > 40_000) {
    const response = await fetch(`${API}/integrations/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'aprovame', password: 'aprovame' }),
    });
    token = (await response.json()).access_token;
    tokenAt = Date.now();
  }
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function seed() {
  for (const assignor of assignors) {
    await call('/integrations/assignor', { method: 'POST', body: JSON.stringify(assignor) });
  }

  // Lote de 2.000 recebíveis, com 2 de um cedente que não existe: vão para a fila morta.
  const payables = Array.from({ length: 1_998 }, (_, index) => ({
    id: randomUUID(),
    value: money(120, 48_000),
    emissionDate: day(10 + (index % 40)),
    assignor: assignors[index % 5].id,
  }));
  const ghost = randomUUID();
  payables.push(
    { id: randomUUID(), value: '3200.00', emissionDate: day(12), assignor: ghost },
    { id: randomUUID(), value: '845.90', emissionDate: day(13), assignor: ghost },
  );

  const batch = await call('/integrations/payable/batch', {
    method: 'POST',
    body: JSON.stringify({ payables }),
  });
  const started = Date.now();
  let status = batch;
  while (status.status !== 'COMPLETED') {
    if (Date.now() - started > 180_000) throw new Error(`Lote não terminou: ${JSON.stringify(status)}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    status = await call(`/integrations/payable/batch/${batch.id}`);
  }
  console.log(`Lote concluído em ${((Date.now() - started) / 1000).toFixed(1)}s`, status);

  // Recebíveis avulsos depois do lote, para aparecerem no topo da lista.
  const recent = [
    ['18250.00', 0, 0], ['3480.75', 0, 1], ['126900.00', 1, 1], ['742.30', 2, 4],
    ['9915.40', 3, 2], ['56000.00', 4, 3], ['1200.00', 5, 5], ['23417.88', 1, 6],
    ['4390.00', 2, 7], ['88120.50', 0, 8],
  ];
  for (const [value, assignorIndex, offset] of recent.reverse()) {
    await call('/integrations/payable', {
      method: 'POST',
      body: JSON.stringify({
        payable: { id: randomUUID(), value, emissionDate: day(offset), assignor: assignors[assignorIndex].id },
      }),
    });
  }
  return { batch: status };
}

// ---------- Capturas ----------

const errors = [];

async function login(page) {
  await page.goto(`${WEB}/login`);
  await page.getByLabel('Senha').fill('aprovame');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('**/payables');
}

async function shot(page, name, options = {}) {
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: join(OUT, `${name}.png`), ...options });
  console.log(`✓ ${name}.png`);
}

async function capture() {
  await mkdir(OUT, { recursive: true });
  // Idioma do navegador em pt-BR, para os campos de data aparecerem como dd/mm/aaaa.
  const browser = await chromium.launch({
    args: ['--lang=pt-BR'],
    env: { ...process.env, LANG: 'pt_BR.UTF-8', LANGUAGE: 'pt_BR:pt' },
  });
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await desktop.newPage();
  page.on('pageerror', (error) => errors.push({ page: page.url(), error: String(error) }));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ page: page.url(), console: message.text() });
  });

  await page.goto(`${WEB}/login`);
  await shot(page, 'login');

  await login(page);
  await shot(page, 'payables');

  await page.goto(`${WEB}/payables/new`);
  await page.getByRole('button', { name: 'Cadastrar recebível' }).click();
  await shot(page, 'validation');

  await page.goto(`${WEB}/payables/new`);
  await page.getByRole('combobox').fill('pão');
  await page.getByRole('listbox').waitFor();
  await shot(page, 'combobox');

  await page.getByRole('option').first().click();
  await page.getByLabel('Valor (R$)').fill('18.250,00');
  await page.getByLabel('Data de emissão').fill('2026-10-29');
  await page.getByRole('button', { name: 'Cadastrar recebível' }).click();
  await page.waitForURL(/\/payables\/[0-9a-f-]{36}\?saved=created/);
  await shot(page, 'detail');

  await page.getByRole('link', { name: 'Padaria Pão do Bosque LTDA' }).click();
  await page.waitForURL(/\/assignors\//);
  await shot(page, 'assignor');

  await page.goto(`${MAIL}/`);
  await page.getByText('processado').first().waitFor({ timeout: 30_000 });
  await shot(page, 'mailpit');
  await page.getByText('processado').first().click();
  await page.waitForTimeout(1_000);
  await shot(page, 'mail-batch');

  await page.goto(`${API}/docs`);
  await page.locator('.opblock').first().waitFor({ timeout: 30_000 });
  await shot(page, 'swagger');

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const phone = await mobile.newPage();
  await login(phone);
  await shot(phone, 'mobile-list');
  await phone.goto(`${WEB}/payables/new`);
  await shot(phone, 'mobile-form');

  await browser.close();
}

const result = await seed();
try {
  await capture();
} finally {
  await writeFile(join(OUT, 'run.json'), JSON.stringify({ ...result, errors }, null, 2));
}
