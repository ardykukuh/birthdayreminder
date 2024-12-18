import { UserNotification } from '../entities/user-notification.entity';
/**
 * Interface for user notification repository.
 */
export interface IUserNotificationRepository {
  /**
   * Creates a new user notification.
   *
   * @param notificationData - The data for the new notification.
   * @returns A promise that resolves to the created user notification.
   */
  createNotification(
    notificationData: Partial<UserNotification>,
  ): Promise<UserNotification>;

  /**
   * Finds all unsent user notifications created since a given moment.
   *
   * @param since - The moment to check for unsent notifications.
   * @returns A promise that resolves to an array of unsent user notifications.
   */
  findUnsentSince(since: moment.Moment): Promise<UserNotification[]>;

  /**
   * Updates the status of a user notification.
   *
   * @param id - The ID of the notification to update.
   * @param status - The new status of the notification.
   * @returns A promise that resolves when the status is updated.
   */
  updateNotificationStatus(
    id: number,
    status: 'pending' | 'sent' | 'failed',
  ): Promise<void>;

  /**
   * Finds a user notification by its ID.
   *
   * @param id - The ID of the notification to find.
   * @returns A promise that resolves to the found user notification or null if not found.
   */
  findById(id: number): Promise<UserNotification | null>;

  /**
   * Deletes a notification based on the provided data.
   * @param notificationData Partial notification data to match the deletion criteria.
   * @returns {Promise<void>} Promise that resolves once the notification is deleted.
   */
  deleteNotification(
    notificationData: Partial<UserNotification>,
  ): Promise<void>;

  findAllNotifications(): Promise<UserNotification[]>;
  findByUserId(userId: number): Promise<UserNotification | null>;
  updateNotification(
    id: number,
    notificationData: Partial<UserNotification>,
  ): Promise<void>;
}

export const IUserNotificationRepository = Symbol(
  'IUserNotificationRepository',
);
