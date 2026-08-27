import { Controller, Get } from '@nestjs/common';
import { type HealthResponseDto } from '@expense-tracker/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import { HealthResponseDtoClass } from './dto/health-response.dto';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ZodSerializerDto(HealthResponseDtoClass)
  getHealth(): HealthResponseDto {
    return this.appService.getHealth();
  }
}
