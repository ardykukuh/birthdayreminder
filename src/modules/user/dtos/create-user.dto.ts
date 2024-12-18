import { IsDate, IsNotEmpty, IsString, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Type(() => Date) // Converts string input to a Date object
  @IsDate()
  @IsNotEmpty()
  birthday: Date;

  @IsString()
  @IsNotEmpty()
  timezone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;
}
