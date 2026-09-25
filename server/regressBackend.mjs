// Regress harness backend: boots an isolated API instance on a dedicated DB,
// reset + seeds fresh data, and listens so the browser regression can exercise
// the real auth/fees/reviews flows. Env (MONGO_URI, PORT) is provided by the
// harness before this module loads (config reads env at import time).
import { connectDb } from './config/db.js'
import { createApp } from './app.js'
import User from './models/User.js'
import Review from './models/Review.js'
import { seedDoctors, seedReviews, seedUsers } from './seed/seedData.js'

const PORT = Number(process.env.PORT) || 5000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tatito_health_regress_test'

await connectDb(MONGO_URI)
await User.deleteMany({})
await Review.deleteMany({})
const doctorsInserted = await seedDoctors()
const reviewsInserted = await seedReviews()
const usersCreated = await seedUsers()

const app = createApp()
app.listen(PORT, () => {
  console.log(
    `[regress-backend] ready on :${PORT} (doctors ${doctorsInserted} new, reviews ${reviewsInserted}, users ${usersCreated.join(', ')})`,
  )
})