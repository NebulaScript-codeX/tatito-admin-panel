import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../config/db.js'
import { config } from '../config/index.js'
import { seedAll } from './seedData.js'

// Drop every collection in the configured database, then seed fresh.
async function main() {
  await connectDb(config.mongoUri)
  try {
    await mongoose.connection.dropDatabase()
    const result = await seedAll()
    console.log(`[reset] database dropped + reseeded (${config.mongoUri})`)
    console.log(`[reset] doctors: ${result.doctorsInserted} new / reviews: ${result.reviewsInserted} / users: ${result.usersCreated.join(', ') || 'none'}`)
  } finally {
    await disconnectDb()
  }
}

main().catch((err) => {
  console.error('[reset] failed:', err.message)
  process.exit(1)
})