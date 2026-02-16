import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @IsString({ message: 'Project name must be a string' })
  @IsNotEmpty({ message: 'Project name is required' })
  @MinLength(3, { message: 'Project name must be at least 3 characters long' })
  @MaxLength(255, {
    message: 'Project name must be at most 255 characters long',
  })
  name: string;

  @IsString({ message: 'Project description must be a string' })
  @MaxLength(1000, {
    message: 'Project description must be at most 1000 characters long',
  })
  @IsOptional()
  description?: string;
}
