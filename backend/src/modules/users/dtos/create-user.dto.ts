import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

/**
 * Data Transfer Object for creating a new user.
 */
export class CreateUserDto {
  @ApiPropertyOptional({
    description: 'Full name of the user.',
    example: 'Jane Doe',
    maxLength: 64,
  })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MaxLength(64, { message: 'Name must be at most 64 characters long' })
  name: string;

  @ApiProperty({
    description: 'Email address of the user.',
    example: 'user@example.com',
    format: 'email',
  })
  @IsString({ message: 'Email must be a string' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Password for the account.',
    example: 'StrongP@ssw0rd!',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsStrongPassword(
    {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password is not strong enough. It must contain at least 8 characters, including uppercase, lowercase, numbers, and symbols.',
    },
  )
  password: string;
}
