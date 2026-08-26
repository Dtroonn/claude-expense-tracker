import { Controller, Get } from '@nestjs/common';
import { type HealthResponse } from '@expense-tracker/shared';
import { type AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
