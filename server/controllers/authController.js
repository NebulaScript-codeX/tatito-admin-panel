import User from '../models/User.js'
import Doctor from '../models/Doctor.js'
import { AppError } from '../middleware/error.js'
import { signToken } from '../middleware/auth.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PALETTE = ['teal', 'coral', 'navy', 'gold']

function initialsFromName(name) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'DT'
}

function doctorIdForNewProfile() {
  return `doc-${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36)}`
}

export async function register(req, res) {
  const { name, email, mobile, password, role, doctorId, specialty, city, photo } = req.body || {}

  if (!name || String(name).trim().length < 2) throw new AppError(400, 'Full name is required (minimum 2 characters).')
  if (!email || !EMAIL_RE.test(String(email))) throw new AppError(400, 'A valid email address is required.')
  if (!password || String(password).length < 8) throw new AppError(400, 'Password must be at least 8 characters.')
  if (role !== 'patient' && role !== 'doctor') throw new AppError(400, 'Role must be "patient" or "doctor".')

  const existing = await User.findOne({ email: String(email).toLowerCase() })
  if (existing) throw new AppError(409, 'An account with this email already exists.')

  const cleanName = String(name).trim()
  const cleanMobile = mobile ? String(mobile).trim() : ''

  let linkedDoctorId = null

  if (role === 'doctor') {
    if (doctorId) {
      const existingDoctor = await Doctor.findById(String(doctorId).trim())
      if (!existingDoctor) throw new AppError(404, 'The linked doctor profile was not found.')
      if (existingDoctor.owner) throw new AppError(409, 'This doctor profile is already linked to another account.')
      existingDoctor.owner = undefined // claimed below once user exists
      linkedDoctorId = existingDoctor._id
    } else {
      // Create a fresh doctor profile from the onboarding input.
      const doc = new Doctor({
        _id: doctorIdForNewProfile(),
        name: cleanName,
        specialty: (specialty && String(specialty).trim()) || 'General Physician',
        city: (city && String(city).trim()) || '',
        initials: initialsFromName(cleanName),
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        fee: 500,
        verified: false,
        photo: photo || '',
      })
      await doc.save()
      linkedDoctorId = doc._id
    }
  }

  const user = new User({
    name: cleanName,
    email: String(email).toLowerCase(),
    mobile: cleanMobile,
    role,
    doctorId: linkedDoctorId,
  })
  await user.setPassword(String(password))
  await user.save()

  if (linkedDoctorId) {
    await Doctor.findByIdAndUpdate(linkedDoctorId, { owner: user._id })
  }

  const token = signToken(user)
  const payload = user.safe()
  payload.doctorId = linkedDoctorId || ''
  res.status(201).json({ token, user: payload })
}

export async function login(req, res) {
  const { email, password } = req.body || {}
  if (!email || !password) throw new AppError(400, 'Email and password are required.')

  const user = await User.findOne({ email: String(email).toLowerCase() })
  if (!user) throw new AppError(401, 'Invalid email or password.')
  const ok = await user.verifyPassword(String(password))
  if (!ok) throw new AppError(401, 'Invalid email or password.')

  const token = signToken(user)
  const payload = user.safe()
  res.json({ token, user: payload })
}

export async function me(req, res) {
  const user = req.user
  const payload = user.safe()
  let doctor = null
  if (user.role === 'doctor' && user.doctorId) {
    const doc = await Doctor.findById(user.doctorId)
    if (doc) doctor = doc.toOwnerView()
  }
  res.json({ user: payload, doctor })
}