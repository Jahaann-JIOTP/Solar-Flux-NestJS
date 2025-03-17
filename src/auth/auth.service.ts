import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { Role } from 'src/roles/schemas/role.schema';
import { Types } from 'mongoose';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Validate User Exsistence Service
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  // Login User Service
  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const userWithRole = await this.usersService.findUserWithRole(user._id);

    if (!userWithRole) {
        throw new UnauthorizedException('User not found after login');
    }

    // ✅ Ensure role structure is correct
    const { _id: roleId, name: roleName, privileges } = userWithRole.role;

    // Generate JWT token with custom expiry time
    const payload = { sub: user._id, email: user.email, role: roleId };

    return {
        access_token: this.jwtService.sign(payload, {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d', // ✅ Use .env variable
        }),
        user: {
            id: userWithRole._id,
            name: userWithRole.name,
            email: userWithRole.email,
            role: {
                _id: roleId,
                name: roleName,
                privileges,
            }
        },
    };
}







  // Reset Password Service
  async resetPassword(email: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
  
    const hashedPassword = await bcrypt.hash(newPassword, 10);
  
    await this.usersService.updateUserPassword(user._id, hashedPassword); // ✅ Use a new update function
  
    return { message: 'Password reset successful' };
  }
}  
