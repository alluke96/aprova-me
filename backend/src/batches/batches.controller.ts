import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParam } from '../common/validation/uuid-param';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/batch.dto';

@ApiTags('Lotes')
@ApiBearerAuth()
@Controller('integrations/payable/batch')
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  /** Recebe até 10.000 recebíveis e processa em segundo plano. Responde 202 com o id do lote. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateBatchDto) {
    return this.batches.create(dto);
  }

  /** Acompanha o progresso do lote e lista as falhas. */
  @Get(':id')
  findOne(@UuidParam() id: string) {
    return this.batches.findOne(id);
  }
}
