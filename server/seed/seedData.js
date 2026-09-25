import { doctors, doctorReviews } from '../../data.js'
import Doctor from '../models/Doctor.js'
import Review from '../models/Review.js'
import User from '../models/User.js'

function splitDetail(detail) {
  const parts = String(detail || '').split('·')
  return {
    qualification: (parts[0] || '').trim(),
    experience: (parts[1] || '').trim(),
  }
}

export async function seedDoctors() {
  let inserted = 0
  for (const d of doctors) {
    const { qualification, experience } = splitDetail(d.detail)
    const patch = {
      name: d.name,
      specialty: d.specialty,
      city: d.city,
      detail: d.detail,
      location: d.location,
      rating: d.rating,
      reviews: d.reviews,
      fee: d.fee,
      initials: d.initials,
      color: d.color,
      next: d.next,
      type: d.type,
      photo: d.photo || '',
      offerText: d.id === 'd1' ? 'Get 10% off on consultation' : '',
      verified: true,
      qualification,
      experience,
    }
    const existing = await Doctor.findById(d.id)
    if (!existing) {
      await Doctor.create({ _id: d.id, ...patch })
      inserted++
    } else {
      await Doctor.updateOne({ _id: d.id }, { $set: patch })
    }
  }
  return inserted
}

export async function seedReviews() {
  let inserted = 0
  for (const d of doctors) {
    const samples = doctorReviews[d.id] || []
    const existingCount = await Review.countDocuments({ doctorId: d.id, isSeed: true })
    if (existingCount >= samples.length) continue
    await Review.deleteMany({ doctorId: d.id, isSeed: true })
    const docs = samples.map((r, i) => {
      const daysAgo = (samples.length - i) * 2
      return {
        doctorId: d.id,
        patientName: r.name,
        rating: r.rating,
        comment: r.text,
        isSeed: true,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      }
    })
    if (docs.length) {
      await Review.insertMany(docs)
      inserted += docs.length
    }
  }
  return inserted
}

export async function seedUsers() {
  const entries = [
    {
      email: 'patient@tatito.health',
      password: 'Patient@123',
      name: 'Priya Patient',
      mobile: '+91 9876543210',
      role: 'patient',
      doctorId: null,
    },
    {
      email: 'doctor@tatito.health',
      password: 'Doctor@123',
      name: 'Dr. Maya Chen',
      mobile: '+91 9000000001',
      role: 'doctor',
      doctorId: 'd1',
    },
  ]
  const created = []
  for (const e of entries) {
    let user = await User.findOne({ email: e.email })
    if (user) {
      if (user.role !== e.role || user.name !== e.name) {
        user.role = e.role
        user.name = e.name
        user.doctorId = e.doctorId
        await user.save()
        created.push(user.email)
      }
      if (e.role === 'doctor' && e.doctorId) {
        await Doctor.updateOne({ _id: e.doctorId }, { $set: { owner: user._id } })
      }
      continue
    }
    user = new User({
      name: e.name,
      email: e.email,
      mobile: e.mobile,
      role: e.role,
      doctorId: e.doctorId,
    })
    await user.setPassword(e.password)
    await user.save()
    if (e.role === 'doctor' && e.doctorId) {
      await Doctor.updateOne({ _id: e.doctorId }, { $set: { owner: user._id } })
    }
    created.push(e.email)
  }
  return created
}

export async function seedAll() {
  const doctorsInserted = await seedDoctors()
  const reviewsInserted = await seedReviews()
  const usersCreated = await seedUsers()
  return { doctorsInserted, reviewsInserted, usersCreated }
}