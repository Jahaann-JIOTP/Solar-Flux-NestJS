import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Delete, 
  Param, 
  Body, 
  Query, 
  UseGuards, 
  UnauthorizedException, 
  NotFoundException, 
  ConflictException 
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { AuthGuard } from '@nestjs/passport';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Create a new role (JWT protected)
   */
  @Post('add')
  @UseGuards(AuthGuard('jwt')) // ✅ Require authentication
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  /**
   * Get all roles with an optional selection flag
   */
  @Get('all')
  @UseGuards(AuthGuard('jwt')) // ✅ Require authentication
  async getAllRoles(@Query('selection') selection: string) {
    return this.rolesService.getAllRoles(selection);
  }

  /**
   * Update a role (Only update name & privileges)
   */
  @Patch('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  /**
   * Delete a role (Only if no users are assigned to it)
   */
  @Delete('delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteRole(@Param('id') id: string) {
    return this.rolesService.deleteRole(id);
  }
}
