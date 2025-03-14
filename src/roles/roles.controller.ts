import { Controller, Post, Get, Query, Body } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post('add')
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  // ✅ Modify Get Roles API to accept a query parameter
  @Get('all')
  async getAllRoles(@Query('selection') selection: string) {
    return this.rolesService.getAllRoles(selection);
  }
}
