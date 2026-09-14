import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { FileSystemRootModel } from './file-system-root.model.js';

@ObjectType()
export class FileSystemRootConnectionModel extends Paginated(FileSystemRootModel) {}
