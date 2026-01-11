import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
  email: string;

  @ApiProperty({
    description: 'Password for the account.',
    example: 'StrongP@ssw0rd!',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
