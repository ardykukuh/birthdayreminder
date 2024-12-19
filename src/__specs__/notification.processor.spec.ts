import { Test, TestingModule } from '@nestjs/testing';
import { NotificationProcessor } from '../notification.processor';
import { IUserNotificationRepository } from '../modules/user/repositories/user-notification.repo.interface';
import { IUserRepository } from '../modules/user/repositories/user.repo.interface';
import { scheduleBirthdayNotifications } from '../common/utils';
import axios from 'axios';
import { Job } from 'bull';

// Mock external dependencies
jest.mock('axios');
jest.mock('../common/utils', () => ({
  scheduleBirthdayNotifications: jest.fn(),
}));

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;
  let notificationRepoMock: jest.Mocked<IUserNotificationRepository>;
  let userRepoMock: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    // Mock repositories
    notificationRepoMock = {
      findById: jest.fn(),
      updateNotificationStatus: jest.fn(),
      createNotification: jest.fn(),
    } as unknown as jest.Mocked<IUserNotificationRepository>;

    userRepoMock = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: IUserNotificationRepository,
          useValue: notificationRepoMock,
        },
        { provide: IUserRepository, useValue: userRepoMock },
      ],
    }).compile();

    processor = module.get<NotificationProcessor>(NotificationProcessor);
  });

  it('[POSITIVE] should send a notification and schedule the next one', async () => {
    // Arrange
    const notificationId = 1;
    const jobData = { notificationId };
    const job = { id: 'job-id', data: jobData } as Job<{
      notificationId: number;
    }>;

    const notification = { id: notificationId, userId: 1 } as any;
    const user = {
      id: 1,
      email: 'user@example.com',
      type: 'birthday',
      firstName: 'John',
      lastName: 'Doe',
      birthday: new Date('1991-12-19'),
      timezone: 'Asia/Jakarta',
      updatedAt: new Date(),
    };
    const scheduleAt = new Date();

    notificationRepoMock.findById.mockResolvedValue(notification);
    userRepoMock.findById.mockResolvedValue(user);
    (axios.post as jest.Mock).mockResolvedValue({ status: 200 });
    (scheduleBirthdayNotifications as jest.Mock).mockResolvedValue({
      scheduleAt,
    });

    // Act
    await processor.handleSendNotification(job);

    // Assert
    expect(notificationRepoMock.findById).toHaveBeenCalledWith(notificationId);
    expect(userRepoMock.findById).toHaveBeenCalledWith(notification.userId);
    expect(axios.post).toHaveBeenCalledWith(
      'https://email-service.digitalenvision.com.au/send-email',
      {
        email: user.email,
        message: `Hey ${user.firstName} ${user.lastName}, it's your birthday!`,
      },
    );
    expect(notificationRepoMock.updateNotificationStatus).toHaveBeenCalledWith(
      notification.id,
      'sent',
    );
    expect(notificationRepoMock.createNotification).toHaveBeenCalledWith({
      user: user,
      type: 'birthday',
      status: 'pending',
      scheduledAt: scheduleAt,
    });
  });

  it('[NEGATIVE] should mark notification as failed if sending fails', async () => {
    // Arrange
    const notificationId = 1;
    const jobData = { notificationId };
    const job = { id: 'job-id', data: jobData } as Job<{
      notificationId: number;
    }>;

    const notification = { id: notificationId, userId: 1 } as any;
    const user = {
      id: 1,
      email: 'user@example.com',
      type: 'birthday',
      firstName: 'John',
      lastName: 'Doe',
      birthday: new Date('1991-12-19'),
      timezone: 'Asia/Jakarta',
      updatedAt: new Date(),
    };

    notificationRepoMock.findById.mockResolvedValue(notification);
    userRepoMock.findById.mockResolvedValue(user);
    (axios.post as jest.Mock).mockRejectedValue(
      new Error('Failed to send email'),
    );

    // Act & Assert
    await expect(processor.handleSendNotification(job)).rejects.toThrowError(
      'Failed to send email',
    );

    expect(notificationRepoMock.findById).toHaveBeenCalledWith(notificationId);
    expect(userRepoMock.findById).toHaveBeenCalledWith(notification.userId);
    expect(notificationRepoMock.updateNotificationStatus).toHaveBeenCalledWith(
      notification.id,
      'failed',
    );
  });
});
