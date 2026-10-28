import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination';
import { IsCpfOrCnpj } from '../../common/validation/document';
import { IsOptionalNotNull } from '../../common/validation/uuid-param';

const required = (field: string) => ({ message: `${field} é obrigatório` });
const PHONE_PATTERN = /^[0-9+()\-\s]+$/;

export class CreateAssignorDto {
  /** Identificador do cedente, gerado pelo cliente. */
  @IsNotEmpty(required('id'))
  @IsUUID('all', { message: 'id deve ser um UUID' })
  id!: string;

  /** CPF ou CNPJ (numérico ou alfanumérico), com ou sem pontuação. */
  @IsNotEmpty(required('document'))
  @IsString({ message: 'document deve ser texto' })
  @MaxLength(30, { message: 'document deve ter no máximo 30 caracteres' })
  @IsCpfOrCnpj()
  document!: string;

  @IsNotEmpty(required('email'))
  @MaxLength(140, { message: 'email deve ter no máximo 140 caracteres' })
  @IsEmail({}, { message: 'email deve ser um e-mail válido' })
  email!: string;

  @IsNotEmpty(required('phone'))
  @IsString({ message: 'phone deve ser texto' })
  @MaxLength(20, { message: 'phone deve ter no máximo 20 caracteres' })
  @Matches(PHONE_PATTERN, { message: 'phone deve conter apenas números e + ( ) -' })
  phone!: string;

  /** Nome ou razão social. */
  @IsNotEmpty(required('name'))
  @IsString({ message: 'name deve ser texto' })
  @MaxLength(140, { message: 'name deve ter no máximo 140 caracteres' })
  name!: string;
}

export class UpdateAssignorDto {
  @IsOptionalNotNull()
  @IsNotEmpty(required('document'))
  @IsString({ message: 'document deve ser texto' })
  @MaxLength(30, { message: 'document deve ter no máximo 30 caracteres' })
  @IsCpfOrCnpj()
  document?: string;

  @IsOptionalNotNull()
  @IsNotEmpty(required('email'))
  @MaxLength(140, { message: 'email deve ter no máximo 140 caracteres' })
  @IsEmail({}, { message: 'email deve ser um e-mail válido' })
  email?: string;

  @IsOptionalNotNull()
  @IsNotEmpty(required('phone'))
  @IsString({ message: 'phone deve ser texto' })
  @MaxLength(20, { message: 'phone deve ter no máximo 20 caracteres' })
  @Matches(PHONE_PATTERN, { message: 'phone deve conter apenas números e + ( ) -' })
  phone?: string;

  @IsOptionalNotNull()
  @IsNotEmpty(required('name'))
  @IsString({ message: 'name deve ser texto' })
  @MaxLength(140, { message: 'name deve ter no máximo 140 caracteres' })
  name?: string;
}

export class ListAssignorsQueryDto extends PaginationQueryDto {
  /** Busca por nome ou documento (usada pelo combobox do front). */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;
}

export interface AssignorResponse {
  id: string;
  document: string;
  email: string;
  phone: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
