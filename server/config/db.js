import mongoose from 'mongoose'

export async function connectDb(uri) {
  mongoose.set('strictQuery', true)
  await mongoose.connect(uri)
  return mongoose
}

export async function disconnectDb() {
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
}