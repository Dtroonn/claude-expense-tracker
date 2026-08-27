import { Injectable } from '@nestjs/common';
import { type HealthResponseDto } from '@expense-tracker/shared';

@Injectable()
export class AppService {
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'expense-tracker-backend',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }
}
