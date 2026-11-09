import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LoggerModule } from 'nestjs-pino'

import { parseEnv } from '#src/config/index.ts'
import type { Env } from '#src/config/index.ts'
import { HealthModule } from '#src/health/index.ts'

@Module({
  imports: [
    // Node loads `.env` in development (`--env-file-if-exists`); the app reads only the process environment.
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validate: parseEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: { level: config.get('LOG_LEVEL', { infer: true }) },
      }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
