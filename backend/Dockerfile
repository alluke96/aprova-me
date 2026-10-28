# syntax=docker/dockerfile:1
# Uma imagem serve à API e ao worker; muda só o comando (ver docker-compose.yml).

FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM deps AS build
COPY . .
# Gera o client de novo depois do prune para garantir que ele fica na imagem final.
RUN npx prisma generate && npm run build && npm prune --omit=dev && npx prisma generate

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Aplica as migrações, garante o usuário padrão e sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/database/seed.js && node dist/main.js"]
