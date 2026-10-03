import Doctor from '../models/Doctor.js'
import Review from '../models/Review.js'
import { AppError } from '../middleware/error.js'

async function reviewsSummary(doctorId) {
  const all = await Review.find({ doctorId }).sort({ createdAt: -1, _id: -1 })
  const approvedReviews = all.filter(
    (r) =>
      r.moderationStatus === 'approved' ||
      (r.isSeed && r.moderationStatus !== 'hidden'),
  )
  const userReviews = approvedReviews.filter((r) => !r.isSeed)
  const seedReviews = approvedReviews.filter((r) => r.isSeed)
  const hasUser = userReviews.length > 0
  const basis = approvedReviews
  const overall = basis.length
    ? (basis.reduce((s, r) => s + r.rating, 0) / basis.length).toFixed(1)
    : '0.0'
  return {
    doctorId,
    reviews: approvedReviews.map((r) => r.toPublic()),
    overall: Number(overall).toFixed(1),
    count: basis.length,
    userCount: userReviews.length,
    seedCount: seedReviews.length,
    isDemo: !hasUser,
  }
}

export async function listReviews(req, res) {
  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw new AppError(404, 'Doctor profile not found.')
  res.json(await reviewsSummary(doctor._id))
}

export async function createReview(req, res) {
  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw new AppError(404, 'Doctor profile not found.')

  const { rating, comment } = req.body || {}
  const r = Number(rating)
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    throw new AppError(400, 'Rating must be a whole number between 1 and 5.')
  }
  const text = String(comment || '').trim()
  if (text.length < 3) throw new AppError(400, 'Review text must be at least 3 characters.')
  if (text.length > 1200) throw new AppError(400, 'Review text must be 1200 characters or fewer.')

  if (!req.user) throw new AppError(401, 'Authentication required.')
  if (req.user.role !== 'patient') {
    throw new AppError(403, 'Only registered patients can submit reviews.')
  }

  const review = new Review({
    doctorId: doctor._id,
    patientId: req.user._id,
    patientName: req.user.name,
    rating: r,
    comment: text,
  })
  await review.save()

  res.status(201).json({ review: review.toPublic(), summary: await reviewsSummary(doctor._id) })
}