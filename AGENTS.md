# AGENTS.md

Guia para agentes de IA (Kiro, Claude Code, Codex, Cursor e outros) que forem trabalhar neste repositório. Leia inteiro antes da primeira mudança.

## O projeto

Solução do [desafio Aprove-me da Bankme](https://github.com/ReginaSobral/aprove-me): API de recebíveis e cedentes (NestJS + Prisma + Postgres), worker de lotes (BullMQ + Redis) e front (Next.js 16). Todos os níveis do desafio estão entregues; o trabalho daqui para a frente é evolução.

A fonte da verdade é a spec em `.kiro/specs/aprova-me/`:

| Arquivo | Para quê |
| --- | --- |
| [requirements.md](.kiro/specs/aprova-me/requirements.md) | O que o sistema faz, em critérios numerados (EARS). |
| [design.md](.kiro/specs/aprova-me/design.md) | Como e por quê: arquitetura, rotas, modelo de dados, erros e as **propriedades que nunca podem quebrar**. |
| [tasks.md](.kiro/specs/aprova-me/tasks.md) | O que já foi feito e o backlog. |

## Mapa

```
backend/            API NestJS + worker (mesmo código, entradas main.ts e worker.ts)
  prisma/           schema e migrações
  src/<módulo>/     controller, service, dto e *.spec.ts lado a lado
  test/             e2e
frontend/           Next.js 16 (App Router, Server Actions)
  src/app/(app)/    telas autenticadas
  src/app/actions/  Server Actions (única ponte com a API)
  src/lib/          api, sessão, schemas zod, formatação, máscaras
infra/terraform/    AWS (ECS Fargate, RDS, ElastiCache, ALB, ECR)
.github/workflows/  ci.yml, deploy.yml, screenshots.yml
.kiro/specs/        specs no formato do Kiro
```

## Comandos

Requisitos: Node 22; Docker para Postgres, Redis e Mailpit. No Mac sem Docker Desktop, use o Colima (`colima start`).

```bash
# Tudo junto: front :3000, API :3001 (Swagger em /docs), Mailpit :8025
docker compose up --build

# Só a infraestrutura, para rodar API e front direto no Node
docker compose up postgres redis mailpit

# API
cd backend && cp .env.example .env && npm install
npx prisma migrate deploy && npm run db:seed:dev
npm run start:dev            # API
npm run start:worker:dev     # worker, em outro terminal

# Front
cd frontend && cp .env.example .env.local && npm install && npm run dev
```

Login padrão: `aprovame` / `aprovame`. O token vale **60 segundos** (exigência do enunciado); peça outro antes de cada sequência de `curl`.

### Verificação antes de dizer que terminou

Rode no pacote que você alterou. O CI roda o mesmo.

```bash
cd backend  && npm run lint && npm run typecheck && npm test
cd backend  && npm run test:e2e        # se mexeu em API, worker ou banco (precisa de Postgres e Redis)
cd frontend && npm run lint && npm run typecheck && npm test
cd infra/terraform && terraform fmt -check -recursive && terraform validate
```

## Convenções

- **Idioma:** textos de tela, mensagens de erro da API, comentários, testes e commits em **português do Brasil**. Identificadores de código em inglês.
- **Commits:** Conventional Commits com escopo: `feat(api)`, `feat(web)`, `fix(web)`, `feat(infra)`, `ci`, `docs`, `test(api)`. Descrição curta no imperativo ou como resultado ("lista de recebíveis cabe na tela do celular").
- **Formatação:** Prettier com aspas simples, vírgula final e 100 colunas (`backend/.prettierrc`; o front segue o mesmo estilo).
- **Comentários:** explicam o **porquê**, em JSDoc curto acima da função. Não descreva o que o código já diz.
- **Testes:** ao lado do código (`*.spec.ts` no back, `*.test.ts(x)` no front). Toda regra nova ganha teste no mesmo commit. No front, teste digitando como uma pessoa (`userEvent`) e conferindo o que aparece na tela.
- **Dependências:** o front é enxuto de propósito (sem biblioteca de formulário nem de máscara). Antes de adicionar um pacote, veja se dá para resolver com poucas linhas.
- **Migrações:** nunca edite uma migração existente. Crie outra com `npx prisma migrate dev --name <descricao>`.

## Regras que não podem quebrar

Os detalhes e o motivo de cada uma estão em `design.md`, seção *Correctness Properties*.

1. **Dinheiro nunca vira `number`.** É `DECIMAL(15,2)` no banco e texto (`"1500.50"`) no JSON e no front.
2. **Datas de emissão são `YYYY-MM-DD`.** Nada de `new Date()` para exibir; use `formatDate`.
3. **Ids vêm do cliente e garantem a idempotência.** O mesmo id com os mesmos dados devolve o existente; com outros dados, 409.
4. **O token fica em cookie httpOnly.** O navegador nunca chama a API direto; tudo passa por `lib/api.ts` (`server-only`) e pelas Server Actions.
5. **A validação acontece em três camadas:** zod no navegador, zod na Server Action e class-validator na API. Mudou uma regra? Mude nas três.
6. **No worker, erro permanente não retenta.** Novo erro de domínio que não se resolve sozinho entra em `isPermanentPayableError`.
7. **Erros da API voltam por campo** (`errors: [{ field, messages }]`), com o caminho completo (`payable.value`).

Algumas escolhas contrariam o enunciado de propósito (Postgres em vez de SQLite, `DECIMAL` em vez de float, UUID no cedente, cookie em vez de `localStorage`). Não "corrija" de volta; a tabela em `design.md` explica cada uma.

## Como trabalhar

1. **Leia a spec.** Ache em `requirements.md` o critério que a mudança toca.
2. **Mudança de comportamento?** Atualize `requirements.md` antes do código: critério novo ganha número novo, sem renumerar os existentes.
3. **Feature grande e independente** (ex.: tela de lotes no front)? Crie `.kiro/specs/<nome-da-feature>/` com `requirements.md`, `design.md` e `tasks.md` no mesmo formato. O VS Code tem o validador "Kiro Spec Format" e aponta as seções que faltam.
4. **Implemente uma tarefa por vez**, com testes, e marque `[x]` em `tasks.md` no mesmo commit.
5. **Decisão de arquitetura nova?** Registre em `design.md`, com o motivo.

## Cuidados

- **Push na `main` dispara o CI e, se `AWS_DEPLOY_ENABLED=true`, o deploy na AWS.** Não faça push sem pedido explícito, e prefira um branch para mudanças grandes.
- **Outras sessões de IA podem estar commitando na `main` ao mesmo tempo.** Antes de juntar, rode `git fetch` e confira se a `main` andou; se andou, faça rebase e rode os testes de novo.
- **Os `package-lock.json` não são versionados hoje** (tarefa 15 do backlog). Não os inclua em commits sem combinar.
- **O seed não troca a senha** de um usuário que já existe. Se o login falhar, o problema é o banco, não o seed.
- **Segredos:** `.env`, `.env.local` e `*.tfvars` ficam fora do git. Nunca commite credenciais; o `JWT_SECRET` do compose é só para uso local.
- **README:** as capturas em `docs/screenshots/` saem do workflow `screenshots.yml` (Playwright), que publica o resultado na branch `docs-assets`; de lá são copiadas para `docs/`. Para atualizar uma tela, rode o workflow em vez de editar a imagem à mão.
