import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor'], required: true },
    doctorId: { type: String, default: null },
  },
  { timestamps: true },
)

userSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10)
}

userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash)
}

userSchema.methods.safe = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    mobile: this.mobile || '',
    role: this.role,
    doctorId: this.doctorId || '',
  }
}

const User = mongoose.model('User', userSchema)
export default User