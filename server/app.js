import express from 'express'
import cors from 'cors'
import { config } from './config/index.js'
import authRoutes from './routes/auth.js'
import doctorRoutes from './routes/doctors.js'
import { notFoundHandler, errorHandler } from './middleware/error.js'

export function createApp() {
  const app = express()
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }))
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => res.json({ ok: true }))

  app.use('/api/auth', authRoutes)
  app.use('/api/doctors', doctorRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}