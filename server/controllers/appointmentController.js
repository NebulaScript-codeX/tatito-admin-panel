import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import Doctor from '../models/Doctor.js'
import { AppError } from '../middleware/error.js'

const SCHEDULES = 'care_schedules'
const LEAVES = 'care_leaves'
const SLOTS = 'care_slots'
const APPOINTMENTS = 'care_appointments'
const TIMELINE = 'care_appointment_timeline'
const PAYMENTS = 'care_payment_transactions'

function database() {
  const db = mongoose.connection.db
  if (!db) throw new AppError(503, 'Appointment service is unavailable.')
  return db
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

async function slotsForDoctor(db, doctor, targetDate) {
  if (await db.collection(LEAVES).findOne({ doctor_id: doctor.id, date: targetDate })) return []
  const weekday = (new Date(`${targetDate}T00:00:00.000Z`).getUTCDay() + 6) % 7
  const schedule = await db.collection(SCHEDULES).findOne({
    doctor_id: doctor.id,
    weekday,
    is_working: true,
  })
  if (!schedule) return []
  const duration = Number(schedule.duration_minutes || 30)
  if (![10, 15, 20, 30].includes(duration)) {
    throw new AppError(400, 'Doctor schedule has an unsupported slot duration.')
  }
  const startMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(schedule.start_time || '')
  const endMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(schedule.end_time || '')
  if (!startMatch || !endMatch) throw new AppError(400, 'Doctor schedule has invalid working hours.')
  let cursor = Number(startMatch[1]) * 60 + Number(startMatch[2])
  const finish = Number(endMatch[1]) * 60 + Number(endMatch[2])
  if (finish <= cursor) throw new AppError(400, 'Doctor schedule has invalid working hours.')

  const slots = []
  const collection = db.collection(SLOTS)
  await collection.createIndex({ slot_key: 1 }, { unique: true })
  while (cursor + duration <= finish) {
    const hours = Math.floor(cursor / 60)
    const minutes = cursor % 60
    const endMinutes = cursor + duration
    const startTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`
    const key = `${doctor.id}:${targetDate}:${startTime}`
    await collection.updateOne(
      { slot_key: key },
      {
        $setOnInsert: {
          _id: randomUUID().replaceAll('-', ''),
          slot_key: key,
          doctor_id: doctor.id,
          date: targetDate,
          weekday,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          status: 'available',
        },
      },
      { upsert: true },
    )
    const slot = await collection.findOne({ slot_key: key })
    if (
      slot.status === 'available' &&
      isFutureAppointmentTime(targetDate, slot.start_time)
    ) {
      slots.push({
        id: String(slot._id),
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: slot.status,
      })
    }
    cursor += duration
  }
  return slots
}

function indiaDateTime() {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const fields = Object.fromEntries(
    formatter.formatToParts(new Date()).map(({ type, value }) => [type, value]),
  )
  return {
    date: `${fields.year}-${fields.month}-${fields.day}`,
    time: `${fields.hour}:${fields.minute}`,
  }
}

function isFutureAppointmentTime(targetDate, startTime) {
  const local = indiaDateTime()
  return targetDate > local.date || (targetDate === local.date && startTime > local.time)
}

export async function listDoctorAvailability(req, res) {
  const targetDate = String(req.query.date || '')
  if (!validDate(targetDate)) throw new AppError(400, 'A valid appointment date is required.')
  if (targetDate < indiaDateTime().date) return res.json({ success: true, results: [] })
  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw new AppError(404, 'Doctor profile not found.')
  if (!doctor.verified || !doctor.available) {
    return res.json({ success: true, results: [] })
  }
  const results = await slotsForDoctor(database(), doctor, targetDate)
  res.json({ success: true, results })
}

export async function createDoctorAppointment(req, res) {
  if (req.user.isActive === false || req.user.isBlocked || req.user.status === 'deactivated' || req.user.status === 'blocked') {
    throw new AppError(403, 'This patient account cannot book appointments.')
  }

  export async function listPatientAppointments(req, res) {
    const appointments = await database()
      .collection(APPOINTMENTS)
      .find({ patient_id: req.user._id.toString() })
      .sort({ date: -1, start_time: -1 })
      .limit(100)
      .toArray()
    res.json({
      success: true,
      results: appointments.map(({ _id, ...appointment }) => ({
        id: String(_id),
        ...appointment,
      })),
    })
  }

  export async function listPatientPayments(req, res) {
    const payments = await database()
      .collection(PAYMENTS)
      .find({ patient_id: req.user._id.toString() })
      .sort({ created_at: -1 })
      .limit(100)
      .toArray()
    res.json({
      success: true,
      results: payments.map(({ _id, ...payment }) => ({
        id: String(_id),
        ...payment,
      })),
    })
  }
  const slotId = String(req.body?.slot_id || '')
  const consultationType = String(req.body?.consultation_type || '')
  if (!slotId) throw new AppError(400, 'Choose an available appointment slot.')
  if (!['Video', 'In-person'].includes(consultationType)) {
    throw new AppError(400, 'Choose Video or In-person consultation.')
  }

  const doctor = await Doctor.findById(req.params.id)
  if (!doctor) throw new AppError(404, 'Doctor profile not found.')
  if (!doctor.verified || !doctor.available) {
    throw new AppError(409, 'This doctor is not currently available for booking.')
  }

  const db = database()
  const slots = db.collection(SLOTS)
  const slot = await slots.findOneAndUpdate(
    { _id: slotId, doctor_id: doctor.id, status: 'available' },
    { $set: { status: 'booked', updated_at: new Date() } },
    { returnDocument: 'after' },
  )
  if (!slot) throw new AppError(409, 'This appointment slot is no longer available.')
  if (!isFutureAppointmentTime(slot.date, slot.start_time)) {
    await slots.updateOne({ _id: slotId, status: 'booked' }, { $set: { status: 'available' } })
    throw new AppError(400, 'Past appointment times cannot be booked.')
  }
  if (await db.collection(LEAVES).findOne({ doctor_id: doctor.id, date: slot.date })) {
    await slots.updateOne({ _id: slotId, status: 'booked' }, { $set: { status: 'available' } })
    throw new AppError(409, 'Doctor is on leave for the selected date.')
  }

  const stamp = new Date()
  const appointmentId = randomUUID().replaceAll('-', '')
  const paymentId = randomUUID().replaceAll('-', '')
  const appointment = {
    _id: appointmentId,
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    specialty: doctor.specialty,
    patient_id: req.user._id.toString(),
    patient_name: req.user.name,
    slot_id: slotId,
    date: slot.date,
    start_time: slot.start_time,
    end_time: slot.end_time,
    consultation_type: consultationType,
    fee: Number(doctor.fee || 0),
    status: 'booked',
    payment_status: 'pending',
    period: slot.date.slice(0, 7),
    created_at: stamp,
    updated_at: stamp,
  }
  try {
    await db.collection(APPOINTMENTS).insertOne(appointment)
    await db.collection(PAYMENTS).insertOne({
      _id: paymentId,
      appointment_id: appointmentId,
      patient_id: appointment.patient_id,
      doctor_id: doctor.id,
      amount: appointment.fee,
      status: 'pending',
      kind: 'consultation',
      created_at: stamp,
    })
    await db.collection(TIMELINE).insertOne({
      _id: randomUUID().replaceAll('-', ''),
      appointment_id: appointmentId,
      action: 'booked',
      actor_id: req.user._id.toString(),
      actor: req.user.name,
      details: { slot_id: slotId, source: 'patient_website' },
      created_at: stamp,
    })
  } catch (error) {
    await db.collection(APPOINTMENTS).deleteOne({ _id: appointmentId })
    await db.collection(PAYMENTS).deleteOne({ _id: paymentId })
    await slots.updateOne({ _id: slotId, status: 'booked' }, { $set: { status: 'available' } })
    if (error.code === 11000) throw new AppError(409, 'This appointment slot was just booked.')
    throw error
  }

  res.status(201).json({
    success: true,
    appointment: {
      id: appointmentId,
      ...appointment,
      _id: undefined,
    },
    payment: { id: paymentId, status: 'pending', amount: appointment.fee },
    message: 'Appointment booked. Payment is pending.',
  })
}
