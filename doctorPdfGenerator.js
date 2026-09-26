import { jsPDF } from 'jspdf'
import { TATITO_LOGO_BASE64 } from './tatitoLogo.js'

/**
 * Generates a clean Doctor Registration Summary PDF containing ONLY the details entered by the user.
 * Features official Tatito Health+ brand logo in header and centered watermark across all pages.
 * 
 * @param {Object} rawValues - Actual form values entered by the user.
 * @returns {jsPDF} The populated jsPDF document.
 */
export function createDoctorApplicationPdf(rawValues = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Page geometry
  const pageWidth = 210
  const marginX = 14
  const contentWidth = pageWidth - (marginX * 2) // 182mm

  // Colors based on the reference layout
  const cBlack = [20, 20, 20]
  const cHeaderDark = [15, 23, 42]
  const cBorder = [200, 210, 222]
  const cBannerBg = [238, 244, 250] // soft blue-gray header banner
  const cBannerBorder = [188, 204, 222]
  const cTextDark = [35, 40, 48]
  const cTextMuted = [100, 110, 122]

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB')
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase()
  const timeOnly = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Extract doctor name for running headers
  const fullName = [rawValues.firstName, rawValues.lastName].filter(Boolean).join(' ') || rawValues.name || 'Doctor'

  /**
   * Helper to draw centered semi-transparent logo watermark on the current page
   */
  function drawWatermarkOnPage() {
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity: 0.08 }))
    const wmSize = 105
    const wmX = (pageWidth - wmSize) / 2
    const wmY = (297 - wmSize) / 2
    doc.addImage(TATITO_LOGO_BASE64, 'PNG', wmX, wmY, wmSize, wmSize)
    doc.restoreGraphicsState()
  }

  // Draw watermark on first page
  drawWatermarkOnPage()

  // 1. TOP HEADER with Tatito Health+ Brand Logo
  const topY = 10
  const logoSize = 20
  doc.addImage(TATITO_LOGO_BASE64, 'PNG', marginX, topY - 1, logoSize, logoSize)

  // Brand Name & Subtitle beside the logo
  const brandX = marginX + logoSize + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(20, 60, 40)
  doc.text('TATITO HEALTH+', brandX, topY + 6.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...cTextMuted)
  doc.text('Global Digital Healthcare Network', brandX, topY + 11.5)
  doc.text('Doctor Empanelment Application Record', brandX, topY + 16)

  // Right: Document title and timestamp
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...cHeaderDark)
  doc.text('Doctor Registration Summary', pageWidth - marginX, topY + 5.5, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...cTextDark)
  doc.text('Official Application Form', pageWidth - marginX, topY + 10.5, { align: 'right' })

  doc.setFontSize(7.5)
  doc.setTextColor(...cTextMuted)
  doc.text(`Generated : ${dateStr}, ${timeStr}`, pageWidth - marginX, topY + 15.5, { align: 'right' })

  // Divider line
  doc.setDrawColor(...cBorder)
  doc.setLineWidth(0.35)
  doc.line(marginX, topY + 22, pageWidth - marginX, topY + 22)

  let curY = topY + 31

  // 2. CENTERED DOCUMENT TITLE
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...cHeaderDark)
  doc.text('Doctor Registration Summary', pageWidth / 2, curY, { align: 'center' })

  curY += 4.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...cTextDark)
  doc.text('Complete application record', pageWidth / 2, curY, { align: 'center' })

  curY += 4
  doc.setFontSize(7.5)
  doc.setTextColor(...cTextMuted)
  doc.text(`Generated: ${dateStr}, ${timeOnly}`, pageWidth / 2, curY, { align: 'center' })

  curY += 7

  function checkPageBreak(neededH = 8) {
    if (curY + neededH > 270) {
      doc.addPage()
      drawWatermarkOnPage()

      // Compact running header on subsequent pages
      const subTopY = 10
      doc.addImage(TATITO_LOGO_BASE64, 'PNG', marginX, subTopY - 1, 9, 9)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...cHeaderDark)
      doc.text('Tatito HEALTH+ | Doctor Registration Summary', marginX + 12, subTopY + 5.5)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(...cTextMuted)
      doc.text(`Dr. ${fullName} · Confidential`, pageWidth - marginX, subTopY + 5.5, { align: 'right' })

      doc.setDrawColor(...cBorder)
      doc.setLineWidth(0.25)
      doc.line(marginX, subTopY + 11, pageWidth - marginX, subTopY + 11)

      curY = subTopY + 17
    }
  }

  /**
   * Helper to draw a section header box matching the reference screenshot
   */
  function drawSectionBanner(title, y) {
    checkPageBreak(12)
    y = curY
    const h = 7.5
    doc.setFillColor(...cBannerBg)
    doc.setDrawColor(...cBannerBorder)
    doc.setLineWidth(0.35)
    doc.rect(marginX, y, contentWidth, h, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...cHeaderDark)
    doc.text(title, marginX + 3.5, y + 5.2)

    curY = y + h
    return curY
  }

  /**
   * Helper to draw a table row with label and value matching the reference screenshot
   */
  function drawTableRow(label, value, y, customHeight = 6.8) {
    const colLabelW = 58
    const colValW = contentWidth - colLabelW
    const strValue = (value !== undefined && value !== null && String(value).trim() !== '') ? String(value) : '—'

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const splitVal = doc.splitTextToSize(strValue, colValW - 6)
    const actualHeight = Math.max(customHeight, (Math.max(splitVal.length, 1) * 3.8) + 3)

    checkPageBreak(actualHeight + 2)
    y = curY

    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.25)
    doc.rect(marginX, y, colLabelW, actualHeight, 'S')
    doc.rect(marginX + colLabelW, y, colValW, actualHeight, 'S')

    // Label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...cTextDark)
    doc.text(label, marginX + 3, y + 4.6)

    // Value
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...cBlack)

    if (splitVal.length > 1) {
      doc.text(splitVal, marginX + colLabelW + 3, y + 4.2)
    } else {
      doc.text(strValue, marginX + colLabelW + 3, y + 4.6)
    }

    curY = y + actualHeight
    return curY
  }

  // Extract ONLY what the user entered
  const nameDisplay = (fullName && fullName !== 'Doctor') ? fullName : ([rawValues.firstName, rawValues.lastName].filter(Boolean).join(' ') || rawValues.name || '—')
  const gender = rawValues.gender || '—'
  const dob = rawValues.dateOfBirth || '—'
  const mobile = rawValues.phone ? `${rawValues.phoneCountryCode || '+91'} ${String(rawValues.phone).trim()}` : '—'
  const email = rawValues.email || '—'
  const idType = rawValues.idType || '—'

  // Extract real file names if uploaded
  const idFileName = (rawValues.idProof && rawValues.idProof.name) ? rawValues.idProof.name : (typeof rawValues.idProof === 'string' && rawValues.idProof ? rawValues.idProof : '—')
  const photoFileName = (rawValues.profilePhoto && rawValues.profilePhoto.name) ? rawValues.profilePhoto.name : (typeof rawValues.profilePhoto === 'string' && rawValues.profilePhoto ? rawValues.profilePhoto : '—')

  // 3. PERSONAL DETAILS TABLE
  curY = drawSectionBanner('Personal Details', curY)
  curY = drawTableRow('Name', nameDisplay, curY)
  curY = drawTableRow('Gender', gender, curY)
  curY = drawTableRow('Date of Birth', dob, curY)
  curY = drawTableRow('Mobile', mobile, curY)
  curY = drawTableRow('Email', email, curY)
  curY = drawTableRow('ID Proof Type', idType, curY)
  curY = drawTableRow('ID Proof Document', idFileName, curY)
  curY = drawTableRow('Profile Photo', photoFileName, curY)
  if (rawValues.referralCode && String(rawValues.referralCode).trim()) {
    curY = drawTableRow('Referral Code', rawValues.referralCode, curY)
  }

  curY += 5

  // 4. EDUCATION & PRACTICE DETAILS TABLE
  curY = drawSectionBanner('Education and Practice Details', curY)
  const degDisplay = rawValues.displayDegree || (rawValues.degreeOther ? `${rawValues.degree} (${rawValues.degreeOther})` : rawValues.degree) || '—'
  curY = drawTableRow('Degree', degDisplay, curY)
  const univDisplay = rawValues.displayUniversity || (rawValues.universityOther ? `${rawValues.university} (${rawValues.universityOther})` : rawValues.university) || '—'
  curY = drawTableRow('University', univDisplay, curY)
  const collDisplay = rawValues.displayCollege || (rawValues.collegeOther ? `${rawValues.college} (${rawValues.collegeOther})` : rawValues.college) || '—'
  curY = drawTableRow('College', collDisplay, curY)
  curY = drawTableRow('Graduation Year', rawValues.graduationYear || '—', curY)
  curY = drawTableRow('Reg No. / Hall Ticket No. / Enrollment No.', rawValues.enrollmentNo || '—', curY)
  const enrollCertName = (rawValues.enrollmentCert && rawValues.enrollmentCert.name) ? rawValues.enrollmentCert.name : (typeof rawValues.enrollmentCert === 'string' && rawValues.enrollmentCert ? rawValues.enrollmentCert : '')
  if (enrollCertName) {
    curY = drawTableRow('Enrollment Certificate', enrollCertName, curY)
  }
  const degreeCertName = (rawValues.degreeCert && rawValues.degreeCert.name) ? rawValues.degreeCert.name : (typeof rawValues.degreeCert === 'string' && rawValues.degreeCert ? rawValues.degreeCert : '')
  if (degreeCertName) {
    curY = drawTableRow('Degree Certificate', degreeCertName, curY)
  }

  if (rawValues.stateMedicalCouncil) {
    curY = drawTableRow('State Medical Council', rawValues.stateMedicalCouncil, curY)
  }
  const ptDisplay = rawValues.displayPracticeType || (rawValues.practiceTypeOther ? `Other (${rawValues.practiceTypeOther})` : rawValues.practiceType) || '—'
  curY = drawTableRow('Practice Type', ptDisplay, curY)
  curY = drawTableRow('Years of Experience', rawValues.experience || '—', curY)
  curY = drawTableRow('Primary Specialization', rawValues.primarySpecialization || rawValues.specialty || '—', curY)
  if (rawValues.subSpecialization) {
    curY = drawTableRow('Sub-Specialization', rawValues.subSpecialization, curY)
  }
  if (rawValues.associationMembership) {
    curY = drawTableRow('Association Membership', rawValues.associationMembership, curY)
  }

  const wtDisplay = rawValues.displayWorkType || (rawValues.workTypeOther ? `Other (${rawValues.workTypeOther})` : rawValues.workType) || '—'
  curY = drawTableRow('Type of Work', wtDisplay, curY)
  const posDisplay = rawValues.displayPositionRole || (rawValues.positionRoleOther ? `Other (${rawValues.positionRoleOther})` : rawValues.positionRole) || '—'
  curY = drawTableRow('Position / Role', posDisplay, curY)
  if (rawValues.currentHospital) {
    curY = drawTableRow('Current Hospital / Clinic', rawValues.currentHospital, curY)
  }
  curY = drawTableRow('Medical Qualifications', rawValues.medicalQualifications || '—', curY)
  const allLangs = [rawValues.languagesKnown, rawValues.otherLanguages].filter(Boolean).join(', ') || '—'
  curY = drawTableRow('Languages Known', allLangs, curY)
  if (rawValues.bio) {
    curY = drawTableRow('Professional Bio', rawValues.bio, curY)
  }

  curY += 5

  // 5. LOCATION & AVAILABILITY DETAILS
  curY = drawSectionBanner('Office Location (Current Address)', curY)
  const currentAddrStr = rawValues.currentAddress || rawValues.address || '—'
  const currentAddrH = currentAddrStr.length > 45 ? 10 : 6.8
  curY = drawTableRow('Current Address', currentAddrStr, curY, currentAddrH)
  curY = drawTableRow('State', rawValues.currentState || '—', curY)
  curY = drawTableRow('District', rawValues.currentDistrict || '—', curY)
  const curCityDisplay = rawValues.displayCurrentCity || (rawValues.currentCity === 'Other' ? `Other (${rawValues.currentCityOther || ''})` : rawValues.currentCity) || rawValues.city || '—'
  curY = drawTableRow('City / Town', curCityDisplay, curY)
  curY = drawTableRow('Pincode', rawValues.currentPincode || '—', curY)

  curY += 4

  curY = drawSectionBanner('Permanent Address', curY)
  const permAddrStr = rawValues.permAddress || (rawValues.sameAsCurrent ? (rawValues.currentAddress || rawValues.address) : '—')
  const permAddrH = permAddrStr.length > 45 ? 10 : 6.8
  curY = drawTableRow('Permanent Address', permAddrStr, curY, permAddrH)
  curY = drawTableRow('State', rawValues.permState || (rawValues.sameAsCurrent ? rawValues.currentState : '—'), curY)
  curY = drawTableRow('District', rawValues.permDistrict || (rawValues.sameAsCurrent ? rawValues.currentDistrict : '—'), curY)
  const permCityDisplay = rawValues.displayPermCity || (rawValues.permCity === 'Other' ? `Other (${rawValues.permCityOther || ''})` : rawValues.permCity) || (rawValues.sameAsCurrent ? curCityDisplay : '—')
  curY = drawTableRow('City / Town', permCityDisplay, curY)
  curY = drawTableRow('Pincode', rawValues.permPincode || (rawValues.sameAsCurrent ? rawValues.currentPincode : '—'), curY)

  curY += 4

  curY = drawSectionBanner('Availability & Consultation', curY)
  curY = drawTableRow('Consultation Mode', rawValues.consultationMode || '—', curY)
  if (rawValues.consultationMode && String(rawValues.consultationMode).includes('Both')) {
    curY = drawTableRow('Online Available Days', rawValues.onlineAvailableDays || rawValues.availableDays || '—', curY)
    curY = drawTableRow('Offline Available Days', rawValues.offlineAvailableDays || rawValues.availableDays || '—', curY)
    const onlineHours = (rawValues.onlineWorkingHoursFrom && rawValues.onlineWorkingHoursTo) ? `${rawValues.onlineWorkingHoursFrom} - ${rawValues.onlineWorkingHoursTo}` : '—'
    curY = drawTableRow('Online Working Hours', onlineHours, curY)
    const offlineHours = (rawValues.offlineWorkingHoursFrom && rawValues.offlineWorkingHoursTo) ? `${rawValues.offlineWorkingHoursFrom} - ${rawValues.offlineWorkingHoursTo}` : '—'
    curY = drawTableRow('Offline Working Hours', offlineHours, curY)
  } else {
    curY = drawTableRow('Available Days', rawValues.availableDays || '—', curY)
    const workingHours = (rawValues.workingHoursFrom && rawValues.workingHoursTo) ? `${rawValues.workingHoursFrom} - ${rawValues.workingHoursTo}` : '—'
    curY = drawTableRow('Working Hours', workingHours, curY)
  }

  // 7. TERMS & CONDITIONS AND DIGITAL SIGNATURE (Rendered on dedicated last page)
  doc.addPage()
  drawWatermarkOnPage()

  // Running header on the signature page
  const subTopY = 10
  doc.addImage(TATITO_LOGO_BASE64, 'PNG', marginX, subTopY - 1, 9, 9)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...cHeaderDark)
  doc.text('Tatito HEALTH+ | Doctor Registration Summary', marginX + 12, subTopY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...cTextMuted)
  doc.text(`Dr. ${fullName} · Confidential`, pageWidth - marginX, subTopY + 5.5, { align: 'right' })

  doc.setDrawColor(...cBorder)
  doc.setLineWidth(0.25)
  doc.line(marginX, subTopY + 11, pageWidth - marginX, subTopY + 11)

  let tcY = subTopY + 17

  // Section banner: Terms & Conditions
  const tcBannerH = 7
  doc.setFillColor(...cBannerBg)
  doc.setDrawColor(...cBannerBorder)
  doc.setLineWidth(0.3)
  doc.rect(marginX, tcY, contentWidth, tcBannerH, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...cHeaderDark)
  doc.text('Terms & Conditions', marginX + 3.5, tcY + 4.8)

  tcY += tcBannerH + 4

  // Agreement subhead & intro text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...cBlack)
  doc.text('Registration Agreement', marginX, tcY)
  tcY += 3.8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.8)
  doc.setTextColor(...cTextDark)
  doc.text('By submitting this registration form, you enter into a binding practitioner empanelment agreement with Tatito Health+:', marginX, tcY)
  tcY += 4.6

  // Clause 1
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...cBlack)
  doc.text('1. Information Accuracy', marginX, tcY)
  tcY += 3.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...cTextDark)
  const c1Text = 'You certify that all medical qualifications, registration numbers, certificates, and personal particulars provided are true, accurate, and complete. Any false or misleading statement may result in immediate revocation of empanelment, account termination, and appropriate statutory reporting.'
  const splitC1 = doc.splitTextToSize(c1Text, contentWidth)
  doc.text(splitC1, marginX, tcY)
  tcY += (splitC1.length * 2.8) + 2.2

  // Clause 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...cBlack)
  doc.text('2. Medical Council Compliance', marginX, tcY)
  tcY += 3.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...cTextDark)
  const c2Text = 'You agree to abide by all rules, regulations, ethical guidelines, and standards set forth by the National Medical Commission (NMC), the Indian Medical Council (Professional Conduct, Etiquette and Ethics), and your respective State Medical Council.'
  const splitC2 = doc.splitTextToSize(c2Text, contentWidth)
  doc.text(splitC2, marginX, tcY)
  tcY += (splitC2.length * 2.8) + 2.2

  // Clause 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...cBlack)
  doc.text('3. Professional Conduct', marginX, tcY)
  tcY += 3.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...cTextDark)
  const c3Bullets = [
    'Patient confidentiality, privacy, and doctor-patient privilege',
    'Adherence to Telemedicine Practice Guidelines and clinical standards',
    'Conflict of interest avoidance and ethical patient care',
    'Timely communication and transparent consultation fee adherence'
  ]
  c3Bullets.forEach(item => {
    doc.setFillColor(...cHeaderDark)
    doc.circle(marginX + 2, tcY - 0.7, 0.45, 'F')
    doc.text(item, marginX + 4.5, tcY)
    tcY += 2.8
  })
  tcY += 1.5

  // Clause 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...cBlack)
  doc.text('4. Platform Rules', marginX, tcY)
  tcY += 3.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...cTextDark)
  const c4Bullets = [
    'Use the platform exclusively for legitimate clinical consultation and healthcare services',
    'Not engage in unlawful prescriptions, unapproved advertisements, or fraudulent activities',
    'Respect platform consultation fees, commission, and cancellation policies',
    'Maintain accurate real-time consultation availability status'
  ]
  c4Bullets.forEach(item => {
    doc.setFillColor(...cHeaderDark)
    doc.circle(marginX + 2, tcY - 0.7, 0.45, 'F')
    doc.text(item, marginX + 4.5, tcY)
    tcY += 2.8
  })
  tcY += 1.5

  // Clause 5
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...cBlack)
  doc.text('5. Privacy & Data Verification', marginX, tcY)
  tcY += 3.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...cTextDark)
  const c5Text = 'You accept our Privacy Policy and authorize Tatito Health+ to authenticate all submitted documents, degrees, and medical registrations through the National Medical Commission (NMC) and competent regulatory authorities.'
  const splitC5 = doc.splitTextToSize(c5Text, contentWidth)
  doc.text(splitC5, marginX, tcY)
  tcY += (splitC5.length * 2.8) + 2.2

  // Clause 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.8)
  doc.setTextColor(...cBlack)
  doc.text('6. Governing Law', marginX, tcY)
  tcY += 3.2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.2)
  doc.setTextColor(...cTextDark)
  const c6Text = 'This agreement shall be governed by and construed in accordance with the laws of India and applicable healthcare regulations.'
  const splitC6 = doc.splitTextToSize(c6Text, contentWidth)
  doc.text(splitC6, marginX, tcY)
  tcY += (splitC6.length * 2.8) + 4

  // Digital Signature
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...cBlack)
  doc.text('Digital Signature', marginX, tcY)

  tcY += 4

  const sigWidth = 55
  const sigHeight = 20

  if (rawValues.digitalSignature) {
    doc.addImage(rawValues.digitalSignature, 'PNG', marginX, tcY, sigWidth, sigHeight)
  } else {
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.25)
    doc.rect(marginX, tcY, sigWidth, sigHeight, 'S')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7)
    doc.setTextColor(...cTextMuted)
    doc.text('[ Signature Pending Final Submission ]', marginX + (sigWidth / 2), tcY + (sigHeight / 2) + 1, { align: 'center' })
  }

  tcY += sigHeight + 4.5

  const signDate = rawValues.signatureDate || dateStr
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...cTextDark)
  doc.text(`Signed date: ${signDate}`, marginX, tcY)

  // 8. FOOTER AND PAGE NUMBERING ACROSS ALL PAGES
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    const footerY = 282
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.3)
    doc.line(marginX, footerY, pageWidth - marginX, footerY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...cTextMuted)
    doc.text('(c) 2026 TatitoHealth+. All Rights Reserved.', marginX, footerY + 4.5)
    doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, footerY + 4.5, { align: 'center' })
    doc.text('Confidential Application Record', pageWidth - marginX, footerY + 4.5, { align: 'right' })
  }

  return doc
}

/**
 * Returns a Blob URL for previewing the Doctor Application PDF in an iframe.
 * @param {Object} values 
 * @returns {string} Object URL for preview
 */
export function getDoctorApplicationPdfUrl(values = {}) {
  const doc = createDoctorApplicationPdf(values)
  return doc.output('bloburl')
}

/**
 * Directly triggers a browser download for the Doctor Application PDF.
 * @param {Object} values 
 */
export function downloadDoctorApplicationPdf(values = {}) {
  const doc = createDoctorApplicationPdf(values)
  const name = (values.firstName ? `${values.firstName}_${values.lastName}` : (values.name || 'Doctor')).replace(/\s+/g, '_')
  doc.save(`TatitoHealth_Registration_${name}.pdf`)
}
