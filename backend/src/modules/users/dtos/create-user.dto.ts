import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Data Transfer Object for creating a new user.
 */
export class CreateUserDto {
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MaxLength(64, { message: 'Name must be at most 64 characters long' })
  name: string;

  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
