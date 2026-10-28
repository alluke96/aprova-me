import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { CreateAssignorDto } from '../../assignors/dto/assignor.dto';
import { IsDateOnly } from '../../common/validation/is-date-only.decorator';
import { IsMoney } from '../../common/validation/money';
import { IsOptionalNotNull } from '../../common/validation/uuid-param';

const required = (field: string) => ({ message: `${field} é obrigatório` });

/** Estrutura de um recebível, exatamente como no enunciado. */
export class PayableDto {
  /** Identificador do recebível, gerado pelo cliente (chave de idempotência). */
  @IsNotEmpty(required('id'))
  @IsUUID('all', { message: 'id deve ser um UUID' })
  id!: string;

  /** Valor em reais. Enviado como texto ("1500.50") ou número (1500.5). */
  @IsNotEmpty(required('value'))
  @IsMoney()
  value!: string;

  /** Data de emissão (AAAA-MM-DD). */
  @IsNotEmpty(required('emissionDate'))
  @IsDateOnly()
  emissionDate!: string;

  /** Id do cedente. */
  @IsNotEmpty(required('assignor'))
  @IsUUID('all', { message: 'assignor deve ser um UUID' })
  assignor!: string;
}

/**
 * Corpo do `POST /integrations/payable`: recebível + dados do cedente (nível 1).
 * O cedente é opcional para que o front possa cadastrar um recebível para um
 * cedente que já existe, escolhido no combobox (nível 2 do front).
 */
export class CreatePayableRequestDto {
  @IsNotEmpty(required('payable'))
  @ValidateNested()
  @Type(() => PayableDto)
  payable!: PayableDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAssignorDto)
  assignor?: CreateAssignorDto;
}

export class UpdatePayableDto {
  @IsOptionalNotNull()
  @IsMoney()
  value?: string;

  @IsOptionalNotNull()
  @IsDateOnly()
  emissionDate?: string;

  @IsOptionalNotNull()
  @IsUUID('all', { message: 'assignor deve ser um UUID' })
  assignor?: string;
}

export interface PayableResponse {
  id: string;
  /** Texto com 2 casas decimais, para não perder precisão no JSON. */
  value: string;
  emissionDate: string;
  assignor: string;
  createdAt: Date;
  updatedAt: Date;
}
