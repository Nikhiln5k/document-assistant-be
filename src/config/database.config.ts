
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = ( configService: ConfigService ): TypeOrmModuleOptions => ({
  type: 'postgres',

  host: configService.getOrThrow<string>('DB_HOST'),
  port: Number(configService.getOrThrow<string>('DB_PORT')),
  username: configService.getOrThrow<string>('DB_USERNAME'),
  password: configService.getOrThrow<string>('DB_PASSWORD'),
  database: configService.getOrThrow<string>('DB_DATABASE'),

  autoLoadEntities: true,
  synchronize: false,

  poolSize: 10,
  connectTimeoutMS: 5000,

  logging:
    configService.get<string>('NODE_ENV') === 'development'
      ? ['error', 'warn']
      : ['error'],
});
