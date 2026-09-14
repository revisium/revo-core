import { ApiProperty } from '@nestjs/swagger';

export class CreateFileSystemDirectoryRequest {
  @ApiProperty()
  parentPath: string;

  @ApiProperty()
  name: string;
}
