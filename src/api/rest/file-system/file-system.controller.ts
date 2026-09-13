import { Body, Controller, Get, ParseBoolPipe, ParseIntPipe, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import type { FileSystemClient } from '../../../features/file-system/contracts/file-system-client.js';
import { FileSystemApiService } from '../../../features/file-system/file-system-api.service.js';
import { FileSystemBrowserAccessService } from '../../file-system/file-system-browser-access.service.js';
import { CreateFileSystemDirectoryRequest } from './model/create-file-system-directory.request.js';
import { FileSystemDirectoryResponse } from './model/file-system-directory.response.js';
import { FileSystemEntryResponse } from './model/file-system-entry.response.js';
import { FileSystemRootConnectionResponse } from './model/file-system-root-connection.response.js';

@ApiTags('Filesystem')
@Controller('file-system')
export class FileSystemController {
  private readonly filesystem: FileSystemClient;

  constructor(filesystem: FileSystemApiService, access: FileSystemBrowserAccessService) {
    this.filesystem = filesystem.withAccess(() => access.getContext());
  }

  @Get('roots')
  @ApiOperation({ operationId: 'getFileSystemRoots' })
  @ApiOkResponse({ type: FileSystemRootConnectionResponse })
  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  roots(
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
  ) {
    return this.filesystem.getRoots({
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
    });
  }

  @Get('entry')
  @ApiOperation({ operationId: 'getFileSystemEntry' })
  @ApiOkResponse({ type: FileSystemEntryResponse })
  entry(@Query('path') path: string) {
    return this.filesystem.getEntry({ path });
  }

  @Get('directory')
  @ApiOperation({ operationId: 'getFileSystemDirectory' })
  @ApiOkResponse({ type: FileSystemDirectoryResponse })
  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  @ApiQuery({ name: 'directoriesOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'includeHidden', required: false, type: Boolean })
  directory(
    @Query('path') path: string,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
    @Query('directoriesOnly', new ParseBoolPipe({ optional: true })) directoriesOnly?: boolean,
    @Query('includeHidden', new ParseBoolPipe({ optional: true })) includeHidden?: boolean,
  ) {
    return this.filesystem.getDirectory({
      path,
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
      ...(directoriesOnly === undefined ? {} : { directoriesOnly }),
      ...(includeHidden === undefined ? {} : { includeHidden }),
    });
  }

  @Post('directory')
  @ApiOperation({ operationId: 'createFileSystemDirectory' })
  @ApiCreatedResponse({ type: FileSystemEntryResponse })
  createDirectory(@Body() data: CreateFileSystemDirectoryRequest) {
    return this.filesystem.createDirectory({ parentPath: data?.parentPath, name: data?.name });
  }
}
