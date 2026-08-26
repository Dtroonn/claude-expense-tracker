import { Injectable } from '@nestjs/common';
import { type HealthResponse, healthResponseSchema } from '@expense-tracker/shared';

@Injectable()
export class AppService {
  /**
   * Built to satisfy the shared contract, then parsed through it so a drift
   * between backend and frontend fails here rather than in the browser.
   */
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'expense-tracker-backend',
      version: process.env.npm_package_version ?? '0.1.0',
      timestamp: new Date().toISOString(),
    });
  }
}
