import 'dotenv/config'
import { connectDb, disconnectDb } from '../config/db.js'
import { config } from '../config/index.js'
import { seedAll } from './seedData.js'

async function main() {
  await connectDb(config.mongoUri)
  try {
    const result = await seedAll()
    console.log(`[seed] done -> doctors created/updated (${result.doctorsInserted} new), seed reviews (${result.reviewsInserted}), demo users (${result.usersCreated.join(', ') || 'none'})`)
    console.log(`[seed] database: ${config.mongoUri}`)
  } finally {
    await disconnectDb()
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err.message)
  process.exit(1)
})