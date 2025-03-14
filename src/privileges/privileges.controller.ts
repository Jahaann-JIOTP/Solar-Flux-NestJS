import { Controller, Post, Get, Body } from '@nestjs/common';
import { PrivilegesService } from './privileges.service';
import { CreatePrivilegeDto } from './dto/create-privilege.dto';

@Controller('privileges')
export class PrivilegesController {
  constructor(private readonly privilegesService: PrivilegesService) {}

  // ✅ POST API: Create a new privilege
  @Post()
  async createPrivilege(@Body() createPrivilegeDto: CreatePrivilegeDto) {
    return this.privilegesService.createPrivilege(createPrivilegeDto);
  }

  // ✅ GET API: Fetch all privileges
  @Get()
  async getAllPrivileges() {
    return this.privilegesService.getAllPrivileges();
  }
}
