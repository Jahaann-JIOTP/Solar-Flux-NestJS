import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getStatus(): string {
    return 'Solar Flux Backend is running perfectly fine!';
  }
}
