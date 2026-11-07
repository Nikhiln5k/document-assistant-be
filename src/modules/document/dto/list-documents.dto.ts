import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentFileType } from '../entities/document.entity';

export class ListDocumentsDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsEnum(DocumentFileType)
  type?: DocumentFileType;
}
