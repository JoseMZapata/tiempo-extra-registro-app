import { ValidationPipe } from '@nestjs/common';
import type { CustomOrigin } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const corsOrigin: CustomOrigin = (origin, callback) => {
  const permitidos = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    /^https?:\/\/[a-z0-9-]+\.ngrok-free\.app$/,
    /^https?:\/\/[a-z0-9-]+\.ngrok-free\.dev$/,
    /^https?:\/\/[a-z0-9-]+\.ngrok\.app$/,
    /^https?:\/\/[a-z0-9-]+\.ngrok\.io$/,
    /^https?:\/\/[a-z0-9-]+\.ngrok\.dev$/,
  ];
  if (!origin || permitidos.some((p) => (p instanceof RegExp ? p.test(origin) : p === origin))) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();