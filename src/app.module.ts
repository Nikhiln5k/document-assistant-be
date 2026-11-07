import { Module } from '@nestjs/common';
import { ResponseFormaterInterceptor } from './common/interceptors/response-formater.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { DocumentModule } from './modules/document/document.module';
import { AiModule } from './common/ai/ai.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),
    AiModule,
    DocumentModule
  ],
  controllers: [],
  providers: [ ResponseFormaterInterceptor ],
})
export class AppModule {}
