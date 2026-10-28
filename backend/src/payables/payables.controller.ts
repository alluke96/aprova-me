import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination';
import { UuidParam } from '../common/validation/uuid-param';
import { CreatePayableRequestDto, UpdatePayableDto } from './dto/payable.dto';
import { PayablesService } from './payables.service';

@ApiTags('Recebíveis')
@ApiBearerAuth()
@Controller('integrations/payable')
export class PayablesController {
  constructor(private readonly payables: PayablesService) {}

  /** Cadastra um recebível e, opcionalmente, o cedente (idempotente pelo id). */
  @Post()
  create(@Body() dto: CreatePayableRequestDto) {
    return this.payables.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.payables.findAll(query);
  }

  @Get(':id')
  findOne(@UuidParam() id: string) {
    return this.payables.findOne(id);
  }

  @Patch(':id')
  update(@UuidParam() id: string, @Body() dto: UpdatePayableDto) {
    return this.payables.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@UuidParam() id: string) {
    return this.payables.remove(id);
  }
}
