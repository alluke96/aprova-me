import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { createValidationPipe } from './common/validation/validation-pipe';
import { Env } from './config/env';

/**
 * Configuração compartilhada entre o `main.ts` e os testes e2e, para que os
 * testes rodem com o mesmo pipeline de validação, limites e documentação.
 */
export function configureApp(app: NestExpressApplication): INestApplication {
  const config = app.get(ConfigService<Env, true>);

  // Lotes de até 10.000 recebíveis passam do limite padrão de 100 KB do Express.
  app.useBodyParser('json', { limit: '5mb' });
  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }), credentials: true });
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Aprova-me API')
      .setDescription('Recebíveis, cedentes e processamento em lote')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, document);

  return app;
}
