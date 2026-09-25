import { createApp } from './app.js'
import { connectDb, disconnectDb } from './config/db.js'
import { config } from './config/index.js'

async function main() {
  await connectDb(config.mongoUri)
  const app = createApp()
  app.listen(config.port, () => {
    console.log(`[tatito] API ready on http://localhost:${config.port} (env=${config.env})`)
  })

  const shutdown = async () => {
    await disconnectDb()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[tatito] server failed to start:', err.message)
  process.exit(1)
})