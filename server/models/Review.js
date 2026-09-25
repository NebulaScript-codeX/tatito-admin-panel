import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    doctorId: { type: String, required: true, index: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    patientName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

reviewSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    doctorId: this.doctorId,
    patientName: this.patientName,
    rating: this.rating,
    comment: this.comment,
    isDemo: Boolean(this.isSeed),
    createdAt: this.createdAt,
  }
}

const Review = mongoose.model('Review', reviewSchema)
export default Review