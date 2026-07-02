import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplaceDocumentDto {
  @ApiProperty({ description: 'Object key returned by POST /documents/:id/replace-url' })
  @IsString()
  objectKey: string;

  @ApiProperty({ description: 'Original filename' })
  @IsString()
  @MaxLength(255)
  fileName: string;
}
