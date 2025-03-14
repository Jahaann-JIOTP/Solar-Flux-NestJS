import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrivilegesController } from './privileges.controller';
import { Privilege, PrivilegeSchema } from './schemas/privilege.schema';
import { PrivilegesService } from './privileges.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Privilege.name, schema: PrivilegeSchema }]),
  ],
  controllers: [PrivilegesController],
  providers: [PrivilegesService],
  exports: [PrivilegesService],
})
export class PrivilegesModule {}
