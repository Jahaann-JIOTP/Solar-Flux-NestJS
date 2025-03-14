import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Controller, Post, Req, UseGuards,Body, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  private readonly logger = new Logger(AuthController.name);

  // Login Controller
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  // Logout Controller
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req) {
    console.log(req);
    return { message: `User ${req.user.email} logged out successfully` };
  }

  // Reset Password Controller
  @Post('reset-password')
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto.email, resetDto.newPassword);
  }
}
