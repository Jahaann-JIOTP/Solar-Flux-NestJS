import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schemas/user.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema'; // ✅ Import Role schema
import { RolesModule } from '../roles/roles.module'; // ✅ Import RolesModule

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema }, // ✅ Register User model
      { name: Role.name, schema: RoleSchema }  // ✅ Register Role model
    ]),
    RolesModule, // ✅ Ensure RolesModule is imported
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // ✅ Export UsersService for use in other modules if needed
})
export class UsersModule {}
