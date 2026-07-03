import { IsIn, IsInt, IsString, IsUrl, Max, Min } from 'class-validator';

export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export class RequestProfilePhotoUploadDto {
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';

  @IsInt()
  @Min(1)
  @Max(MAX_PROFILE_PHOTO_BYTES)
  sizeBytes: number;
}

export class SetProfilePhotoDto {
  @IsString()
  @IsUrl({ require_protocol: true })
  profilePhotoUrl: string;
}
