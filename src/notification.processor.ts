import { Injectable, Inject } from '@nestjs/common';
import { Process } from '@nestjs/bull';
import { Job } from 'bull';
import { IUserNotificationRepository } from './modules/user/repositories/user-notification.repo.interface';
import axios from 'axios';

@Injectable()
export class NotificationProcessor {
  constructor(
    @Inject(IUserNotificationRepository)
    private readonly notificationService: IUserNotificationRepository,
  ) {}

  @Process('send-notification')
  async handleSendNotification(
    job: Job<{ notificationId: number }>,
  ): Promise<void> {
    const notification = await this.notificationService.findById(
      job.data.notificationId,
    );

    if (notification) {
      try {
        await axios.post(
          'https://email-service.digitalenvision.com.au/send-email',
          {
            email: `${notification.user}`,
            message: `Hey, it's your birthday!`,
          },
        );

        await this.notificationService.updateNotificationStatus(
          notification.id,
          'sent',
        );
        console.log(
          `Notification sent successfully for notification ID ${notification.id}`,
        );
      } catch (error) {
        console.error(
          `Failed to send notification ID ${notification.id}:`,
          error.message,
        );

        await this.notificationService.updateNotificationStatus(
          notification.id,
          'failed',
        );

        throw error; // Trigger retry in BullMQ
      }
    }
  }
}
