import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Req, 
  UseGuards, 
  UnauthorizedException, 
  BadRequestException
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @UseGuards(AuthGuard('jwt')) // ✅ Protects the route
  async register(@Body() createUserDto: CreateUserDto, @Req() req) {
    const currentUserRole = req.user?.role || 'User';
    
    // ✅ Ensure only Admin can create users
    if (currentUserRole !== 'Admin') {
      throw new UnauthorizedException('Only Admin can create users');
    }

    return this.usersService.registerUser(createUserDto);
  }

  /**
   * Get all users along with their roles
   */
  @Get('all')
  @UseGuards(AuthGuard('jwt')) // ✅ Protects the route
  async getAllUsers(@Req() req) {
    return this.usersService.getAllUsers();
  }

  /**
   * Update user details (Only Admin can update)
   */
  @Patch('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only Admin can update users');
    }
    return this.usersService.updateUser(id, updateUserDto);
  }

  /**
   * Delete user (Only Admin can delete)
   */
  @Delete('delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteUser(@Param('id') id: string, @Req() req) {
    if (req.user?.role !== 'Admin') {
      throw new BadRequestException('Only Admin can delete users');
    }
    const user = await this.usersService.deleteUser(id);
    if(!user) {
      throw new UnauthorizedException('Unable to delete user');
    }
    return { message: `User has been deleted` };
  }
}
