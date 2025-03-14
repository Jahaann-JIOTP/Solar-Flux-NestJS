import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'S0LARFL2', // ✅ Ensure this is correct
    });
  }

  async validate(payload: { sub: string; email: string }): Promise<any> {
    this.logger.log(`JWT Strategy Called with Payload: ${JSON.stringify(payload)}`); // ✅ Log payload

    if (!payload.email) {
      this.logger.error('Invalid token - Email not found in payload.');
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.usersService.findByEmail(payload.email)
    if (!user) {
      this.logger.error(`User Not Found: ${payload.email}`);
      throw new UnauthorizedException('Invalid token');
    }

    this.logger.log(`User Authenticated: ${JSON.stringify(user)}`);
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role.name,
    };
  }
}
