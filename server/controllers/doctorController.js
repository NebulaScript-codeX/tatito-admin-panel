import Doctor from '../models/Doctor.js'
import Review from '../models/Review.js'
import { AppError } from '../middleware/error.js'

const EDITABLE = [
  'name',
  'specialty',
  'city',
  'detail',
  'location',
  'fee',
  'next',
  'type',
  'photo',
  'offerText',
  'initials',
  'color',
  'qualification',
  'experience',
]

// Request that carries an authenticated doctor must own the target profile.
async function ensureOwnership(req, id) {
  const doctor = await Doctor.findById(id)
  if (!doctor) throw new AppError(404, 'Doctor profile not found.')
  const user = req.user
  if (!user) throw new AppError(401, 'Authentication required.')
  if (
    user.role !== 'doctor' ||
    !doctor.owner ||
    doctor.owner.toString() !== user._id.toString()
  ) {
    throw new AppError(403, 'Forbidden: you can only manage your own doctor profile.')
  }
  return doctor
}

export function toDoctorResponse(doctor, includeFee) {
  const list = Array.isArray(doctor) ? doctor : [doctor]
  return list.map((d) => d.toPublic(includeFee))
}

export async function listDoctors(req, res) {
  const includeFee = Boolean(req.user)
  const doctors = await Doctor.find().sort({ _id: 1 })
  res.json(toDoctorResponse(doctors, includeFee))
}

export async function getDoctor(req, res) {
  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw new AppError(404, 'Doctor profile not found.')
  res.json(doctor.toPublic(Boolean(req.user)))
}

export async function updateDoctor(req, res) {
  const doctor = await ensureOwnership(req, req.params.id)
  const body = req.body || {}
  const updates = {}
  for (const key of EDITABLE) {
    if (key in body) {
      let value = body[key]
      if (value === null || value === undefined) value = ''
      if (key === 'fee') {
        const n = Number(value)
        if (!Number.isFinite(n) || n < 0 || n > 1000000) {
          throw new AppError(400, 'Consultation fee must be a positive number.')
        }
        updates[key] = Math.round(n)
        continue
      }
      if (key === 'name' && String(value).trim().length < 2) {
        throw new AppError(400, 'Doctor name must be at least 2 characters.')
      }
      if ((key === 'specialty' || key === 'city') && !String(value).trim()) {
        throw new AppError(400, `${key === 'specialty' ? 'Specialty' : 'City'} is required.`)
      }
      updates[key] = String(value).trim()
    }
  }
  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'No valid fields provided for update.')
  }
  const updated = await Doctor.findByIdAndUpdate(doctor._id, updates, { new: true })
  res.json(updated.toOwnerView())
}

export async function removeDoctor(req, res) {
  const doctor = await ensureOwnership(req, req.params.id)
  await Promise.all([Doctor.findByIdAndDelete(doctor._id), Review.deleteMany({ doctorId: doctor._id })])
  res.status(204).end()
}