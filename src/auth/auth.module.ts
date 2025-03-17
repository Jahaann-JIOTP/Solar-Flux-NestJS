import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    UsersModule, // ✅ Import UsersModule
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'S0LARFL2', // 🔑 JWT Secret Key
      signOptions: { expiresIn: '7d' }, // Token expires in 1 hour
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), // ✅ Register User model
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
