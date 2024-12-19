import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserNotification } from '../entities/user-notification.entity';
import { IUserNotificationRepository } from './user-notification.repo.interface';

@Injectable()
export class UserNotificationRepository implements IUserNotificationRepository {
  constructor(
    @InjectRepository(UserNotification)
    private userNotificationRepository: Repository<UserNotification>,
  ) {}

  async createNotification(
    notificationData: Partial<UserNotification>,
  ): Promise<UserNotification> {
    return this.userNotificationRepository.save(notificationData);
  }

  async findUnsentSince(since: moment.Moment): Promise<UserNotification[]> {
    return this.userNotificationRepository.find({
      where: [
        { status: 'pending', scheduledAt: MoreThan(since.toDate()) },
        { status: 'failed', scheduledAt: MoreThan(since.toDate()) },
      ],
    });
  }

  async updateNotificationStatus(
    id: number,
    status: 'pending' | 'sent' | 'failed',
  ): Promise<void> {
    await this.userNotificationRepository.update(id, { status });
  }

  async findById(id: number): Promise<UserNotification | null> {
    return this.userNotificationRepository.findOne({ where: { id } });
  }

  async findAllNotifications(): Promise<UserNotification[]> {
    return this.userNotificationRepository.find();
  }
  async updateScheduleNotification(
    id: number,
    scheduledAt: Date,
  ): Promise<void> {
    await this.userNotificationRepository.update(id, { scheduledAt });
  }
  async deleteNotification(
    notificationData: Partial<UserNotification>,
  ): Promise<void> {
    await this.userNotificationRepository.delete(notificationData);
  }
  async findByUserId(userId: number): Promise<UserNotification | null> {
    return this.userNotificationRepository.findOne({ where: { userId } });
  }
}
