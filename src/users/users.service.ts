import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { Role , RoleDocument} from '../roles/schemas/role.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { Privilege } from '../privileges/schemas/privilege.schema';


@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<Role>,
  ) {}

    /**
     * Register a new user
     */

  // async registerUser(createUserDto: CreateUserDto, currentUserRole: string): Promise<User> {

  //   const { name, email, password, role } = createUserDto;

  //   // Check if user already exists
  //   const existingUser = await this.userModel.findOne({ email });
  //   if (existingUser) {
  //     throw new ConflictException('User already exists');
  //   }

  //   // Validate role
  //   const assignedRole = await this.roleModel.findById(role);
  //   if (!assignedRole) {
  //     throw new ConflictException('Invalid Role ID');
  //   }

  //   // Generate unique username
  //   const username = name.toLowerCase().replace(/\s+/g, '') + Math.floor(1000 + Math.random() * 9000);

  //   // Hash password
  //   const hashedPassword = await bcrypt.hash(password, 10);

  //   // Create user
  //   const user = new this.userModel({
  //     name,
  //     username,
  //     email,
  //     password: hashedPassword,
  //     role: assignedRole._id, // Assign role
  //   });

  //   return user.save();
  // }
    async registerUser(createUserDto: CreateUserDto): Promise<User> {
      const { name, email, password, role } = createUserDto;
  
      // ✅ Check if email already exists
      const existingUser = await this.userModel.findOne({ email });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
  
      // ✅ Validate role
      const assignedRole = await this.roleModel.findById(role);
      if (!assignedRole) {
        throw new ConflictException('Invalid Role ID');
      }
  
      // ✅ Generate unique username
      const username = name.toLowerCase().replace(/\s+/g, '') + Math.floor(1000 + Math.random() * 9000);
  
      // ✅ Hash password before saving
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // ✅ Create user
      const user = new this.userModel({
        name,
        username,
        email,
        password: hashedPassword,
        role: assignedRole._id,
      });
  
      return user.save();
    }
  
    /**
     * Get all users along with roles
     */
    async getAllUsers(): Promise<User[]> {
      return this.userModel.find().populate('role', 'name').exec(); // ✅ Populate role name
    }
  
    /**
     * Update user details
     */
    async updateUser(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
  const user = await this.userModel.findById(userId).exec(); // ✅ Ensure `exec()` is called
  if (!user) {
    throw new NotFoundException('User not found');
  }

  // ✅ Ensure email uniqueness when updating
  if (updateUserDto.email) {
    const existingUser = await this.userModel.findOne({ email: updateUserDto.email }).exec();
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ConflictException('Email already in use');
    }
  }

  const updatedUser = await this.userModel.findByIdAndUpdate(userId, updateUserDto, { new: true }).exec();
  
  if (!updatedUser) {
    throw new NotFoundException('User could not be updated'); // ✅ Handle unexpected case
  }

  return updatedUser;
}

  
    /**
     * Delete user
     */
    async deleteUser(userId: string): Promise<any> {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      const deletedUser = await this.userModel.findByIdAndDelete(userId);
      if (!deletedUser) {
        throw new NotFoundException('User could not be deleted'); // ✅ Handle unexpected case
      }
      return deletedUser;
    }
  

  // async findByEmail(email: string): Promise<User | null> {
  //   return this.userModel.findOne({ email }).exec();
  // }
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).populate('role').exec(); // ✅ Ensure population
  }


  async updateUserPassword(userId: Types.ObjectId, newPassword: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId.toString(), { password: newPassword });
  }  



  
 
  async findUserWithRole(userId: string): Promise<(User & { role: Role & { _id: Types.ObjectId; privileges: Privilege[] } }) | null> {
      const user = await this.userModel
          .findById(userId)
          .populate({
              path: 'role',
              populate: {
                  path: 'privileges',
                  model: 'Privilege',
                  select: '_id name'
              }
          })
          .lean() // ✅ Converts to plain object
          .exec();
  
      return user as (User & { role: Role & { _id: Types.ObjectId; privileges: Privilege[] } }) | null;
  }
  
}
