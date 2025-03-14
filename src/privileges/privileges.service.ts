import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Privilege, PrivilegeDocument } from './schemas/privilege.schema';
import { CreatePrivilegeDto } from './dto/create-privilege.dto';

@Injectable()
export class PrivilegesService {
  constructor(
    @InjectModel(Privilege.name) private privilegeModel: Model<PrivilegeDocument>,
  ) {}

  async createPrivilege(createPrivilegeDto: CreatePrivilegeDto): Promise<Privilege> {
    const { name, code } = createPrivilegeDto;

    // Check if privilege already exists
    const existingPrivilege = await this.privilegeModel.findOne({ code });
    if (existingPrivilege) {
      throw new ConflictException('Privilege with this code already exists');
    }

    // Save the privilege
    const newPrivilege = new this.privilegeModel(createPrivilegeDto);
    return newPrivilege.save();
  }

  async getAllPrivileges(): Promise<Privilege[]> {
    return this.privilegeModel.find().select('name code').exec();
  }
}
