import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { IUserRepository } from '../repositories/user.repo.interface';
import { IUserNotificationService } from './user-notification.service.interface';
import { CreateUserDto } from '../dtos/create-user.dto';
import { IUserNotificationRepository } from '../repositories/user-notification.repo.interface';

@Injectable()
export class UserNotificationService implements IUserNotificationService {
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly notificationRepository: IUserNotificationRepository,
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @InjectQueue('notification') private notificationQueue: Queue,
  ) {}

  // Method to create birthday notifications at 9 AM local time for each user
  async createUser(data: CreateUserDto): Promise<void> {
    const user = await this.userRepository.createUser(data);
    // const users = await this.userRepository.findAllUsers();
    const currentYear = moment().year();

    // for (const user of users) {
    const userBirthday = moment(user.birthday).year(currentYear);
    // Schedule for 9 AM in the user's timezone
    const userTimezone = user.timezone;
    const notificationTime = userBirthday
      .tz(userTimezone)
      .set({ hour: 9, minute: 0, second: 0 });

    // If the birthday has passed for this year, schedule for next year
    if (notificationTime.isBefore(moment())) {
      notificationTime.add(1, 'year');
    }

    // Create a pending notification for the scheduled time
    await this.notificationRepository.createNotification({
      user: user,
      type: 'birthday',
      status: 'pending',
      scheduledAt: notificationTime.toDate(),
    });
    await this.recoverUnsentMessages();

    console.log(
      `Scheduled birthday notification for ${user.firstName} at ${notificationTime.format()}`,
    );
  }

  async updateUser(
    id: number,
    updateUserDto: any,
  ): Promise<{ updated: boolean }> {
    await this.userRepository.updateUser(id, updateUserDto);

    const updatedUser = await this.userRepository.findById(id);

    if (updatedUser) {
      // const users = await this.userRepository.findAllUsers();
      const currentYear = moment().year();

      // for (const user of users) {
      const userBirthday = moment(updatedUser.birthday).year(currentYear);
      // Schedule for 9 AM in the user's timezone
      const userTimezone = updatedUser.timezone;
      const notificationTime = userBirthday
        .tz(userTimezone)
        .set({ hour: 9, minute: 0, second: 0 });

      // If the birthday has passed for this year, schedule for next year
      if (notificationTime.isBefore(moment())) {
        notificationTime.add(1, 'year');
      }
      console.log('aa', notificationTime.toDate());

      // Update a pending notification for the scheduled time
      await this.notificationRepository.updateNotification(id, {
        user: updatedUser,
        type: 'birthday',
        status: 'pending',
        scheduledAt: notificationTime.toDate(),
      });
      await this.recoverUnsentMessages();

      console.log(
        `Updated user notification for ${updatedUser.firstName} at ${notificationTime.format()}`,
      );
    }

    return { updated: true };
  }

  async deleteUser(id: number): Promise<void> {
    try {
      const user = await this.userRepository.findById(id);
      await this.notificationRepository.deleteNotification({
        user: user,
      });
      await this.userRepository.deleteUser(id);
    } catch (error) {
      console.error('Error processing User:', error.message);
      throw new BadRequestException(
        error.message || 'Failed to process delete User',
      );
    }
  }
  async recoverUnsentMessages(): Promise<void> {
    const past24Hours = moment().subtract(24, 'hours'); // Customize the duration as needed
    const unsentNotifications =
      await this.notificationRepository.findUnsentSince(past24Hours);

    for (const notification of unsentNotifications) {
      const delay = Math.max(
        0,
        moment(notification.scheduledAt).diff(moment()),
      );

      console.log(`Re-queueing notification ID ${notification.id}...`);

      await this.notificationQueue.add(
        'send-notification',
        { notificationId: notification.id },
        {
          delay,
          jobId: `notification-${notification.id}`, // Ensures uniqueness by ID
        },
      );
      console.log(
        `Queued notification ID ${notification.id} with delay ${delay}ms`,
      );
    }
  }
}
