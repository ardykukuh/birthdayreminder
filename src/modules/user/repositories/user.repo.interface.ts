import { User } from '../entities/user.entity';
/**
 * Interface for user repository operations.
 */
export interface IUserRepository {
  /**
   * Retrieves all users from the repository.
   *
   * @returns A promise that resolves to an array of User objects.
   */
  findAllUsers(): Promise<User[]>;

  /**
   * Creates a new user in the repository.
   *
   * @param data - Partial User object containing the user's information.
   * @returns A promise that resolves to the newly created User object.
   */
  createUser(data: Partial<User>): Promise<User>;

  updateUser(id, data: Partial<User>): Promise<void>;

  /**
   * Deletes a user from the repository by their unique identifier.
   *
   * @param id - The unique identifier of the user to delete.
   * @returns A promise that resolves when the user is deleted.
   */
  deleteUser(id: number): Promise<void>;

  /**
   * Retrieves a user from the repository by their unique identifier.
   *
   * @param id - The unique identifier of the user to retrieve.
   * @returns A promise that resolves to the User object if found, or null if not found.
   */
  findById(id: number): Promise<User | null>;
}

export const IUserRepository = Symbol('IUserRepository');
