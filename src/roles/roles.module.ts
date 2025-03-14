import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role, RoleSchema } from './schemas/role.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Privilege, PrivilegeSchema } from '../privileges/schemas/privilege.schema';
import { PrivilegesModule } from '../privileges/privileges.module'; // ✅ Import PrivilegesModule


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema }, // ✅ Ensure User model is registered
      { name: Privilege.name, schema: PrivilegeSchema }
    ]), 
    // PrivilegesModule // PrivilegesModule here
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [MongooseModule, RolesService], // ✅ Export Role model and service for UsersModule
})
export class RolesModule {}
