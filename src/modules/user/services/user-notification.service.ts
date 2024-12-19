import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import * as moment from 'moment-timezone';
import { scheduleBirthdayNotifications } from '../../../common/utils';
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
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  // Method to create birthday notifications at 9 AM local time for each user
  async createUser(data: CreateUserDto): Promise<void> {
    try {
      const user = await this.userRepository.createUser(data);
      const util = await scheduleBirthdayNotifications(user);
      // Create a pending notification for the scheduled time
      await this.notificationRepository.createNotification({
        user: user,
        type: 'birthday',
        status: 'pending',
        scheduledAt: util.scheduleAt,
      });
      await this.recoverUnsentMessages();

      console.log(
        `Scheduled birthday notification for ${user.firstName} at ${util.scheduleFormat}`,
      );
    } catch (error) {
      console.error('Error creating User:', error.message);
      throw new BadRequestException(
        error.message || 'Failed to process create User',
      );
    }
  }

  async updateUser(
    id: number,
    updateUserDto: any,
  ): Promise<{ updated: boolean }> {
    try {
      await this.userRepository.updateUser(id, updateUserDto);

      const updatedUser = await this.userRepository.findById(id);
      const notification = await this.notificationRepository.findByUserId(id);

      if (updatedUser) {
        const util = await scheduleBirthdayNotifications(updatedUser);
        // Update a pending notification for the scheduled time
        await this.notificationRepository.updateScheduleNotification(
          notification.id,
          util.scheduleAt,
        );
        await this.recoverUnsentMessages();

        console.log(
          `Updated user notification for ${updatedUser.firstName} at ${util.scheduleFormat}`,
        );
      }

      return { updated: true };
    } catch (error) {
      console.error('Error updating User:', error.message);
      throw new BadRequestException(
        error.message || 'Failed to process update User',
      );
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
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
    try {
      const past24Hours = moment().subtract(24, 'hours'); // Customize the duration as needed
      const unsentNotifications =
        await this.notificationRepository.findUnsentSince(past24Hours);

      for (const notification of unsentNotifications) {
        const delay = Math.max(
          0,
          moment(notification.scheduledAt).diff(moment()),
        );

        console.log(`Re-queueing notification ID ${notification.id}...`, delay);

        // Check if a job with this ID already exists
        const existingJob = await this.notificationQueue.getJob(
          `notification-${notification.id}`,
        );

        if (existingJob) {
          console.log(
            `Removing existing job for notification ID ${notification.id}`,
          );
          await existingJob.remove(); // Remove the existing job from the queue
        }
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
    } catch (error) {
      console.error('Error recovering Unsent Messages:', error.message);
      throw new BadRequestException(
        error.message || 'Failed to process recoverUnsentMessages',
      );
    }
  }
}
