import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthenticationModule } from '@nestjs/authentication';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { JwtAuthProvider } from './providers/jwt-auth.provider';
import { getAuthConfig } from '../../config/auth.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // Registers a global guard: every route requires a valid JWT unless marked @Public().
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getAuthConfig(configService),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthProvider],
})
export class AuthModule {}
