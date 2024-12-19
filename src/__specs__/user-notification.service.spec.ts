import { Test, TestingModule } from '@nestjs/testing';
import { UserNotificationService } from '../modules/user/services/user-notification.service';
import { IUserRepository } from '../modules/user/repositories/user.repo.interface';
import { IUserNotificationRepository } from '../modules/user/repositories/user-notification.repo.interface';
import { CreateUserDto } from '../modules/user/dtos/create-user.dto';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { BadRequestException } from '@nestjs/common';
import { scheduleBirthdayNotifications } from '../common/utils';
import * as moment from 'moment-timezone';
import { UserNotification } from '../modules/user/entities/user-notification.entity';

// Mock external services and classes
jest.mock('../common/utils', () => ({
  scheduleBirthdayNotifications: jest.fn(),
}));

jest.mock('bull', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    getJob: jest.fn(),
    add: jest.fn(),
  })),
}));

describe('UserNotificationService', () => {
  let service: UserNotificationService;
  let userRepoMock: jest.Mocked<IUserRepository>;
  let notificationRepoMock: jest.Mocked<IUserNotificationRepository>;
  let notificationQueueMock: jest.Mocked<Queue>;

  beforeEach(async () => {
    userRepoMock = {
      createUser: jest.fn(),
      updateUser: jest.fn(),
      findById: jest.fn(),
      deleteUser: jest.fn(),
    } as unknown as jest.Mocked<IUserRepository>;

    notificationRepoMock = {
      createNotification: jest.fn(),
      updateScheduleNotification: jest.fn(),
      findUnsentSince: jest.fn().mockResolvedValue([
        {
          id: 1,
          userId: 123,
          user: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            birthday: new Date('1991-12-19'),
            timezone: 'Asia/Jakarta',
          },
          type: 'birthday',
          status: 'pending',
          scheduledAt: moment().subtract(1, 'hour').toDate(),
          createdAt: new Date(),
        },
      ]),
      deleteNotification: jest.fn(),
      findByUserId: jest.fn(),
    } as unknown as jest.Mocked<IUserNotificationRepository>;
    notificationQueueMock = {
      getJob: jest.fn(),
      add: jest.fn(),
    } as unknown as jest.Mocked<Queue>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserNotificationService,
        { provide: IUserRepository, useValue: userRepoMock },
        {
          provide: IUserNotificationRepository,
          useValue: notificationRepoMock,
        },
        // {
        //   provide: InjectQueue('notifications'),
        //   useValue: notificationQueueMock,
        // },
        {
          provide: 'BullQueue_notifications',
          useValue: notificationQueueMock, // Provide the mock queue
        },
      ],
    }).compile();

    service = module.get<UserNotificationService>(UserNotificationService);
  });

  it('[POSITIVE] should create a user and schedule a birthday notification', async () => {
    // Arrange
    const createUserDto: CreateUserDto = {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      birthday: new Date('1991-12-19'),
      timezone: 'Asia/Jakarta',
    };
    const user = {
      id: 1,
      ...createUserDto,
      updatedAt: new Date(),
    };
    const util = {
      scheduleAt: moment().add(1, 'days').toDate(),
      scheduleFormat: 'tomorrow at 9 AM',
    };
    const mockUserNotification = {
      id: 1,
      userId: 123,
      user: user,
      type: 'birthday',
      status: 'pending',
      scheduledAt: new Date(),
      createdAt: new Date(),
    };
    const mockJob = {
      id: 'send-notification', // Or any unique identifier you want to use
      data: { notificationId: 123 },
      progress: jest.fn(),
    };
    userRepoMock.createUser.mockResolvedValue(user);
    (scheduleBirthdayNotifications as jest.Mock).mockResolvedValue(util);
    notificationRepoMock.createNotification.mockResolvedValue(
      mockUserNotification,
    );
    notificationQueueMock.add.mockResolvedValue(mockJob as unknown as Job<any>);

    // Act
    await service.createUser(createUserDto);

    // Assert
    expect(userRepoMock.createUser).toHaveBeenCalledWith(createUserDto);
    expect(notificationRepoMock.createNotification).toHaveBeenCalledWith({
      user: user,
      type: 'birthday',
      status: 'pending',
      scheduledAt: util.scheduleAt,
    });
    expect(notificationQueueMock.add).toHaveBeenCalledWith(
      'send-notification',
      { notificationId: expect.any(Number) },
      expect.any(Object),
    );
  });

  it('[POSITIVE] should update a user and update their birthday notification', async () => {
    // Arrange
    const updateUserDto = {
      firstName: 'John 2',
      lastName: 'Doe 2',
      email: 'john.doe@example.com',
      birthday: new Date('1991-12-19'),
      timezone: 'Asia/Jakarta',
    };
    const updatedUser = { id: 1, ...updateUserDto, updatedAt: new Date() };
    const existingNotification = {
      id: 1,
      userId: 1,
      user: updatedUser,
      type: 'birthday',
      status: 'pending',
      scheduledAt: new Date(),
      createdAt: new Date(),
    };

    const util = {
      scheduleAt: moment().add(1, 'days').toDate(),
      scheduleFormat: 'tomorrow at 9 AM',
    };

    userRepoMock.updateUser.mockResolvedValue();
    userRepoMock.findById.mockResolvedValue(updatedUser);
    notificationRepoMock.findByUserId.mockResolvedValue(existingNotification);
    (scheduleBirthdayNotifications as jest.Mock).mockResolvedValue(util);
    notificationRepoMock.updateScheduleNotification.mockResolvedValue();

    // Act
    const result = await service.updateUser(1, updateUserDto);

    // Assert
    expect(result.updated).toBe(true);
    expect(
      notificationRepoMock.updateScheduleNotification,
    ).toHaveBeenCalledWith(existingNotification.id, util.scheduleAt);
  });

  it('[POSITIVE] should handle deleteUser properly', async () => {
    // Arrange
    const userId = 1;
    const user = {
      id: userId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      birthday: new Date('1991-12-19'),
      timezone: 'Asia/Jakarta',
      updatedAt: new Date(),
    };

    userRepoMock.findById.mockResolvedValue(user);
    notificationRepoMock.deleteNotification.mockResolvedValue();
    userRepoMock.deleteUser.mockResolvedValue();

    // Act
    await service.deleteUser(userId);

    // Assert
    expect(userRepoMock.deleteUser).toHaveBeenCalledWith(userId);
    expect(notificationRepoMock.deleteNotification).toHaveBeenCalledWith({
      user,
    });
  });

  it('[NEGATIVE] should throw BadRequestException in deleteUser if something fails', async () => {
    // Mocking the repository method to simulate an error, e.g., user not found
    jest.spyOn(userRepoMock, 'findById').mockResolvedValue(null); // Simulate the user not found scenario

    // Mock other repository methods if necessary (e.g., for 'deleteNotification' and 'deleteUser')
    jest
      .spyOn(notificationRepoMock, 'deleteNotification')
      .mockResolvedValue(undefined); // Mock as success
    jest.spyOn(userRepoMock, 'deleteUser').mockResolvedValue(undefined); // Mock delete success

    const userService = new UserNotificationService(
      notificationRepoMock, // Correctly use the notificationRepoMock
      userRepoMock,
      notificationQueueMock,
    );

    // Check that calling deleteUser throws a BadRequestException
    await expect(userService.deleteUser(1)).rejects.toThrowError(
      BadRequestException,
    );
  });

  it('[NEGATIVE] should recover unsent messages', async () => {
    // Arrange
    const user = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      birthday: new Date('1991-12-19'),
      timezone: 'Asia/Jakarta',
    };
    const unsentNotifications = [
      {
        id: 1,
        userId: 123,
        user: user,
        type: 'birthday',
        status: 'pending',
        scheduledAt: moment().subtract(1, 'hour').toDate(),
        createdAt: new Date(),
      },
    ];

    const mockJob = {
      id: 'send-notification', // Or any unique identifier you want to use
      data: { notificationId: 123 },
      progress: jest.fn(),
    };
    notificationRepoMock.findUnsentSince.mockResolvedValue(
      unsentNotifications as UserNotification[],
    );
    notificationQueueMock.getJob.mockResolvedValue(null); // Simulating no existing job
    notificationQueueMock.add.mockResolvedValue(mockJob as unknown as Job<any>);

    // Act
    await service.recoverUnsentMessages();

    // Assert
    expect(notificationQueueMock.add).toHaveBeenCalled();
  });
});
