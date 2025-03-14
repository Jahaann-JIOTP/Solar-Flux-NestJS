import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { Role, RoleSchema } from './schemas/role.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }]), // ✅ Register Role model
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [MongooseModule, RolesService], // ✅ Export Role model and service for UsersModule
})
export class RolesModule {}
