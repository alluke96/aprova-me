import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { Env } from '../config/env';
import { MAIL_TRANSPORT, MailService } from './mail.service';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const port = config.get('SMTP_PORT', { infer: true });
        const user = config.get('SMTP_USER', { infer: true });
        return createTransport({
          host: config.get('SMTP_HOST', { infer: true }),
          port,
          secure: port === 465,
          auth: user ? { user, pass: config.get('SMTP_PASSWORD', { infer: true }) } : undefined,
        });
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
