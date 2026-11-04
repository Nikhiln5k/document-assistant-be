import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  // @IsString()
  // @IsNotEmpty()
  // @MaxLength(200)
  // passStr: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lastName?: string;
}
