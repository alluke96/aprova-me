import { z } from 'zod';

/**
 * Variáveis de ambiente validadas na inicialização. Se faltar algo, a aplicação
 * falha cedo com uma mensagem clara em vez de quebrar na primeira requisição.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa ter pelo menos 16 caracteres'),
  /** O enunciado pede expiração de 1 minuto. */
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(60),

  /** 1 tentativa + 4 retentativas, como pede o nível 8. */
  BATCH_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(5),
  BATCH_BACKOFF_MS: z.coerce.number().int().min(0).default(1000),
  BATCH_CONCURRENCY: z.coerce.number().int().min(1).default(10),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default('Aprova-me <nao-responda@aprova.me>'),
  BATCH_REPORT_EMAIL: z.string().email().default('cliente@aprova.me'),
  OPERATIONS_EMAIL: z.string().email().default('operacoes@aprova.me'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`);
  }
  return result.data;
}
