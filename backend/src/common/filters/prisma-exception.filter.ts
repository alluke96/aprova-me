import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/**
 * Traduz erros conhecidos do Prisma para respostas HTTP. Sem isso, uma chave
 * duplicada ou um registro inexistente viraria um 500 genérico.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.translate(exception);

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`Erro inesperado do Prisma (${exception.code})`, exception.stack);
    }

    response.status(status).json({ statusCode: status, message });
  }

  private translate(exception: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    message: string;
  } {
    switch (exception.code) {
      case 'P2002': {
        const target = (exception.meta?.target as string[] | string | undefined) ?? 'registro';
        const fields = Array.isArray(target) ? target.join(', ') : target;
        return { status: HttpStatus.CONFLICT, message: `Já existe um registro com este ${fields}` };
      }
      case 'P2003':
        return {
          status: HttpStatus.CONFLICT,
          message: 'Operação viola um relacionamento (ex.: cedente com recebíveis vinculados)',
        };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Erro interno' };
    }
  }
}
