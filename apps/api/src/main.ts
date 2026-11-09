import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { Logger } from 'nestjs-pino'

import { AppModule } from '#src/app.module.ts'
import type { Env } from '#src/config/index.ts'

const app = await NestFactory.create(AppModule, { bufferLogs: true })
app.useLogger(app.get(Logger))
app.setGlobalPrefix('api/v1')
app.enableShutdownHooks()

const config = app.get<ConfigService<Env, true>>(ConfigService)
app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }), credentials: true })
await app.listen(config.get('PORT', { infer: true }), config.get('HOST', { infer: true }))
