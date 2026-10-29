# Requirements Document

## Introduction

O Aprova-me resolve o [desafio Aprove-me da Bankme](https://github.com/ReginaSobral/aprove-me): uma API de **recebíveis** (payables) e **cedentes** (assignors), um front para operar esses cadastros e o processamento assíncrono de lotes de até 10.000 recebíveis. Os 10 níveis do back-end e os 5 do front-end estão entregues.

Este arquivo descreve **o que** o sistema faz, no formato EARS (QUANDO / SE / ENTÃO o sistema DEVE). O **como** está em [design.md](design.md) e o andamento em [tasks.md](tasks.md). Os números (ex.: 4.3) são referenciados nas tarefas e devem continuar estáveis: requisito novo ganha número novo, e requisito removido fica marcado como removido.

## Glossary

- **Recebível (payable):** valor a receber, com data de emissão e um cedente.
- **Cedente (assignor):** pessoa física (CPF) ou jurídica (CNPJ) que cede o recebível.
- **Lote (batch):** envio de vários recebíveis de uma vez, processado em fila.
- **Fila morta (dead letter):** itens do lote que falharam de vez, guardados para análise.
- **Integrador:** sistema que chama a API diretamente, sem o front.

## Requirements

### Requirement 1: Autenticação

**User Story:** Como integrador, quero trocar login e senha por um token, para chamar a API com segurança.

#### Acceptance Criteria

1. QUANDO `POST /integrations/auth` receber `login` e `password` válidos, ENTÃO o sistema DEVE responder 200 com `access_token` (JWT) que expira em `JWT_EXPIRES_IN_SECONDS` (padrão 60, como pede o enunciado).
2. SE as credenciais forem inválidas, ENTÃO o sistema DEVE responder 401 sem dizer se o erro foi no login ou na senha.
3. O sistema DEVE limitar `POST /integrations/auth` a 10 tentativas por minuto.
4. QUANDO qualquer outra rota for chamada sem `Authorization: Bearer <token>` válido, ENTÃO o sistema DEVE responder 401. Exceções públicas: `POST /integrations/auth` e `GET /health`.

### Requirement 2: Usuários e permissões

**User Story:** Como operador, quero gerenciar quem pode gerar tokens.

#### Acceptance Criteria

1. O sistema DEVE guardar usuários no banco com a senha em hash bcrypt, nunca em texto.
2. QUANDO autenticado, o sistema DEVE permitir `POST`, `GET` e `DELETE /integrations/users`.
3. SE um usuário tentar remover a si mesmo, ENTÃO o sistema DEVE responder 400.
4. O seed DEVE criar o usuário `aprovame` / `aprovame` (ou `SEED_USER_LOGIN` / `SEED_USER_PASSWORD`) e ser idempotente: rodar de novo não duplica nem troca a senha.

### Requirement 3: Validação e formato de erro

**User Story:** Como integrador, quero saber exatamente qual campo está errado.

#### Acceptance Criteria

1. SE o corpo for inválido, ENTÃO o sistema DEVE responder 400 com `{ statusCode, error, message: "Dados inválidos", errors: [{ field, messages[] }] }`, com o caminho completo do campo (ex.: `payable.value`, `assignor.email`).
2. SE o corpo tiver campos que o contrato não conhece, ENTÃO o sistema DEVE recusá-lo com 400.
3. SE um id de rota não for UUID, ENTÃO o sistema DEVE responder 400.
4. QUANDO houver violação de chave única ou de relacionamento, ENTÃO o sistema DEVE responder 409. QUANDO o registro não existir, DEVE responder 404. Nunca 500 genérico.

### Requirement 4: Cedentes

**User Story:** Como operador, quero cadastrar e consultar cedentes.

#### Acceptance Criteria

1. O sistema DEVE oferecer `POST`, `GET` (paginado), `GET /:id`, `PATCH /:id` e `DELETE /:id` em `/integrations/assignor`.
2. O cedente DEVE ter `id` (UUID gerado pelo cliente), `document` (máx. 30), `email` (máx. 140, válido), `phone` (máx. 20, só dígitos e `+ ( ) -` e espaço) e `name` (máx. 140).
3. O sistema DEVE aceitar só CPF ou CNPJ com dígitos verificadores válidos, incluindo o CNPJ alfanumérico (Receita, julho de 2026), com ou sem pontuação.
4. O sistema DEVE guardar o documento sem pontuação e em maiúsculas.
5. SE já existir cedente com o mesmo documento, ENTÃO o sistema DEVE responder 409.
6. SE o cedente tiver recebíveis, ENTÃO o `DELETE` DEVE responder 409.
7. QUANDO `GET` receber `search`, ENTÃO o sistema DEVE filtrar por nome (sem diferenciar maiúsculas) ou documento (com ou sem pontuação).

### Requirement 5: Recebíveis

**User Story:** Como integrador, quero registrar recebíveis sem risco de duplicar ou perder centavos.

#### Acceptance Criteria

1. QUANDO `POST /integrations/payable` receber `payable` e, opcionalmente, `assignor`, ENTÃO o sistema DEVE gravar os dois na mesma transação.
2. SE `assignor` for enviado e `assignor.id` diferir de `payable.assignor`, ENTÃO o sistema DEVE responder 400 no campo `payable.assignor`.
3. SE `assignor` não for enviado e o cedente não existir, ENTÃO o sistema DEVE responder 400 no campo `payable.assignor`.
4. QUANDO o mesmo `id` for reenviado com os mesmos dados, ENTÃO o sistema DEVE devolver o existente sem duplicar (idempotência). SE vier com dados diferentes, DEVE responder 409.
5. O sistema DEVE guardar `value` como `DECIMAL(15,2)`, aceitar `1500.5` ou `"1500.50"` e responder sempre texto com duas casas (`"1500.50"`). Número que já chega com erro de float DEVE ser recusado, não arredondado.
6. O sistema DEVE tratar `emissionDate` como data sem hora (`YYYY-MM-DD`), sem deslocamento de fuso.
7. O sistema DEVE oferecer `GET` paginado (`page` ≥ 1, `pageSize` de 1 a 100, padrão 20, mais recentes primeiro), `GET /:id`, `PATCH /:id` e `DELETE /:id` (204).

### Requirement 6: Lotes

**User Story:** Como integrador, quero enviar milhares de recebíveis de uma vez sem deixar a API lenta.

#### Acceptance Criteria

1. QUANDO `POST /integrations/payable/batch` receber de 1 a 10.000 recebíveis, ENTÃO o sistema DEVE responder 202 com o id do lote e processar em fila, um job por recebível.
2. SE o lote tiver ids repetidos, ENTÃO o sistema DEVE responder 400 listando os repetidos.
3. SE a fila estiver indisponível ao enfileirar, ENTÃO o sistema DEVE desfazer o lote e responder 503.
4. QUANDO `GET /integrations/payable/batch/:id` for chamado, ENTÃO o sistema DEVE devolver `status`, `total`, `succeeded`, `failed`, `pending` e até 100 falhas com o motivo.
5. O sistema DEVE contar cada item uma única vez, mesmo que o job rode de novo após uma queda do worker.
6. QUANDO todos os itens terminarem, ENTÃO o sistema DEVE marcar o lote como `COMPLETED` e enviar **um** e-mail para `BATCH_REPORT_EMAIL` com sucessos e falhas, mesmo com vários workers.

### Requirement 7: Resiliência

**User Story:** Como operador, quero que falhas temporárias se resolvam sozinhas e que as permanentes cheguem até mim.

#### Acceptance Criteria

1. SE um item falhar por erro temporário (ex.: banco fora do ar), ENTÃO o sistema DEVE tentar de novo com backoff exponencial até `BATCH_MAX_ATTEMPTS` (padrão 5: 1 tentativa + 4 retentativas).
2. SE um item falhar por erro permanente (cedente inexistente, id em conflito), ENTÃO o sistema DEVE mandá-lo direto para a fila morta, sem retentar.
3. QUANDO um item for para a fila morta, ENTÃO o sistema DEVE avisar `OPERATIONS_EMAIL` por e-mail e guardar o item na fila para análise.
4. O sistema DEVE enviar e-mails por uma fila própria, para que o SMTP fora do ar não trave o processamento dos recebíveis.

### Requirement 8: Sessão no front

**User Story:** Como operador, quero entrar no sistema sem expor meu token.

#### Acceptance Criteria

1. QUANDO o login der certo, ENTÃO o front DEVE guardar o token em cookie httpOnly (`aprovame_session`), inacessível ao JavaScript da página, e chamar a API pelo servidor do Next.
2. SE não houver sessão válida, ENTÃO o front DEVE redirecionar ao login. SE a sessão tiver expirado, DEVE avisar que expirou.
3. QUANDO voltar do login, ENTÃO o front DEVE levar a pessoa à página onde ela estava (`?from=`), aceitando só caminhos internos.
4. O front DEVE mostrar quanto falta para a sessão expirar e levar ao login quando ela acabar, antes que a pessoa perca o que digitou.

### Requirement 9: Cadastro de recebível no front

**User Story:** Como operador, quero cadastrar um recebível sem errar o valor nem o cedente.

#### Acceptance Criteria

1. O front DEVE bloquear o envio com campos vazios ou fora das regras, mostrando o erro embaixo de cada campo.
2. O front DEVE validar de novo na Server Action e mostrar por campo os erros que a API devolver.
3. O front DEVE aceitar valor no formato brasileiro (`1.500,50`) e enviar texto com ponto decimal (`1500.50`).
4. O front DEVE oferecer um combobox de cedentes com busca por nome ou documento e um atalho para cadastrar cedente novo e voltar ao recebível.
5. O front DEVE gerar o id quando a tela abre, para que dois cliques em "Cadastrar" não criem dois registros.
6. QUANDO a pessoa começar a corrigir um campo com erro, ENTÃO o front DEVE esconder o erro desse campo até o próximo envio.

### Requirement 10: Cedentes no front

**User Story:** Como operador, quero cadastrar e consultar cedentes.

#### Acceptance Criteria

1. O front DEVE ter listagem, detalhe e cadastro de cedente.
2. QUANDO a pessoa digitar o CPF/CNPJ, ENTÃO o front DEVE aplicar a máscara: CPF até 11 dígitos, CNPJ (inclusive alfanumérico, em maiúsculas) a partir do 12º caractere ou da primeira letra.
3. QUANDO a pessoa digitar o telefone, ENTÃO o front DEVE aplicar `(00) 0000-0000` ou `(00) 00000-0000`, removendo o `+55` de números colados.
4. O front DEVE manter o cursor no lugar ao editar no meio do campo. QUANDO o backspace ou o delete cair sobre a pontuação, ENTÃO o front DEVE apagar o caractere ao lado.

### Requirement 11: Recebíveis no front

**User Story:** Como operador, quero consultar e corrigir recebíveis.

#### Acceptance Criteria

1. O front DEVE listar recebíveis paginados com id, valor e data de emissão, e caber na tela do celular.
2. O front DEVE ter detalhe, edição e exclusão (com confirmação), e link para o cedente.

### Requirement 12: Entrega e operação

**User Story:** Como avaliador, quero subir e verificar o projeto com pouco esforço.

#### Acceptance Criteria

1. `docker compose up --build` DEVE subir Postgres, Redis, Mailpit, API, worker e front, com migração e seed automáticos.
2. A API DEVE documentar todas as rotas no Swagger (`/docs`).
3. O CI DEVE rodar lint, checagem de tipos, testes unitários, e2e com Postgres e Redis reais, build do front, build das imagens e validação do Terraform a cada push na `main` e em todo PR.
4. QUANDO o CI passar na `main` e `AWS_DEPLOY_ENABLED=true`, ENTÃO o deploy DEVE publicar as imagens no ECR e atualizar API, worker e front no ECS, nessa ordem.
5. A infraestrutura AWS DEVE estar descrita em Terraform (VPC, ALB, ECS Fargate, RDS, ElastiCache, Secrets Manager, ECR, OIDC do GitHub).
