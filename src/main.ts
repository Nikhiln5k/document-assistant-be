import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseFormaterInterceptor } from './common/interceptors/response-formater.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({origin: "http://localhost:3000", credentials: true});
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); // validates DTOs, strips unknown fields
  app.useGlobalInterceptors(new ResponseFormaterInterceptor(app.get(Reflector))); // response format interceptor
  await app.listen(process.env.PORT ?? 5000);
}
void bootstrap();
