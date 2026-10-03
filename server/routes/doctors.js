import { Router } from 'express'
import {
  listDoctors,
  getDoctor,
  updateDoctor,
  removeDoctor,
} from '../controllers/doctorController.js'
import { authRequired, optionalAuth, requireRole } from '../middleware/auth.js'
import { listReviews, createReview } from '../controllers/reviewController.js'
import {
  createDoctorAppointment,
  listPatientAppointments,
  listPatientPayments,
  listDoctorAvailability,
} from '../controllers/appointmentController.js'

const router = Router()

router.get('/', optionalAuth, listDoctors)
router.get('/appointments/me', authRequired, requireRole('patient'), listPatientAppointments)
router.get('/payments/me', authRequired, requireRole('patient'), listPatientPayments)
router.get('/:id/availability', listDoctorAvailability)
router.post('/:id/appointments', authRequired, requireRole('patient'), createDoctorAppointment)
router.get('/:id', optionalAuth, getDoctor)

// Doctor-owned management routes: role + ownership enforced by controller.
router.put('/:id', authRequired, requireRole('doctor'), updateDoctor)
router.patch('/:id', authRequired, requireRole('doctor'), updateDoctor)
router.delete('/:id', authRequired, requireRole('doctor'), removeDoctor)

// Reviews
router.get('/:id/reviews', listReviews)
router.post('/:id/reviews', authRequired, requireRole('patient'), createReview)

export default router