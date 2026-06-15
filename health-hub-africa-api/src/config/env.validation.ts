import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  PORT: number = 4000;

  @IsUrl({ require_tld: false })
  APP_URL: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsNumber()
  JWT_EXPIRY: number = 900;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsNumber()
  JWT_REFRESH_EXPIRY: number = 604800;

  // Optional: when absent the AWS SDK falls back to its default credential
  // provider chain (ECS task role / IAM role) — preferred in production.
  @IsOptional()
  @IsString()
  AWS_ACCESS_KEY_ID?: string;

  @IsOptional()
  @IsString()
  AWS_SECRET_ACCESS_KEY?: string;

  @IsString()
  AWS_REGION: string = 'us-east-1';

  @IsString()
  @IsNotEmpty()
  S3_BUCKET: string;

  @IsNumber()
  SIGNED_URL_EXPIRY_SECONDS: number = 3600;

  // Optional: PaymentsService uses getOrThrow at call time, so a missing key
  // fails loudly on the first payment attempt instead of blocking startup
  // with dummy placeholder values.
  @IsOptional()
  @IsString()
  PAYSTACK_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  FLUTTERWAVE_SECRET_KEY?: string;

  @IsString()
  @IsNotEmpty()
  OPENEMR_BASE_URL: string;

  @IsString()
  @IsNotEmpty()
  OPENEMR_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  OPENEMR_CLIENT_SECRET: string;

  @IsOptional()
  @IsString()
  TWILIO_ACCOUNT_SID?: string;

  @IsOptional()
  @IsString()
  TWILIO_AUTH_TOKEN?: string;

  @IsOptional()
  @IsString()
  MAILGUN_API_KEY?: string;

  @IsOptional()
  @IsString()
  MAILGUN_DOMAIN?: string;

  @IsOptional()
  @IsString()
  FIREBASE_PROJECT_ID?: string;

  @IsOptional()
  @IsString()
  FIREBASE_PRIVATE_KEY?: string;

  @IsOptional()
  @IsString()
  FIREBASE_CLIENT_EMAIL?: string;

  // Optional: TelecareService throws at call time if these are missing,
  // so a missing key fails loudly on the first token request instead of
  // blocking startup.
  @IsOptional()
  @IsString()
  LIVEKIT_URL?: string;

  @IsOptional()
  @IsString()
  LIVEKIT_API_KEY?: string;

  @IsOptional()
  @IsString()
  LIVEKIT_API_SECRET?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('\n')}`,
    );
  }

  return validatedConfig;
}
