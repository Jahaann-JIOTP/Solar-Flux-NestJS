import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as passport from 'passport';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe()); // ✅ Enable validation globally
  app.use(passport.initialize()); // ✅ Ensure Passport is initialized


  await app.listen(process.env.PORT ?? 5002);
}
bootstrap();
