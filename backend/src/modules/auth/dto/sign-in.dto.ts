import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Data Transfer Object for user sign-in.
 */
export class SignInDto {
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
    description: 'The password of the user.',
    example: 'StrongP@ssw0rd!',
    required: true,
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}
