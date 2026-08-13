import { OmitType } from '@nestjs/swagger';

import { AdrRequest } from './adr.request.js';

export class AdrUpdateRequest extends OmitType(AdrRequest, ['id'] as const) {}
