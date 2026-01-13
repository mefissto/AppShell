import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Data Transfer Object for user email verification.
 */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'The email address of the user.',
    example: 'user@example.com',
    required: true,
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'The email verification token.',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    required: true,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(32)
  token: string;
}
