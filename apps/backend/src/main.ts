import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ZodValidationPipe());

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  setupSwagger(app);

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`Backend listening on http://localhost:${port}/api`);
  console.log(`Swagger UI on http://localhost:${port}/docs`);
}

void bootstrap();
