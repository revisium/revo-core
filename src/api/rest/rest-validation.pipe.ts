import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export const restValidationPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  exceptionFactory: (errors) => new BadRequestException(firstConstraintMessage(errors)),
});

function firstConstraintMessage(errors: ValidationError[]): string {
  const [error] = errors;
  if (error === undefined) {
    return 'Request is invalid.';
  }

  const constraintMessages =
    error.constraints === undefined ? [] : Object.values(error.constraints);
  const [message] = constraintMessages;
  if (message !== undefined) {
    return message;
  }
  if (error.children !== undefined && error.children.length > 0) {
    return firstConstraintMessage(error.children);
  }

  return 'Request is invalid.';
}
