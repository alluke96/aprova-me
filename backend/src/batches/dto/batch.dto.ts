import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { PayableDto } from '../../payables/dto/payable.dto';

export const MAX_BATCH_SIZE = 10_000;

export class CreateBatchDto {
  /** Até 10.000 recebíveis. Os cedentes precisam estar cadastrados. */
  @IsNotEmpty({ message: 'payables é obrigatório' })
  @IsArray({ message: 'payables deve ser uma lista' })
  @ArrayMinSize(1, { message: 'payables deve ter pelo menos 1 recebível' })
  @ArrayMaxSize(MAX_BATCH_SIZE, {
    message: `payables deve ter no máximo ${MAX_BATCH_SIZE} recebíveis`,
  })
  @ValidateNested({ each: true })
  @Type(() => PayableDto)
  payables!: PayableDto[];
}

export interface BatchFailure {
  payableId: string;
  attempts: number;
  error: string | null;
}

export interface BatchResponse {
  id: string;
  status: 'PROCESSING' | 'COMPLETED';
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
  createdAt: Date;
  finishedAt: Date | null;
  failures?: BatchFailure[];
}
