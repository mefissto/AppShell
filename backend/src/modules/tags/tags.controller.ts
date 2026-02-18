import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '@decorators/current-user.decorator';
import { UserEntity } from '@modules/users/entities/user.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagEntity } from './entities/tag.entity';
import { TagsService } from './tags.service';

@ApiTags('Tags')
@ApiCookieAuth('Authentication')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tags' })
  @ApiOkResponse({
    description: 'List of tags',
    type: TagEntity,
    isArray: true,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll(@CurrentUser() user: UserEntity): Promise<TagEntity[]> {
    return this.tagsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tag by ID' })
  @ApiOkResponse({ description: 'Tag details', type: TagEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Tag not found.' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<TagEntity> {
    return this.tagsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tag' })
  @ApiCreatedResponse({
    description: 'Tag created successfully',
    type: TagEntity,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  create(
    @Body() createTagDto: CreateTagDto,
    @CurrentUser() user: UserEntity,
  ): Promise<TagEntity> {
    return this.tagsService.create(createTagDto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tag by ID' })
  @ApiOkResponse({ description: 'Tag updated successfully', type: TagEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Tag not found.' })
  update(
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
    @CurrentUser() user: UserEntity,
  ): Promise<TagEntity> {
    return this.tagsService.update(id, updateTagDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag by ID' })
  @ApiNoContentResponse({ description: 'Tag deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Tag not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<void> {
    return this.tagsService.remove(id, user.id);
  }
}
