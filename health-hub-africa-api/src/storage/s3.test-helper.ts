import { S3Service } from './s3.service';

/** Real photo-resolution logic bound to bucket `hha-bucket` / us-east-1, for service specs that fake S3Service. */
export function realPhotoResolvers() {
  const config = { get: (_k: string, d?: string) => d, getOrThrow: () => 'hha-bucket' };
  const real = new S3Service(config as any);
  return {
    publicUrlFor: real.publicUrlFor.bind(real),
    canonicalPhotoUrl: real.canonicalPhotoUrl.bind(real),
    resolvePhotoInput: real.resolvePhotoInput.bind(real),
  };
}
