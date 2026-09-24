import { jsPDF } from 'jspdf'

/**
 * Generates a clean Doctor Registration Summary PDF containing ONLY the details entered by the user.
 * No fake data, no terms & conditions, no digital signature, and no logo emblem (only "TatitoHealth+").
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

  // 1. TOP HEADER (No logo emblem, only "TatitoHealth+")
  const topY = 12

  // Left: Just "TatitoHealth+"
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...cHeaderDark)
  doc.text('TatitoHealth+', marginX, topY + 7)

  // Right: Document title and timestamp
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...cHeaderDark)
  doc.text('TatitoHealth+', pageWidth - marginX, topY + 3, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...cTextDark)
  doc.text('Doctor Registration Summary', pageWidth - marginX, topY + 7.5, { align: 'right' })
  doc.text('Complete application record', pageWidth - marginX, topY + 12, { align: 'right' })

  doc.setFontSize(8)
  doc.setTextColor(...cTextMuted)
  doc.text(`Generated : ${dateStr}, ${timeStr}`, pageWidth - marginX, topY + 16.5, { align: 'right' })

  // Divider line
  doc.setDrawColor(...cBorder)
  doc.setLineWidth(0.35)
  doc.line(marginX, topY + 21, pageWidth - marginX, topY + 21)

  let curY = topY + 30

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

  /**
   * Helper to draw footer on each page
   */
  function drawFooter() {
    const footerY = 278
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.3)
    doc.line(marginX, footerY, pageWidth - marginX, footerY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...cTextMuted)
    doc.text('(c) 2026 TatitoHealth+. All Rights Reserved.', marginX, footerY + 5)
    doc.text('Confidential Application Record', pageWidth - marginX, footerY + 5, { align: 'right' })
  }

  function checkPageBreak(neededH = 8) {
    if (curY + neededH > 270) {
      drawFooter()
      doc.addPage()
      curY = 20
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
  const fullName = [rawValues.firstName, rawValues.lastName].filter(Boolean).join(' ') || rawValues.name || '—'
  const gender = rawValues.gender || '—'
  const dob = rawValues.dateOfBirth || '—'
  const mobile = rawValues.phone ? String(rawValues.phone).trim() : '—'
  const email = rawValues.email || '—'
  const idType = rawValues.idType || '—'

  // Extract real file names if uploaded
  const idFileName = (rawValues.idProof && rawValues.idProof.name) ? rawValues.idProof.name : (typeof rawValues.idProof === 'string' && rawValues.idProof ? rawValues.idProof : '—')
  const photoFileName = (rawValues.profilePhoto && rawValues.profilePhoto.name) ? rawValues.profilePhoto.name : (typeof rawValues.profilePhoto === 'string' && rawValues.profilePhoto ? rawValues.profilePhoto : '—')

  // 3. PERSONAL DETAILS TABLE
  curY = drawSectionBanner('Personal Details', curY)
  curY = drawTableRow('Name', fullName, curY)
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

  // 4. EDUCATIONAL DETAILS TABLE
  curY = drawSectionBanner('Educational Details', curY)
  const degDisplay = rawValues.displayDegree || (rawValues.degreeOther ? `${rawValues.degree} (${rawValues.degreeOther})` : rawValues.degree) || '—'
  curY = drawTableRow('Degree', degDisplay, curY)
  const univDisplay = rawValues.displayUniversity || (rawValues.universityOther ? `${rawValues.university} (${rawValues.universityOther})` : rawValues.university) || '—'
  curY = drawTableRow('University', univDisplay, curY)
  const collDisplay = rawValues.displayCollege || (rawValues.collegeOther ? `${rawValues.college} (${rawValues.collegeOther})` : rawValues.college) || '—'
  curY = drawTableRow('College', collDisplay, curY)
  curY = drawTableRow('Graduation Year', rawValues.graduationYear || '—', curY)
  curY = drawTableRow('Enrollment No', rawValues.enrollmentNo || '—', curY)

  curY += 5

  // 5. PRACTICE & CAREER TABLE
  curY = drawSectionBanner('Professional Practice', curY)
  curY = drawTableRow('Medical Registration No', rawValues.medicalRegNo || rawValues.license || '—', curY)
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
  const licenseCertName = (rawValues.licenseCert && rawValues.licenseCert.name) ? rawValues.licenseCert.name : (typeof rawValues.licenseCert === 'string' && rawValues.licenseCert ? rawValues.licenseCert : '—')
  curY = drawTableRow('License Certificate', licenseCertName, curY)
  if (rawValues.medicalServices) {
    curY = drawTableRow('Documentation / Services', rawValues.medicalServices, curY)
  }

  curY += 4

  curY = drawSectionBanner('Career Information', curY)
  if (rawValues.currentHospital) {
    curY = drawTableRow('Current Hospital / Clinic', rawValues.currentHospital, curY)
  }
  if (rawValues.positionRole) {
    curY = drawTableRow('Position / Role', rawValues.positionRole, curY)
  }
  const wtDisplay = rawValues.displayWorkType || (rawValues.workTypeOther ? `Other (${rawValues.workTypeOther})` : rawValues.workType) || '—'
  curY = drawTableRow('Type of Work', wtDisplay, curY)
  curY = drawTableRow('Medical Qualifications', rawValues.medicalQualifications || '—', curY)
  const allLangs = [rawValues.languagesKnown, rawValues.otherLanguages].filter(Boolean).join(', ') || '—'
  curY = drawTableRow('Languages Known', allLangs, curY)
  if (rawValues.bio) {
    curY = drawTableRow('Professional Bio', rawValues.bio, curY)
  }

  curY += 5

  // 6. LOCATION & AVAILABILITY DETAILS
  curY = drawSectionBanner('Office Location (Current Address)', curY)
  const currentAddrStr = rawValues.currentAddress || rawValues.address || '—'
  const currentAddrH = currentAddrStr.length > 45 ? 10 : 6.8
  curY = drawTableRow('Current Address', currentAddrStr, curY, currentAddrH)
  curY = drawTableRow('State', rawValues.currentState || '—', curY)
  curY = drawTableRow('District', rawValues.currentDistrict || '—', curY)
  curY = drawTableRow('City', rawValues.currentCity || rawValues.city || '—', curY)
  curY = drawTableRow('Pincode', rawValues.currentPincode || '—', curY)

  curY += 4

  curY = drawSectionBanner('Permanent Address', curY)
  const permAddrStr = rawValues.permAddress || (rawValues.sameAsCurrent ? (rawValues.currentAddress || rawValues.address) : '—')
  const permAddrH = permAddrStr.length > 45 ? 10 : 6.8
  curY = drawTableRow('Permanent Address', permAddrStr, curY, permAddrH)
  curY = drawTableRow('State', rawValues.permState || (rawValues.sameAsCurrent ? rawValues.currentState : '—'), curY)
  curY = drawTableRow('District', rawValues.permDistrict || (rawValues.sameAsCurrent ? rawValues.currentDistrict : '—'), curY)
  curY = drawTableRow('City', rawValues.permCity || (rawValues.sameAsCurrent ? (rawValues.currentCity || rawValues.city) : '—'), curY)
  curY = drawTableRow('Pincode', rawValues.permPincode || (rawValues.sameAsCurrent ? rawValues.currentPincode : '—'), curY)

  curY += 4

  curY = drawSectionBanner('Availability & Consultation', curY)
  curY = drawTableRow('Consultation Mode', rawValues.consultationMode || '—', curY)
  curY = drawTableRow('Available Days', rawValues.availableDays || '—', curY)
  const workingHours = (rawValues.workingHoursFrom && rawValues.workingHoursTo) ? `${rawValues.workingHoursFrom} - ${rawValues.workingHoursTo}` : '—'
  curY = drawTableRow('Working Hours', workingHours, curY)

  // 7. FOOTER
  drawFooter()

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
