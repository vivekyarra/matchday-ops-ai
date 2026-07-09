import compression from 'compression'
import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZodError } from 'zod'
import { config } from './config'
import { buildSnapshot } from './services/analytics'
import { createDecisionSupport } from './services/aiDecisionService'
import { listRouteOptions, planRoute, RoutePlanningError } from './services/routePlanner'
import { DecisionRequestSchema, RouteRequestSchema } from '../shared/schemas'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 18,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          styleSrcElem: ["'self'"],
          styleSrcAttr: ["'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  )
  app.use(compression())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true)
          return
        }

        callback(new Error('Origin not allowed'))
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
    }),
  )
  app.use(express.json({ limit: '32kb' }))
  app.use('/api', apiLimiter)

  app.get('/api/health', (_request, response) => {
    response.json({
      ok: true,
      name: 'Matchday Ops AI',
      aiMode: config.geminiApiKey ? 'gemini' : 'demo-rules',
      timestamp: new Date().toISOString(),
    })
  })

  app.get('/api/stadium/snapshot', (_request, response) => {
    response.json(buildSnapshot())
  })

  app.get('/api/routes/options', (_request, response) => {
    response.json({ zones: listRouteOptions() })
  })

  app.post('/api/routes/plan', (request, response, next) => {
    try {
      const payload = RouteRequestSchema.parse(request.body)
      response.json(planRoute(payload))
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/operations/decision', aiLimiter, async (request, response, next) => {
    try {
      const payload = DecisionRequestSchema.parse(request.body)
      const snapshot = buildSnapshot()
      response.json(await createDecisionSupport(payload, snapshot))
    } catch (error) {
      next(error)
    }
  })

  serveClient(app)
  app.use(errorHandler)

  return app
}

function isAllowedOrigin(origin: string) {
  if (config.allowedOrigin && origin === config.allowedOrigin) {
    return true
  }

  return /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)
}

function serveClient(app: express.Express) {
  const clientDist = path.resolve(__dirname, '../../dist')

  if (!existsSync(clientDist)) {
    return
  }

  app.use(express.static(clientDist, { fallthrough: true }))
  app.use((request, response, next) => {
    if (request.method === 'GET' && request.accepts('html')) {
      response.sendFile(path.join(clientDist, 'index.html'))
      return
    }

    next()
  })
}

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'Invalid request',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  const status = error instanceof RoutePlanningError ? 400 : 500

  response.status(status).json({
    error: status === 400 ? error.message : 'Internal server error',
  })
}
