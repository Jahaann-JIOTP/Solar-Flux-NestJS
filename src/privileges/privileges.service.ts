import { 
  Injectable, 
  BadGatewayException, 
  NotFoundException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Privilege, PrivilegeDocument } from './schemas/privilege.schema';
import { CreatePrivilegeDto } from './dto/create-privilege.dto';
import { Role, RoleDocument } from '../roles/schemas/role.schema';
import { UpdatePrivilegeDto } from './dto/update-privilege.dto';

@Injectable()
export class PrivilegesService {
  constructor(
    @InjectModel(Privilege.name) private privilegeModel: Model<PrivilegeDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument> // ✅ Inject Role Model to check assignments
  ) {}

  /**
   * Create a new privilege (Auto-generate code)
   */
  async createPrivilege(createPrivilegeDto: CreatePrivilegeDto): Promise<Privilege> {
    const { name } = createPrivilegeDto;

    // ✅ Check if privilege name already exists
    const existingPrivilege = await this.privilegeModel.findOne({ name });
    if (existingPrivilege) {
      throw new BadGatewayException('Privilege with this name already exists');
    }

    // ✅ Auto-generate `code` from name
    const code = name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(1000 + Math.random() * 9000);

    // ✅ Save the privilege
    const newPrivilege = new this.privilegeModel({ name, code });
    return newPrivilege.save();
  }

  /**
   * Get all privileges (Return name & code only)
   */
  async getAllPrivileges(): Promise<Privilege[]> {
    return this.privilegeModel.find().select('name code').exec();
  }

  /**
   * Update Privilege (Unique Name Check + Auto-generate Code)
   */
  async updatePrivilege(id: string, updatePrivilegeDto: UpdatePrivilegeDto): Promise<Privilege> {
    const { name } = updatePrivilegeDto;

    // ✅ Check if privilege exists
    const privilege = await this.privilegeModel.findById(id);
    if (!privilege) {
      throw new NotFoundException('Privilege not found');
    }

    // ✅ Check if new name is already taken by another privilege
    if (name && name !== privilege.name) {
      const existingPrivilege = await this.privilegeModel.findOne({ name });
      if (existingPrivilege) {
        throw new BadGatewayException('Privilege with this name already exists');
      }
      privilege.name = name; // ✅ Update privilege name
    }

    // ✅ Auto-generate `code`
    privilege.code = privilege.name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(1000 + Math.random() * 9000);

    return privilege.save();
  }

  /**
   * Delete Privilege (Only if not assigned to any role)
   */
  async deletePrivilege(id: string): Promise<{ message: string }> {
    // ✅ Check if privilege exists
    const privilege = await this.privilegeModel.findById(id);
    if (!privilege) {
      throw new NotFoundException('Privilege not found');
    }

 // ✅ Convert id to ObjectId before checking
 const objectId = new Types.ObjectId(id);

 // ✅ Check if privilege is assigned to any role
 const assignedRole = await this.roleModel.findOne({ privileges: { $in: [objectId] } });

 if (assignedRole) {
   throw new BadGatewayException('Privilege is assigned to a role and cannot be deleted');
 }

    // ✅ Delete the privilege
    await this.privilegeModel.findByIdAndDelete(id);
    return { message: 'Privilege deleted successfully' };
  }
}
