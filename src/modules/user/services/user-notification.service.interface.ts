import { CreateUserDto } from '../dtos/create-user.dto';

export interface IUserNotificationService {
  /**
   * Creates a new user and notification based on the provided user data.
   *
   * @param req - The user data to create the notification for.
   * @returns A promise that resolves when the notification is created successfully.
   */
  createUser(req: CreateUserDto): Promise<void>;
  updateUser(id: number, updateUserDto: any): Promise<{ updated: boolean }>;
  /**
   * Recovers unsent messages that failed to be sent during the initial notification creation.
   *
   * @returns A promise that resolves when all unsent messages have been recovered and sent successfully.
   */
  recoverUnsentMessages(): Promise<void>;
  /**
   * Deletes a user by its ID.
   *
   * @param id - The ID of the user to delete.
   * @returns A promise that resolves when the user is deleted successfully.
   */
  deleteUser(id: number): Promise<void>;
}

export const IUserNotificationService = Symbol('IUserNotificationService');
