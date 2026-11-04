import { ConfigService } from '@nestjs/config';
import type { AuthenticationModuleOptions, Duration } from '@nestjs/authentication';

export const getAuthConfig = (configService: ConfigService): AuthenticationModuleOptions => ({
  accessToken: {
    key: configService.getOrThrow<string>('JWT_SECRET'),
    ttl: configService.get<Duration>('JWT_EXPIRES_IN') ?? '7d',
  },

  // The default scrypt cost (ln=17, r=8, p=1) allocates 128 MiB per hash/verify, which fails with
  // "Deriving bits failed" on low-memory hosts. This is OWASP's equivalent-strength 32 MiB setting.
  // Stored hashes carry their own parameters, so existing ones still verify.
  password: { logN: 15, r: 8, p: 3 },

  // Access tokens only for now. Enable this once refresh tokens have a database-backed store.
  refreshToken: false,
});
