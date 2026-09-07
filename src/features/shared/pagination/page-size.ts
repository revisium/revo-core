import { BadRequestException } from '@nestjs/common';

const DEFAULT_PAGE_SIZE = 100;
const MAXIMUM_PAGE_SIZE = 100;

export const pageSize = (first: number | undefined): number => {
  const value = first ?? DEFAULT_PAGE_SIZE;
  if (!Number.isInteger(value) || value < 1 || value > MAXIMUM_PAGE_SIZE) {
    throw new BadRequestException('first must be an integer between 1 and 100.');
  }
  return value;
};
