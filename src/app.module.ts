import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { UserNotificationService } from './modules/user/services/user-notification.service';
import { UserController } from './modules/user/controllers/user.controller';
import { User } from './modules/user/entities/user.entity';
import { UserNotification } from './modules/user/entities/user-notification.entity';
import { UserRepository } from './modules/user/repositories/user.repo';
import { UserNotificationRepository } from './modules/user/repositories/user-notification.repo';
import { IUserRepository } from './modules/user/repositories/user.repo.interface';
import { IUserNotificationService } from './modules/user/services/user-notification.service.interface';
import { IUserNotificationRepository } from './modules/user/repositories/user-notification.repo.interface';
import { NotificationProcessor } from './notification.processor';

@Module({
  imports: [
    // ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data.sqlite',
      entities: [__dirname + '/**/*.entity.{ts,js}'],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, UserNotification]),
    BullModule.forRoot({
      redis: {
        host: 'localhost',
        port: 6379,
        password: 'redis',
      },
    }),
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [UserController],
  providers: [
    NotificationProcessor,
    {
      provide: IUserNotificationService,
      useClass: UserNotificationService,
    },
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    {
      provide: IUserNotificationRepository,
      useClass: UserNotificationRepository,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Inject(IUserNotificationService)
    private readonly notificationService: IUserNotificationService,
  ) {}

  async onModuleInit() {
    console.log('Recovering unsent notifications...');
    await this.notificationService.recoverUnsentMessages();
  }
}
