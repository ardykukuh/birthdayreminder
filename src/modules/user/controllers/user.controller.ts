import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  Put,
  Get,
  Inject,
} from '@nestjs/common';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { IUserNotificationService } from '../services/user-notification.service.interface';
import { IUserRepository } from '../repositories/user.repo.interface';
import { IUserNotificationRepository } from '../repositories/user-notification.repo.interface';
import { UserNotification } from '../entities/user-notification.entity';

@Controller('user')
export class UserController {
  constructor(
    @Inject(IUserNotificationService)
    private readonly userNotificationService: IUserNotificationService,

    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(IUserNotificationRepository) private readonly userNotificationRepository: IUserNotificationRepository,
  ) {}

  @Post()
  async createUser(@Body() data: CreateUserDto): Promise<string> {
    await this.userNotificationService.createUser(data);
    return 'User created successfully';
  }
  @Get()
  async getAllUser(): Promise<User[]> {
    return await this.userRepository.findAllUsers();
  }
  @Get('/notification')
  async getNotifications(): Promise<UserNotification[]> {
    return await this.userNotificationRepository.findAllNotifications();
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: number): Promise<string> {
    await this.userNotificationService.deleteUser(id);
    return 'User deleted successfully';
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: any,
  ): Promise<{ updated: boolean }> {
    return this.userNotificationService.updateUser(+id, updateUserDto);
  }
}
