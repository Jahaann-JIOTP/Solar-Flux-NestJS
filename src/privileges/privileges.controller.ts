import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  UseGuards, 
  UnauthorizedException, 
  NotFoundException, 
  ConflictException 
} from '@nestjs/common';
import { PrivilegesService } from './privileges.service';
import { CreatePrivilegeDto } from './dto/create-privilege.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdatePrivilegeDto } from './dto/update-privilege.dto';

@Controller('privileges')
export class PrivilegesController {
  constructor(private readonly privilegesService: PrivilegesService) {}

  /**
   * Create a new privilege (JWT Protected)
   */
  @Post('add')
  @UseGuards(AuthGuard('jwt')) // ✅ JWT Authentication Required
  async createPrivilege(@Body() createPrivilegeDto: CreatePrivilegeDto) {
    return this.privilegesService.createPrivilege(createPrivilegeDto);
  }

  /**
   * Get all privileges (JWT Protected)
   */
  @Get('all')
  @UseGuards(AuthGuard('jwt')) // ✅ JWT Authentication Required
  async getAllPrivileges() {
    return this.privilegesService.getAllPrivileges();
  }

  /**
   * Update a privilege (JWT Protected)
   */
  @Patch('update/:id')
  @UseGuards(AuthGuard('jwt')) // ✅ JWT Authentication Required
  async updatePrivilege(@Param('id') id: string, @Body() updatePrivilegeDto: UpdatePrivilegeDto) {
    return this.privilegesService.updatePrivilege(id, updatePrivilegeDto);
  }

  /**
   * Delete a privilege (Only if not assigned to any role)
   */
  @Delete('delete/:id')
  @UseGuards(AuthGuard('jwt')) // ✅ JWT Authentication Required
  async deletePrivilege(@Param('id') id: string) {
    return this.privilegesService.deletePrivilege(id);
  }
}
