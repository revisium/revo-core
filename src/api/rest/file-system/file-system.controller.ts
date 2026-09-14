import { Body, Controller, Get, ParseBoolPipe, ParseIntPipe, Post, Query } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { FileSystemApiService } from '../../../features/file-system/file-system-api.service.js';
import { FileSystemBrowserAccessService } from '../../file-system/file-system-browser-access.service.js';
import { CreateFileSystemDirectoryRequest } from './model/create-file-system-directory.request.js';
import { FileSystemDirectoryResponse } from './model/file-system-directory.response.js';
import { FileSystemEntryResponse } from './model/file-system-entry.response.js';
import { FileSystemRootConnectionResponse } from './model/file-system-root-connection.response.js';

@ApiTags('Filesystem')
@Controller('file-system')
export class FileSystemController {
  constructor(
    private readonly filesystem: FileSystemApiService,
    private readonly access: FileSystemBrowserAccessService,
  ) {}

  @Get('roots')
  @ApiOperation({ operationId: 'getFileSystemRoots' })
  @ApiOkResponse({ type: FileSystemRootConnectionResponse })
  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  async roots(
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
  ) {
    return this.filesystem.getRoots(
      {
        ...(first === undefined ? {} : { first }),
        ...(after === undefined ? {} : { after }),
      },
      await this.access.getContext(),
    );
  }

  @Get('entry')
  @ApiOperation({ operationId: 'getFileSystemEntry' })
  @ApiOkResponse({ type: FileSystemEntryResponse })
  async entry(@Query('path') path: string) {
    return this.filesystem.getEntry({ path }, await this.access.getContext());
  }

  @Get('directory')
  @ApiOperation({ operationId: 'getFileSystemDirectory' })
  @ApiOkResponse({ type: FileSystemDirectoryResponse })
  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  @ApiQuery({ name: 'directoriesOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'includeHidden', required: false, type: Boolean })
  async directory(
    @Query('path') path: string,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
    @Query('directoriesOnly', new ParseBoolPipe({ optional: true })) directoriesOnly?: boolean,
    @Query('includeHidden', new ParseBoolPipe({ optional: true })) includeHidden?: boolean,
  ) {
    return this.filesystem.getDirectory(
      {
        path,
        ...(first === undefined ? {} : { first }),
        ...(after === undefined ? {} : { after }),
        ...(directoriesOnly === undefined ? {} : { directoriesOnly }),
        ...(includeHidden === undefined ? {} : { includeHidden }),
      },
      await this.access.getContext(),
    );
  }

  @Post('directory')
  @ApiOperation({ operationId: 'createFileSystemDirectory' })
  @ApiCreatedResponse({ type: FileSystemEntryResponse })
  async createDirectory(@Body() data: CreateFileSystemDirectoryRequest) {
    return this.filesystem.createDirectory(
      { parentPath: data?.parentPath, name: data?.name },
      await this.access.getContext(),
    );
  }
}
