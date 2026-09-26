import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tatito_health',
  jwtSecret: process.env.JWT_SECRET || 'tatito-dev-secret-change-me',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  env: process.env.NODE_ENV || 'development',
}