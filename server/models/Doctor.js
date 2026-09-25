import mongoose from 'mongoose'

const doctorSchema = new mongoose.Schema(
  {
    _id: { type: String },
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: '' },
    detail: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    rating: { type: String, default: '' },
    reviews: { type: String, default: '' },
    fee: { type: Number, default: 0 },
    initials: { type: String, default: '' },
    color: { type: String, default: 'teal' },
    next: { type: String, default: '' },
    type: { type: String, default: 'Online & In-Person' },
    photo: { type: String, default: '' },
    offerText: { type: String, default: '' },
    verified: { type: Boolean, default: true },
    qualification: { type: String, default: '' },
    experience: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

doctorSchema.virtual('id').get(function () {
  return this._id
})

// Keep `fee` in the document but control exposure at the route layer.
function safe(toJSON) {
  const json = toJSON()
  json.id = json.id || json._id
  return json
}

doctorSchema.methods.toPublic = function (includeFee = false) {
  const doc = {
    id: this._id,
    name: this.name,
    specialty: this.specialty,
    city: this.city,
    detail: this.detail,
    location: this.location,
    rating: this.rating,
    reviews: this.reviews,
    initials: this.initials,
    color: this.color,
    next: this.next,
    type: this.type,
    photo: this.photo,
    offerText: this.offerText,
    verified: Boolean(this.verified),
    qualification: this.qualification,
    experience: this.experience,
  }
  if (includeFee) doc.fee = this.fee
  return doc
}

doctorSchema.methods.toOwnerView = function () {
  return {
    ...this.toPublic(true),
    owner: this.owner ? this.owner.toString() : null,
    _id: this._id,
  }
}

const Doctor = mongoose.model('Doctor', doctorSchema)
export default Doctor