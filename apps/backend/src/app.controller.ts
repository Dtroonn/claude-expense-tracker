import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type HealthResponseDto } from '@expense-tracker/shared';
import { ZodResponse } from 'nestjs-zod';
import { HealthResponseDtoClass } from './dto/health-response.dto';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ZodResponse({ type: HealthResponseDtoClass })
  getHealth(): HealthResponseDto {
    return this.appService.getHealth();
  }
}
