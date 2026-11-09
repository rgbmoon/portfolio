import { Controller, Get } from '@nestjs/common'

import type { HealthResponse } from '@portfolio/contracts/health'

/** Reports that the api process serves HTTP requests. */
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return { status: 'ok', uptimeSeconds: process.uptime() }
  }
}
