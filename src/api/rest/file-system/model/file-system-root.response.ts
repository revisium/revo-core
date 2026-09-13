import { ApiProperty } from '@nestjs/swagger';

import { FileSystemRootType } from '../../../../features/file-system/contracts/file-system.contracts.js';

export class FileSystemRootResponse {
  @ApiProperty({ type: () => String })
  name: string;

  @ApiProperty({ type: () => String })
  path: string;

  @ApiProperty({ enum: FileSystemRootType, enumName: 'FileSystemRootType' })
  type: FileSystemRootType;
}
