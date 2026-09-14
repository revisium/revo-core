import { ApiProperty } from '@nestjs/swagger';

import { FileSystemEntryType } from '../../../../features/file-system/contracts/file-system.contracts.js';

export class FileSystemEntryResponse {
  @ApiProperty({ type: () => String })
  name: string;

  @ApiProperty({ type: () => String })
  path: string;

  @ApiProperty({ enum: FileSystemEntryType, enumName: 'FileSystemEntryType' })
  type: FileSystemEntryType;

  @ApiProperty({ type: () => Boolean })
  isSymlink: boolean;
}
