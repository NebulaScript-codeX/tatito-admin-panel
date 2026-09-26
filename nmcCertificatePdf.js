import { jsPDF } from 'jspdf'
import { TATITO_LOGO_BASE64 } from './tatitoLogo.js'

/**
 * Generates an official National Medical Commission (NMC) IMR Verification Record PDF
 * matching the exact details and layout shown in the verification modal.
 *
 * @param {Object} doctor - Doctor details returned from NMC scraper/backend.
 * @returns {File} A File object containing the generated PDF.
 */
export function generateNmcCertificatePdf(doctor = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = 210
  const marginX = 14
  const contentWidth = pageWidth - (marginX * 2) // 182mm

  // Colors
  const cBlack = [20, 20, 20]
  const cHeaderDark = [15, 23, 42]
  const cBorder = [200, 210, 222]
  const cBannerBg = [238, 244, 250]
  const cBannerBorder = [188, 204, 222]
  const cTextDark = [35, 40, 48]
  const cTextMuted = [100, 110, 122]
  const cBrandGreen = [15, 118, 110]
  const cVerifiedBg = [236, 253, 245]
  const cVerifiedBorder = [16, 185, 129]

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB')
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })

  // Centered watermark
  doc.saveGraphicsState()
  doc.setGState(new doc.GState({ opacity: 0.08 }))
  const wmSize = 105
  const wmX = (pageWidth - wmSize) / 2
  const wmY = (297 - wmSize) / 2
  doc.addImage(TATITO_LOGO_BASE64, 'PNG', wmX, wmY, wmSize, wmSize)
  doc.restoreGraphicsState()

  // 1. Header with Tatito Logo & Title
  const topY = 12
  const logoSize = 18
  doc.addImage(TATITO_LOGO_BASE64, 'PNG', marginX, topY, logoSize, logoSize)

  const brandX = marginX + logoSize + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...cBrandGreen)
  doc.text('TATITO HEALTH+', brandX, topY + 5.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(...cHeaderDark)
  doc.text('National Medical Commission (NMC) Verification Portal', brandX, topY + 10.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...cTextMuted)
  doc.text('Indian Medical Register (IMR) Practitioner Authentication Record', brandX, topY + 15)

  // Top right verification badge
  doc.setFillColor(...cVerifiedBg)
  doc.setDrawColor(...cVerifiedBorder)
  doc.setLineWidth(0.35)
  doc.roundedRect(pageWidth - marginX - 52, topY, 52, 16, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(5, 150, 105)
  doc.text('AUTHENTICATED VIA NMC', pageWidth - marginX - 26, topY + 6.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...cTextMuted)
  doc.text(`Verified: ${dateStr}, ${timeStr}`, pageWidth - marginX - 26, topY + 12, { align: 'center' })

  // Divider
  doc.setDrawColor(...cBorder)
  doc.setLineWidth(0.35)
  doc.line(marginX, topY + 22, pageWidth - marginX, topY + 22)

  let curY = topY + 30

  // Title Banner
  doc.setFillColor(15, 118, 110)
  doc.roundedRect(marginX, curY, contentWidth, 9, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('INDIAN MEDICAL REGISTER - PRACTITIONER DETAILS', pageWidth / 2, curY + 6.2, { align: 'center' })

  curY += 12

  /**
   * Helper to draw a 4-column row: [Label 1 (30mm), Val 1 (57mm), Label 2 (38mm), Val 2 (57mm)]
   * Supports automatic multi-line wrapping and dynamic row height so long names and particulars are never clipped.
   */
  function drawPairRow(l1, v1, l2, v2, yPos) {
    const col1W = 30
    const col2W = 57
    const col3W = 38
    const col4W = 57
    const lineSpacing = 3.6

    // Determine font sizes based on text lengths
    const strV1 = String(v1 || '—')
    const strV2 = String(v2 || '—')
    const fontSize1 = strV1.length > 32 ? 7.2 : 8
    const fontSize2 = strV2.length > 32 ? 7.2 : 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize1)
    const lines1 = doc.splitTextToSize(strV1, col2W - 6)

    doc.setFontSize(fontSize2)
    const lines2 = doc.splitTextToSize(strV2, col4W - 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    const label1Lines = doc.splitTextToSize(String(l1 || ''), col1W - 5)
    const label2Lines = doc.splitTextToSize(String(l2 || ''), col3W - 5)

    const maxLines = Math.max(1, lines1.length, lines2.length, label1Lines.length, label2Lines.length)
    const rowH = Math.max(7.5, maxLines * lineSpacing + 4)

    // 1. Full row background and border
    doc.setFillColor(252, 253, 254)
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.2)
    doc.rect(marginX, yPos, contentWidth, rowH, 'FD')

    // 2. Cell 1 (Label 1) background
    doc.setFillColor(245, 248, 251)
    doc.rect(marginX, yPos, col1W, rowH, 'FD')

    // 3. Cell 3 (Label 2) background
    doc.setFillColor(245, 248, 251)
    doc.rect(marginX + col1W + col2W, yPos, col3W, rowH, 'FD')

    // 4. Vertical divider lines between all 4 cells
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.2)
    doc.line(marginX + col1W, yPos, marginX + col1W, yPos + rowH)
    doc.line(marginX + col1W + col2W, yPos, marginX + col1W + col2W, yPos + rowH)
    doc.line(marginX + col1W + col2W + col3W, yPos, marginX + col1W + col2W + col3W, yPos + rowH)

    // 5. Draw Label 1 text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...cHeaderDark)
    const startYLabel1 = yPos + (rowH - (label1Lines.length - 1) * lineSpacing) / 2 + 1.0
    doc.text(label1Lines, marginX + 3, startYLabel1)

    // 6. Draw Label 2 text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...cHeaderDark)
    const startYLabel2 = yPos + (rowH - (label2Lines.length - 1) * lineSpacing) / 2 + 1.0
    doc.text(label2Lines, marginX + col1W + col2W + 3, startYLabel2)

    // 7. Draw Value 1 text (wrapped, vertically centered)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize1)
    doc.setTextColor(...cBlack)
    const startYVal1 = yPos + (rowH - (lines1.length - 1) * lineSpacing) / 2 + 1.0
    doc.text(lines1, marginX + col1W + 3, startYVal1)

    // 8. Draw Value 2 text (wrapped, vertically centered)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(fontSize2)
    doc.setTextColor(...cBlack)
    const startYVal2 = yPos + (rowH - (lines2.length - 1) * lineSpacing) / 2 + 1.0
    doc.text(lines2, marginX + col1W + col2W + col3W + 3, startYVal2)

    return yPos + rowH
  }

  /**
   * Helper to draw a full-width key-value row: [Label (30mm), Value (152mm)]
   * Supports automatic multi-line wrapping and dynamic row height.
   */
  function drawFullRow(label, value, yPos) {
    const colLabelW = 30
    const colValW = contentWidth - colLabelW
    const lineSpacing = 3.6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const textLines = doc.splitTextToSize(String(value || '—'), colValW - 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    const labelLines = doc.splitTextToSize(String(label || ''), colLabelW - 5)

    const maxLines = Math.max(1, textLines.length, labelLines.length)
    const rowH = Math.max(7.5, maxLines * lineSpacing + 4)

    // Row background and border
    doc.setFillColor(252, 253, 254)
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.2)
    doc.rect(marginX, yPos, contentWidth, rowH, 'FD')

    // Label cell background
    doc.setFillColor(245, 248, 251)
    doc.rect(marginX, yPos, colLabelW, rowH, 'FD')

    // Divider
    doc.setDrawColor(...cBorder)
    doc.setLineWidth(0.2)
    doc.line(marginX + colLabelW, yPos, marginX + colLabelW, yPos + rowH)

    // Label text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...cHeaderDark)
    const startYLabel = yPos + (rowH - (labelLines.length - 1) * lineSpacing) / 2 + 1.0
    doc.text(labelLines, marginX + 3, startYLabel)

    // Value text
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...cBlack)
    const startYVal = yPos + (rowH - (textLines.length - 1) * lineSpacing) / 2 + 1.0
    doc.text(textLines, marginX + colLabelW + 3, startYVal)

    return yPos + rowH
  }

  /**
   * Helper to draw section sub-heading inside table
   */
  function drawSubBanner(title, yPos) {
    doc.setFillColor(...cBannerBg)
    doc.setDrawColor(...cBannerBorder)
    doc.setLineWidth(0.25)
    doc.rect(marginX, yPos, contentWidth, 6.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...cBrandGreen)
    doc.text(String(title || ''), marginX + 4, yPos + 4.5)

    return yPos + 6.5
  }

  // Draw Primary Details
  curY = drawPairRow('Name', doctor.name, 'Father/Husband Name', doctor.father_name, curY)
  curY = drawPairRow('Date of Birth', doctor.dob, 'Year of Info', doctor.year_of_info, curY)
  curY = drawPairRow('Registration No', doctor.registration_no, 'Date of Reg.', doctor.date_of_reg, curY)
  curY = drawPairRow('UPRN No', doctor.uprn_no || 'N/A', 'State Medical Council', doctor.state_medical_council, curY)
  curY = drawPairRow('Qualification', doctor.qualification || 'MBBS', 'Qualification Year', doctor.qualification_year, curY)
  curY = drawFullRow('University Name', doctor.university_name, curY)

  // Additional Qualifications 1, 2, 3
  const add1 = doctor.additional_qualification_1 || {}
  curY = drawSubBanner('Additional Qualification :- 1', curY)
  curY = drawPairRow('Qualification', add1.qualification || '—', 'Qualification Year', add1.qualification_year || '—', curY)
  curY = drawFullRow('University Name', add1.university_name || '—', curY)

  const add2 = doctor.additional_qualification_2 || {}
  curY = drawSubBanner('Additional Qualification :- 2', curY)
  curY = drawPairRow('Qualification', add2.qualification || '—', 'Qualification Year', add2.qualification_year || '—', curY)
  curY = drawFullRow('University Name', add2.university_name || '—', curY)

  const add3 = doctor.additional_qualification_3 || {}
  curY = drawSubBanner('Additional Qualification :- 3', curY)
  curY = drawPairRow('Qualification', add3.qualification || '—', 'Qualification Year', add3.qualification_year || '—', curY)
  curY = drawFullRow('University Name', add3.university_name || '—', curY)

  if (doctor.permanent_address && doctor.permanent_address !== '—') {
    curY = drawSubBanner('Permanent Address', curY)
    curY = drawFullRow('Permanent Address', doctor.permanent_address, curY)
  }

  // Document Footer
  const footerY = 285
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...cTextMuted)
  doc.text('National Medical Commission · Indian Medical Register (IMR) · Tatito Health+ Digital Verification System', marginX, footerY)
  doc.text(`Ref: NMC-${(doctor.registration_no || 'IMR').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-6)}`, pageWidth - marginX, footerY, { align: 'right' })

  // Convert jsPDF to Blob -> File
  const blob = doc.output('blob')
  const cleanRegNo = String(doctor.registration_no || 'IMR').replace(/[^a-zA-Z0-9_-]/g, '_')
  const fileName = `NMC_IMR_Certificate_${cleanRegNo}.pdf`

  return new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() })
}
