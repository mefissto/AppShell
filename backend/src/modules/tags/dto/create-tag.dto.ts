import {
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateTagDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  name: string;

  @IsString()
  @IsOptional()
  color?: string;
}
