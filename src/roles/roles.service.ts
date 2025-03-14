import { 
  Injectable,
  NotFoundException, 
  BadGatewayException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Privilege, PrivilegeDocument } from '../privileges/schemas/privilege.schema'; // ✅ Import Privilege schema
import { PrivilegesService } from '../privileges/privileges.service'; // ✅ Import Privileges Service


@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Privilege.name) private privilegeModel: Model<PrivilegeDocument> 
  ) {}

  /**
   * Create a new role
   */
  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, privileges } = createRoleDto;

    // ✅ Check if role name already exists
    const existingRole = await this.roleModel.findOne({ name });
    if (existingRole) {
        throw new BadGatewayException('Role already exists');
    }

    // ✅ Validate Privilege IDs
    if (privileges && privileges.length > 0) {
        const objectIds = privileges.map((id) => new Types.ObjectId(id));

        // ✅ Get count of valid privilege IDs
        const validPrivilegesCount = await this.privilegeModel.countDocuments({ _id: { $in: objectIds } });

        // ✅ If any ID is invalid, reject the request
        if (validPrivilegesCount !== privileges.length) {
            throw new NotFoundException('One or more privileges do not exist');
        }
    }

    // ✅ Create new role
    const role = new this.roleModel({ name, privileges });
    return role.save();
}


  /**
   * Get all roles with an optional selection flag
   */
  async getAllRoles(selection?: string): Promise<any> {
    if (selection === 'true') {
      // ✅ Return only role names and IDs
      return this.roleModel.find().select('_id name').exec();
    }
  
    // ✅ Populate privileges for each role
    return this.roleModel.find().populate({
      path: 'privileges',
      model: 'Privilege', 
      select: '_id name' 
    }).exec();
  }

  /**
   * Update Role (Change name & privileges)
   */

  // async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
  //     const { name, privileges } = updateRoleDto;
  
  //     // ✅ Validate if ID is a valid ObjectId before querying
  //     if (!Types.ObjectId.isValid(id)) {
  //         throw new NotFoundException('Invalid Role ID');
  //     }
  
  //     // ✅ Check if role exists
  //     const role = await this.roleModel.findById(id);
  //     if (!role) {
  //         throw new NotFoundException('Role not found');
  //     }
  
  //     // ✅ Check if new name is already taken by another role
  //     if (name && name !== role.name) {
  //         const existingRole = await this.roleModel.findOne({ name });
  //         if (existingRole) {
  //             throw new BadGatewayException('Role with this name already exists');
  //         }
  //         role.name = name; // ✅ Update role name
  //     }
  
  //     // ✅ Convert privileges (Ensure IDs are ObjectId format)
  //     if (privileges) {
  //         role.privileges = privileges.map((privilegeId) => new Types.ObjectId(privilegeId)); 
  //     }
  
  //     return role.save();
  // }
  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const { name, privileges } = updateRoleDto;

    // ✅ Validate if Role ID is valid
    if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Invalid Role ID');
    }

    // ✅ Check if role exists
    const role = await this.roleModel.findById(id);
    if (!role) {
        throw new NotFoundException('Role not found');
    }

    // ✅ Check if new name is already taken by another role
    if (name && name !== role.name) {
        const existingRole = await this.roleModel.findOne({ name });
        if (existingRole) {
            throw new BadGatewayException('Role with this name already exists');
        }
        role.name = name; // ✅ Update role name
    }

    // ✅ Validate Privilege IDs Before Assigning
    if (privileges && privileges.length > 0) {
        const objectIds = privileges.map((id) => new Types.ObjectId(id));

        // ✅ Get count of valid privilege IDs
        const validPrivilegesCount = await this.privilegeModel.countDocuments({ _id: { $in: objectIds } });

        // ✅ If any ID is invalid, reject the request
        if (validPrivilegesCount !== privileges.length) {
            throw new NotFoundException('One or more privileges do not exist');
        }

        // ✅ Convert privileges to ObjectIds
        role.privileges = objectIds;
    }

    return role.save();
}

  
  /**
   * Delete Role (Only if no users are assigned)
   */
  async deleteRole(id: string): Promise<{ message: string }> {
    // ✅ Validate Role ID
    if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException('Invalid Role ID');
    }

    // ✅ Convert ID to ObjectId
    const objectId = new Types.ObjectId(id);

    // ✅ Check if role exists
    const role = await this.roleModel.findById(objectId);
    if (!role) {
        throw new NotFoundException('Role not found');
    }

    // ✅ Check if any users are assigned to this role (Use ObjectId for comparison)
    const usersWithRole = await this.userModel.findOne({ role: objectId });

    if (usersWithRole) {
        throw new BadGatewayException('Role is assigned to users and cannot be deleted');
    }

    // ✅ Delete the role
    await this.roleModel.findByIdAndDelete(objectId);
    return { message: 'Role deleted successfully' };
}
}
