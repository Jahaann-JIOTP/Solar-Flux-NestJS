import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as passport from 'passport';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe()); // ✅ Enable validation globally
  app.use(passport.initialize()); // ✅ Ensure Passport is initialized
// ✅ Enable CORS for frontend requests (Next.js)
app.enableCors({
  origin: "http://localhost:3000", // Replace with frontend URL
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true, // Allow cookies & auth headers
});

  await app.listen(process.env.PORT ?? 5002);
}
bootstrap();
