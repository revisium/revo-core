import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { FileSystemEntryModel } from './file-system-entry.model.js';

@ObjectType()
export class FileSystemEntryConnectionModel extends Paginated(FileSystemEntryModel) {}
