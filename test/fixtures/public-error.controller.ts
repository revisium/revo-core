import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { publicErrorState } from './public-error-state.js';

@Controller('error-probe')
export class ErrorController {
  @Get()
  fail(): never {
    throw publicErrorState.failure;
  }

  @Post()
  body(): string {
    return 'ok';
  }

  @Get(':id')
  integer(@Param('id', ParseIntPipe) id: number): number {
    return id;
  }
}
