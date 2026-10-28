import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'login é obrigatório' })
  @IsString({ message: 'login deve ser texto' })
  @MinLength(3, { message: 'login deve ter pelo menos 3 caracteres' })
  @MaxLength(60, { message: 'login deve ter no máximo 60 caracteres' })
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: 'login deve conter apenas letras, números, . _ e -' })
  login!: string;

  @IsNotEmpty({ message: 'password é obrigatório' })
  @IsString({ message: 'password deve ser texto' })
  @MinLength(8, { message: 'password deve ter pelo menos 8 caracteres' })
  // O bcrypt ignora o que passa de 72 bytes; melhor recusar do que truncar em silêncio.
  @MaxLength(72, { message: 'password deve ter no máximo 72 caracteres' })
  password!: string;
}

export interface UserResponse {
  id: string;
  login: string;
  createdAt: Date;
}
