import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /** Ex.: "aprovame" */
  @IsNotEmpty({ message: 'login é obrigatório' })
  @IsString({ message: 'login deve ser texto' })
  @MaxLength(60, { message: 'login deve ter no máximo 60 caracteres' })
  login!: string;

  /** Ex.: "aprovame" */
  @IsNotEmpty({ message: 'password é obrigatório' })
  @IsString({ message: 'password deve ser texto' })
  @MaxLength(72, { message: 'password deve ter no máximo 72 caracteres' })
  password!: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  /** Em segundos. */
  expires_in: number;
}
