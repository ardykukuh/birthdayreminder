import { Injectable, Inject } from '@nestjs/common';
import { Process } from '@nestjs/bull';
import { Job } from 'bull';
import { IUserNotificationRepository } from './modules/user/repositories/user-notification.repo.interface';
import axios from 'axios';
import { IUserRepository } from './modules/user/repositories/user.repo.interface';
import { scheduleBirthdayNotifications } from './common/utils';

@Injectable()
export class NotificationProcessor {
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly notificationRepository: IUserNotificationRepository,
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  @Process('send-notification')
  async handleSendNotification(
    job: Job<{ notificationId: number }>,
  ): Promise<void> {
    const notification = await this.notificationRepository.findById(
      job.data.notificationId,
    );
    const user = await this.userRepository.findById(notification.userId);

    if (notification) {
      try {
        await axios.post(
          'https://email-service.digitalenvision.com.au/send-email',
          {
            email: `${notification.user}`,
            message: `Hey, it's your birthday!`,
          },
        );

        await this.notificationRepository.updateNotificationStatus(
          notification.id,
          'sent',
        );
        const util = await scheduleBirthdayNotifications(user);
        await this.notificationRepository.createNotification({
          user: user,
          type: 'birthday',
          status: 'pending',
          scheduledAt: util.scheduleAt,
        });
        console.log(
          `Notification sent successfully for notification ID ${notification.id} and scheduled for next year`,
        );
      } catch (error) {
        console.error(
          `Failed to send notification ID ${notification.id}:`,
          error.message,
        );

        await this.notificationRepository.updateNotificationStatus(
          notification.id,
          'failed',
        );

        throw error; // Trigger retry in BullMQ
      }
    }
  }
}
