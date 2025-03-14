import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, privileges } = createRoleDto;

    // Check if role already exists
    const existingRole = await this.roleModel.findOne({ name });
    if (existingRole) {
      throw new ConflictException('Role already exists');
    }

    // Create new role
    const role = new this.roleModel({ name, privileges });
    return role.save();
  }

  // ✅ Modify the function to return different responses based on the `selection` flag
  async getAllRoles(selection?: string): Promise<any> {
    if (selection === 'true') {
      // ✅ Return only role names and IDs
      return this.roleModel.find().select('_id name').exec();
    }
  
    // ✅ Ensure `populate` works properly
    return this.roleModel.find().populate({
      path: 'privileges',
      model: 'Privilege', 
      select: '_id name' 
    }).exec();
  }
  
}  
