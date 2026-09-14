import { BadRequestException } from '@nestjs/common';

export function policyName(value: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    throw new BadRequestException(
      'Filesystem policy name must contain between 1 and 200 characters.',
    );
  }

  return value.trim();
}
