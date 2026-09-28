export const practiceTypes = [
  'Hospital',
  'Private Clinic',
  'Government Hospital',
  'Corporate Hospital',
  'Medical College / Teaching Hospital',
  'Diagnostic Center',
  'Telemedicine',
  'Other'
]

export const experienceOptions = [
  '0–2 Years',
  '3–5 Years',
  '6–10 Years',
  '10+ Years'
]

export const positionRoleOptions = [
  'General Physician',
  'Specialist',
  'Consultant',
  'Senior Consultant',
  'Surgeon',
  'Resident Doctor',
  'Medical Officer',
  'Intern',
  'Professor / Faculty',
  'Other'
]

export const primarySpecializations = [
  'General Medicine',
  'General Surgery',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Neurosurgery',
  'Orthopedics',
  'Pediatrics',
  'Obstetrics & Gynecology',
  'Psychiatry',
  'Pulmonology',
  'Gastroenterology',
  'Nephrology',
  'Urology',
  'Oncology',
  'Ophthalmology',
  'ENT',
  'Endocrinology',
  'Rheumatology',
  'Radiology',
  'Anesthesiology',
  'Pathology',
  'Emergency Medicine',
  'Family Medicine',
  'Dental',
  'Other'
]

export const primaryToSubSpecializations = {
  'General Medicine': [
    'Infectious Diseases',
    'Geriatric Medicine',
    'Critical Care',
    'Internal Medicine',
    'Preventive Healthcare',
    'Other'
  ],
  'General Surgery': [
    'Gastrointestinal Surgery',
    'Laparoscopic Surgery',
    'Colorectal Surgery',
    'Endocrine Surgery',
    'Trauma Surgery',
    'Other'
  ],
  'Cardiology': [
    'Interventional Cardiology',
    'Pediatric Cardiology',
    'Electrophysiology',
    'Heart Failure & Transplant',
    'Preventive Cardiology',
    'Other'
  ],
  'Dermatology': [
    'Clinical Dermatology',
    'Cosmetic Dermatology',
    'Hair & Scalp Disorders',
    'Dermatosurgery',
    'Pediatric Dermatology',
    'Other'
  ],
  'Neurology': [
    'Stroke Management',
    'Epilepsy',
    'Movement Disorders',
    'Neuro-immunology',
    'Neuromuscular Medicine',
    'Other'
  ],
  'Neurosurgery': [
    'Spine Surgery',
    'Brain Tumor Surgery',
    'Cerebrovascular Surgery',
    'Pediatric Neurosurgery',
    'Stereotactic Neurosurgery',
    'Other'
  ],
  'Orthopedics': [
    'Joint Replacement',
    'Sports Medicine',
    'Pediatric Orthopedics',
    'Spine Orthopedics',
    'Trauma & Fracture Surgery',
    'Other'
  ],
  'Pediatrics': [
    'Neonatology',
    'Pediatric Intensive Care',
    'Pediatric Cardiology',
    'Pediatric Nephrology',
    'Developmental Pediatrics',
    'Other'
  ],
  'Obstetrics & Gynecology': [
    'High-Risk Pregnancy',
    'Infertility',
    'Gynecologic Oncology',
    'Fetal Medicine',
    'Minimally Invasive Surgery',
    'Other'
  ],
  'Psychiatry': [
    'Child & Adolescent Psychiatry',
    'Addiction Psychiatry',
    'Geriatric Psychiatry',
    'Neuropsychiatry',
    'Other'
  ],
  'Pulmonology': [
    'Pulmonary & Critical Care',
    'Sleep Medicine',
    'Interventional Pulmonology',
    'Interstitial Lung Disease',
    'Other'
  ],
  'Gastroenterology': [
    'Hepatology',
    'Advanced Therapeutic Endoscopy',
    'Inflammatory Bowel Disease (IBD)',
    'Gastrointestinal Motility',
    'Other'
  ],
  'Nephrology': [
    'Kidney Disease',
    'Dialysis',
    'Kidney Transplantation',
    'Interventional Nephrology',
    'Other'
  ],
  'Urology': [
    'Urological Surgery',
    'Endourology & Stone Disease',
    'Uro-Oncology',
    'Andrology & Male Infertility',
    'Other'
  ],
  'Oncology': [
    'Medical Oncology',
    'Surgical Oncology',
    'Radiation Oncology',
    'Hematology-Oncology',
    'Other'
  ],
  'Ophthalmology': [
    'Cataract Surgery',
    'Retina & Vitreous',
    'Cornea & Refractive Surgery',
    'Glaucoma',
    'Pediatric Ophthalmology',
    'Other'
  ],
  'ENT': [
    'ENT Surgery',
    'Rhinology & Skull Base',
    'Otology & Neurotology',
    'Head & Neck Surgery',
    'Other'
  ],
  'Endocrinology': [
    'Diabetes & Metabolism',
    'Thyroid Disorders',
    'Bone & Mineral Metabolism',
    'Other'
  ],
  'Rheumatology': [
    'Autoimmune Diseases',
    'Arthritis Care',
    'Vasculitis',
    'Other'
  ],
  'Radiology': [
    'Diagnostic Radiology',
    'Interventional Radiology',
    'Neuroradiology',
    'Musculoskeletal Radiology',
    'Other'
  ],
  'Anesthesiology': [
    'Pain Management',
    'Cardiac Anesthesia',
    'Neuroanesthesia',
    'Critical Care Medicine',
    'Other'
  ],
  'Pathology': [
    'Histopathology',
    'Hematopathology',
    'Cytopathology',
    'Molecular Pathology',
    'Other'
  ],
  'Emergency Medicine': [
    'Emergency Care',
    'Trauma Resuscitation',
    'Toxicology',
    'Other'
  ],
  'Family Medicine': [
    'Primary Care',
    'Community Health',
    'Preventive Care',
    'Other'
  ],
  'Dental': [
    'Orthodontics',
    'Periodontics',
    'Prosthodontics',
    'Oral & Maxillofacial Surgery',
    'Endodontics',
    'Pedodontics',
    'Other'
  ],
  'Other': [
    'Other'
  ]
}

export const getSubSpecializationsForPrimary = (primaries = []) => {
  const primaryList = Array.isArray(primaries) ? primaries : (primaries ? [primaries] : [])
  if (!primaryList.length) {
    return []
  }
  const result = new Set()
  primaryList.forEach(p => {
    const subs = primaryToSubSpecializations[p] || []
    subs.forEach(s => result.add(s))
  })
  if (!result.has('Other')) result.add('Other')
  return Array.from(result)
}

export const subSpecializations = [
  'Interventional Cardiology',
  'Pediatric Cardiology',
  'Clinical Dermatology',
  'Cosmetic Dermatology',
  'Hair & Scalp Disorders',
  'Stroke Management',
  'Epilepsy',
  'Spine Surgery',
  'Joint Replacement',
  'Sports Medicine',
  'Pediatric Orthopedics',
  'High-Risk Pregnancy',
  'Infertility',
  'Gynecologic Oncology',
  'Neonatology',
  'Pediatric Surgery',
  'Gastrointestinal Surgery',
  'Hepatology',
  'Kidney Disease',
  'Dialysis',
  'Urological Surgery',
  'Medical Oncology',
  'Surgical Oncology',
  'Radiation Oncology',
  'Diabetes & Metabolism',
  'Thyroid Disorders',
  'Pulmonary & Critical Care',
  'Sleep Medicine',
  'Pain Management',
  'Child & Adolescent Psychiatry',
  'Plastic & Reconstructive Surgery',
  'Cataract Surgery',
  'Retina & Vitreous',
  'Cornea & Refractive Surgery',
  'ENT Surgery',
  'Infectious Diseases',
  'Geriatric Medicine',
  'Critical Care',
  'Emergency Care',
  'Preventive Healthcare',
  'Other'
]

export const medicalServicesList = [
  'Medical Certificates',
  'Fitness Certificates',
  'Sick Leave Certificates',
  'Prescription Services',
  'Referral Letters',
  'Health Reports',
  'Medical Reports',
  'Disability Certificates',
  'Insurance Medical Reports',
  'Pre-Employment Medical Examination',
  'Vaccination Certificates',
  'Other'
]

export const workTypes = [
  'Clinical Practice',
  'Hospital Practice',
  'Private Practice',
  'Government Service',
  'Academic / Teaching',
  'Research',
  'Corporate Healthcare',
  'Telemedicine',
  'Medical Consultancy',
  'Other'
]

export const medicalQualificationsList = [
  'MBBS',
  'MD',
  'MS',
  'DNB',
  'DM',
  'M.Ch',
  'BDS',
  'MDS',
  'BAMS',
  'BHMS',
  'BUMS',
  'Other'
]

export const languagesList = [
  'Assamese',
  'Bengali',
  'Bodo',
  'Dogri',
  'English',
  'Gujarati',
  'Hindi',
  'Kannada',
  'Kashmiri',
  'Konkani',
  'Maithili',
  'Malayalam',
  'Manipuri',
  'Marathi',
  'Nepali',
  'Odia',
  'Punjabi',
  'Sanskrit',
  'Santali',
  'Sindhi',
  'Tamil',
  'Telugu',
  'Urdu'
]
