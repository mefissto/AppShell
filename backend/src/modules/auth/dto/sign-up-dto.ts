import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Data Transfer Object for user sign-up.
 */
export class SignUpDto {
  @ApiProperty({ description: 'Full name of the user.', example: 'Jane Doe' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Email address of the user.',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @ApiProperty({
    description: 'Password for the new account.',
    example: 'StrongP@ssw0rd!',
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
