import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivilegesController } from './privileges.controller';
import { Privilege, PrivilegeSchema } from './schemas/privilege.schema';
import { PrivilegesService } from './privileges.service';
import { Role, RoleSchema } from '../roles/schemas/role.schema'; // ✅ Import Role Schema
import { RolesModule } from '../roles/roles.module'; // ✅ Import RolesModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Privilege.name, schema: PrivilegeSchema },
      { name: Role.name, schema: RoleSchema } // ✅ Register Role Schema in PrivilegesModule
    ]),
    RolesModule, // ✅ Import RolesModule so RoleModel is available
  ],
  controllers: [PrivilegesController],
  providers: [PrivilegesService],
  exports: [PrivilegesService, MongooseModule]
})
export class PrivilegesModule {}
