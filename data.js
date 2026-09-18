export const categories = [
  { id: 'medicines', label: 'Medicines', icon: 'file', color: 'coral' },
  { id: 'vitamins', label: 'Vitamins & Supplements', icon: 'spark', color: 'gold' },
  { id: 'wellness', label: 'Wellness', icon: 'heart', color: 'teal' },
  { id: 'personal', label: 'Personal Care', icon: 'shield', color: 'navy' },
  { id: 'devices', label: 'Medical Devices', icon: 'video', color: 'coral' },
  { id: 'essentials', label: 'Healthcare Essentials', icon: 'flask', color: 'teal' },
  { id: 'babycare', label: 'Baby Care', icon: 'heart', color: 'gold' },
  { id: 'diabetes', label: 'Diabetes Care', icon: 'flask', color: 'navy' },
]

export const products = [
  { id: 'p1', name: 'Acetamol 500mg', category: 'medicines', price: 45, mrp: 72, rx: false, manufacturer: 'Tatito Pharma', pack: 'Strip of 10 tablets', rating: 4.5, reviews: 320, desc: 'Effective relief from mild to moderate pain and fever. Each tablet contains 500mg of acetaminophen. Safe for most adults when used as directed.', tags: ['Pain relief', 'Fever', 'OTC'], stock: 'In Stock', initials: 'Ac', color: 'coral' },
  { id: 'p2', name: 'Amoxilin 250mg', category: 'medicines', price: 112, mrp: 135, rx: true, manufacturer: 'Tatito Pharma', pack: 'Strip of 15 capsules', rating: 4.7, reviews: 189, desc: 'Broad-spectrum antibiotic for bacterial infections. Requires a valid prescription from a registered medical practitioner.', tags: ['Antibiotic', 'Prescription required'], stock: 'In Stock', initials: 'Am', color: 'navy' },
  { id: 'p3', name: 'Omeprazol 20mg', category: 'medicines', price: 78, mrp: 99, rx: false, manufacturer: 'Tatito Pharma', pack: 'Strip of 14 capsules', rating: 4.6, reviews: 412, desc: 'Reduces stomach acid production. Used for acid reflux, heartburn and stomach ulcers. Take before meals as directed.', tags: ['Acid reflux', 'Heartburn', 'OTC'], stock: 'In Stock', initials: 'Om', color: 'teal' },
  { id: 'p4', name: 'Vitamin D3 60K IU', category: 'vitamins', price: 89, mrp: 135, rx: false, manufacturer: 'Tatito Wellness', pack: 'Strip of 8 capsules', rating: 4.8, reviews: 670, desc: 'High-strength vitamin D3 supplement for maintaining healthy bones, teeth and immune function. Weekly dosage as prescribed.', tags: ['Bone health', 'Immunity', 'Supplement'], stock: 'In Stock', initials: 'VD', color: 'gold' },
  { id: 'p5', name: 'Vitamin C 1000mg', category: 'vitamins', price: 58, mrp: 90, rx: false, manufacturer: 'Tatito Wellness', pack: 'Bottle of 60 tablets', rating: 4.6, reviews: 890, desc: 'Immune-boosting vitamin C with zinc. Supports collagen formation and acts as a powerful antioxidant. One tablet daily.', tags: ['Immunity', 'Antioxidant', 'Daily'], stock: 'In Stock', initials: 'VC', color: 'gold' },
  { id: 'p6', name: 'Omega-3 Fish Oil', category: 'vitamins', price: 144, mrp: 199, rx: false, manufacturer: 'Tatito Wellness', pack: 'Bottle of 90 softgels', rating: 4.7, reviews: 543, desc: 'Premium omega-3 fatty acids with EPA and DHA for heart, brain and joint health. Mercury-free, molecularly distilled.', tags: ['Heart health', 'Brain function', 'Joint care'], stock: 'In Stock', initials: 'O3', color: 'teal' },
  { id: 'p7', name: 'Multivitamin Complete', category: 'vitamins', price: 171, mrp: 234, rx: false, manufacturer: 'Tatito Wellness', pack: 'Bottle of 120 tablets', rating: 4.5, reviews: 1200, desc: 'Comprehensive daily multivitamin with 23 essential vitamins and minerals. Supports energy, immunity and overall wellness.', tags: ['Daily', 'Energy', 'Complete nutrition'], stock: 'In Stock', initials: 'MV', color: 'coral' },
  { id: 'p8', name: 'Digital Thermometer', category: 'devices', price: 117, mrp: 171, rx: false, manufacturer: 'Tatito Devices', pack: '1 unit', rating: 4.4, reviews: 234, desc: 'Fast and accurate digital thermometer with flexible tip. Gives reading in 10 seconds. Memory recall of last measurement.', tags: ['Fever monitoring', 'Digital', 'Fast reading'], stock: 'In Stock', initials: 'DT', color: 'navy' },
  { id: 'p9', name: 'Blood Pressure Monitor', category: 'devices', price: 2249, mrp: 3149, rx: false, manufacturer: 'Tatito Devices', pack: '1 unit with cuff', rating: 4.7, reviews: 456, desc: 'Automatic upper-arm blood pressure monitor with large LCD display. Stores 90 readings. Clinically validated accuracy.', tags: ['BP monitor', 'Automatic', 'Memory'], stock: 'Low Stock', initials: 'BP', color: 'coral' },
  { id: 'p10', name: 'Pulse Oximeter', category: 'devices', price: 1124, mrp: 1574, rx: false, manufacturer: 'Tatito Devices', pack: '1 unit', rating: 4.6, reviews: 389, desc: 'Fingertip pulse oximeter measures blood oxygen saturation (SpO2) and pulse rate. Bright OLED display. Lightweight and portable.', tags: ['SpO2', 'Pulse rate', 'Portable'], stock: 'In Stock', initials: 'PO', color: 'teal' },
  { id: 'p11', name: 'Glucometer Kit', category: 'devices', price: 1349, mrp: 1799, rx: false, manufacturer: 'Tatito Devices', pack: 'Kit with 25 strips', rating: 4.5, reviews: 567, desc: 'Complete blood glucose monitoring system with meter, 25 test strips, lancets and carrying case. Results in 5 seconds.', tags: ['Diabetes care', 'Blood sugar', 'Kit'], stock: 'In Stock', initials: 'GL', color: 'navy' },
  { id: 'p12', name: 'Antiseptic Solution 500ml', category: 'essentials', price: 54, mrp: 77, rx: false, manufacturer: 'Tatito Essentials', pack: '500ml bottle', rating: 4.5, reviews: 230, desc: 'Broad-spectrum antiseptic for wound cleaning and disinfection. Dilute before use. Safe for external use only.', tags: ['First aid', 'Wound care', 'Antiseptic'], stock: 'In Stock', initials: 'AS', color: 'gold' },
  { id: 'p13', name: 'N95 Masks (Pack of 10)', category: 'essentials', price: 135, mrp: 198, rx: false, manufacturer: 'Tatito Essentials', pack: 'Pack of 10', rating: 4.6, reviews: 1500, desc: 'Medical-grade N95 respirator masks with 95% filtration efficiency. Comfortable fit with adjustable nose clip. 5-ply construction.', tags: ['Protection', 'Respirator', 'Pack'], stock: 'In Stock', initials: 'N9', color: 'teal' },
  { id: 'p14', name: 'Hand Sanitizer 250ml', category: 'essentials', price: 36, mrp: 54, rx: false, manufacturer: 'Tatito Essentials', pack: '250ml bottle', rating: 4.4, reviews: 980, desc: '70% alcohol-based hand sanitizer with moisturizer. Kills 99.9% of germs. Non-sticky, quick-drying formula with aloe vera.', tags: ['Hygiene', 'Germ protection', 'Pocket-friendly'], stock: 'In Stock', initials: 'HS', color: 'coral' },
  { id: 'p15', name: 'First Aid Kit', category: 'essentials', price: 179, mrp: 260, rx: false, manufacturer: 'Tatito Essentials', pack: '120 pieces', rating: 4.7, reviews: 345, desc: 'Complete first aid kit with 120 essential pieces. Includes bandages, gauze, antiseptic, scissors, tweezers and more. Compact carry case.', tags: ['Emergency', 'First aid', 'Travel-safe'], stock: 'In Stock', initials: 'FA', color: 'navy' },
  { id: 'p16', name: 'Hand Cream with Aloe', category: 'personal', price: 67, mrp: 99, rx: false, manufacturer: 'Tatito Care', pack: '100ml tube', rating: 4.5, reviews: 412, desc: 'Nourishing hand cream with aloe vera and shea butter. Non-greasy formula for soft, hydrated skin. Dermatologically tested.', tags: ['Skincare', 'Moisturizing', 'Daily use'], stock: 'In Stock', initials: 'HC', color: 'gold' },
  { id: 'p17', name: 'Herbal Sleep Support', category: 'wellness', price: 108, mrp: 153, rx: false, manufacturer: 'Tatito Wellness', pack: 'Bottle of 60 capsules', rating: 4.3, reviews: 234, desc: 'Natural sleep aid with melatonin, valerian root and chamomile. Promotes restful sleep without grogginess. Non-habit forming.', tags: ['Sleep', 'Natural', 'Non-habit forming'], stock: 'In Stock', initials: 'SL', color: 'teal' },
  { id: 'p18', name: 'Probiotic Complex', category: 'wellness', price: 126, mrp: 180, rx: false, manufacturer: 'Tatito Wellness', pack: 'Bottle of 30 capsules', rating: 4.6, reviews: 367, desc: 'Advanced probiotic blend with 10 billion CFU and 8 strains. Supports gut health, digestion and immune function.', tags: ['Gut health', 'Digestion', 'Immunity'], stock: 'In Stock', initials: 'PB', color: 'coral' },
  { id: 'p19', name: 'Ibuprofen Syrup 100ml', category: 'medicines', price: 63, mrp: 86, rx: false, manufacturer: 'Tatito Pharma', pack: '100ml bottle', rating: 4.5, reviews: 178, desc: 'Pediatric pain and fever reliever. Strawberry flavor for easy administration. Always follow dosage instructions based on age and weight.', tags: ['Pediatric', 'Pain relief', 'Fever'], stock: 'Low Stock', initials: 'Ib', color: 'navy' },
  { id: 'p20', name: 'Cough Relief Syrup 120ml', category: 'medicines', price: 67, mrp: 99, rx: false, manufacturer: 'Tatito Pharma', pack: '120ml bottle', rating: 4.4, reviews: 289, desc: 'Multi-symptom cough relief suppressant. Soothes throat irritation and reduces cough frequency. Suitable for adults and children over 6.', tags: ['Cough', 'Throat relief', 'OTC'], stock: 'In Stock', initials: 'Co', color: 'gold' },
  { id: 'p21', name: 'Baby Vitamin D Drops', category: 'babycare', price: 81, mrp: 117, rx: false, manufacturer: 'Tatito Baby', pack: '30ml bottle', rating: 4.6, reviews: 234, desc: 'Essential vitamin D drops for infants and toddlers. Supports healthy bone development and immune function. One drop daily.', tags: ['Infant', 'Bone development', 'Daily'], stock: 'In Stock', initials: 'BD', color: 'gold' },
  { id: 'p22', name: 'Diabetic Protein Powder', category: 'diabetes', price: 207, mrp: 270, rx: false, manufacturer: 'Tatito Diabetes Care', pack: '400g jar', rating: 4.5, reviews: 178, desc: 'Sugar-free protein powder specially formulated for diabetics. High protein, low glycemic index. Supports muscle health without spiking blood sugar.', tags: ['Sugar-free', 'High protein', 'Low GI'], stock: 'In Stock', initials: 'DP', color: 'navy' },
]

export const doctorHealthChecks = [
  { id: 'fullbody', name: 'Full Body Checkup', icon: 'spark', color: 'teal', tag: 'Popular' },
  { id: 'diabetes', name: 'Diabetes Care', icon: 'flask', color: 'coral', tag: '10-Hr Report' },
  { id: 'heart', name: 'Heart Check', icon: 'heart', color: 'coral', tag: 'Essential' },
  { id: 'blood', name: 'Blood Studies', icon: 'flask', color: 'navy', tag: 'CBC & Hb' },
  { id: 'vitamin', name: 'Vitamin & D3', icon: 'spark', color: 'gold', tag: 'Best Seller' },
  { id: 'thyroid', name: 'Thyroid Care', icon: 'flask', color: 'teal', tag: '33 Tests' },
  { id: 'kidney', name: 'Kidney (KFT)', icon: 'shield', color: 'navy', tag: 'KFT & RFT' },
  { id: 'liver', name: 'Liver (LFT)', icon: 'flask', color: 'gold', tag: 'LFT Complete' },
  { id: 'women', name: "Women's Health", icon: 'user', color: 'coral', tag: 'PCOD & Wellness' },
  { id: 'senior', name: 'Senior Citizen', icon: 'heart', color: 'teal', tag: 'Full Care' },
  { id: 'taxsaver', name: 'Tax Saver 80D', icon: 'file', color: 'navy', tag: 'Claim ₹75k' },
  { id: 'fever', name: 'Fever Panel', icon: 'phone', color: 'coral', tag: 'Dengue & Malaria' },
]

export const vitalOrgans = [
  { id: 'thyroid', name: 'Thyroid', icon: 'flask', color: 'teal' },
  { id: 'heart', name: 'Heart', icon: 'heart', color: 'coral' },
  { id: 'joint', name: 'Joint Pain', icon: 'shield', color: 'gold' },
  { id: 'kidney', name: 'Kidney', icon: 'flask', color: 'navy' },
  { id: 'liver', name: 'Liver', icon: 'flask', color: 'coral' },
  { id: 'bone', name: 'Bone & Joint', icon: 'shield', color: 'teal' },
  { id: 'brain', name: 'Brain & Nerves', icon: 'spark', color: 'navy' },
  { id: 'lungs', name: 'Lungs & Asthma', icon: 'phone', color: 'gold' },
]

export const labPackages = [
  { id: 'pkg1', name: 'Tatito Prime Health Plan', tests: 68, testsIncluded: 'GLUCOSE, FASTING, LIPID PROFILE, LFT, KFT, THYROID', price: 2189, mrp: 5472, discount: 60, reportTime: '12 hours', badge: 'POPULAR PACKAGE', color: 'teal', initials: 'TP' },
  { id: 'pkg2', name: 'Tatito Fever Panel Complete', tests: 59, testsIncluded: 'DENGUE, MALARIA, TYPHOID, CBC, ESR, URINE', price: 2119, mrp: 5297, discount: 60, reportTime: '24 hours', badge: 'FEVER SPECIAL', color: 'coral', initials: 'FP' },
  { id: 'pkg3', name: 'Tatito Thyroid Assessment - Basic', tests: 33, testsIncluded: 'THYROXINE (T4, TOTAL), T3, TSH, LIPID', price: 899, mrp: 2247, discount: 60, reportTime: '12 hours', badge: 'BEST VALUE', color: 'navy', initials: 'TA' },
  { id: 'pkg4', name: 'Tatito Vitamin Check - Basic', tests: 3, testsIncluded: 'CALCIUM, SERUM, VITAMIN D25, VITAMIN B12', price: 2269, mrp: 5672, discount: 60, reportTime: '10 hours', badge: 'BEST PRICE EVER!', color: 'gold', initials: 'VC' },
  { id: 'pkg5', name: 'Tatito Hairfall Check Advance Female', tests: 60, testsIncluded: 'IRON, FERRITIN, HORMONES, VITAMIN D, THYROID', price: 6759, mrp: 16897, discount: 60, reportTime: '24 hours', badge: 'VALUE FOR MONEY', color: 'coral', initials: 'HC' },
]

export const labTests = [
  { id: 't1', name: 'CBC Test (Complete Blood Count)', tests: 30, price: 449, mrp: 1122, reportTime: '10 hours', desc: 'Comprehensive blood test to evaluate overall health and detect a wide range of blood disorders.', color: 'coral', initials: 'CB', badge: '10-Hour Report Guarantee' },
  { id: 't2', name: 'HbA1c Test (Hemoglobin A1c)', tests: 3, price: 689, mrp: 1722, reportTime: '10 hours', desc: 'Measures average blood sugar levels over the past 2-3 months. Key test for diabetes management.', color: 'navy', initials: 'Hb', badge: '10-Hour Report Guarantee' },
  { id: 't3', name: 'FBS (Fasting Blood Sugar) Test', tests: 1, price: 109, mrp: 272, reportTime: '10 hours', desc: 'Measures blood glucose after fasting. Used to diagnose and monitor diabetes.', color: 'teal', initials: 'FB', badge: '10-Hour Report Guarantee' },
  { id: 't4', name: 'Lipid Profile Test', tests: 8, price: 919, mrp: 2298, reportTime: '10 hours', desc: 'Measures cholesterol and triglycerides to assess cardiovascular health and heart disease risk.', color: 'gold', initials: 'LP', badge: '10-Hour Report Guarantee' },
  { id: 't5', name: 'Liver Function Test (LFT)', tests: 11, price: 919, mrp: 2298, reportTime: '10 hours', desc: 'Evaluates liver health by measuring enzymes, proteins and bilirubin levels in the blood.', color: 'coral', initials: 'LF', badge: '10-Hour Report Guarantee' },
  { id: 't6', name: 'Kidney Function Test (KFT)', tests: 14, price: 1129, mrp: 2822, reportTime: '10 hours', desc: 'Assesses kidney function by measuring waste products and electrolytes in the blood.', color: 'navy', initials: 'KF', badge: '10-Hour Report Guarantee' },
  { id: 't7', name: 'Thyroid Profile Test (T3 T4 TSH)', tests: 3, price: 599, mrp: 1499, reportTime: '24 hours', desc: 'Evaluates thyroid gland function by measuring thyroid hormone levels.', color: 'teal', initials: 'TP', badge: 'Fast Delivery' },
  { id: 't8', name: 'Vitamin D 25-Hydroxy Test', tests: 1, price: 499, mrp: 1249, reportTime: '24 hours', desc: 'Measures vitamin D levels to assess bone health and immune function.', color: 'gold', initials: 'VD', badge: 'Essential' },
]


export const articles = [
  { id: 'a1', title: '10 Signs You Need to Consult an Orthopaedic', author: 'Tatito Health+', date: 'Aug 11, 2025', category: 'Bone & Joint', initials: 'BJ', color: 'teal' },
  { id: 'a2', title: 'Understanding Blood Test Results: A Complete Guide', author: 'Tatito Health+', date: 'Aug 06, 2025', category: 'Diagnostics', initials: 'BT', color: 'coral' },
  { id: 'a3', title: 'Best Sources of Probiotics for Gut Health', author: 'Tatito Health+', date: 'Aug 01, 2025', category: 'Nutrition', initials: 'PB', color: 'gold' },
  { id: 'a4', title: 'Can Diabetes Be Diagnosed Without Symptoms?', author: 'Tatito Health+', date: 'Jul 24, 2025', category: 'Diabetes', initials: 'DB', color: 'navy' },
  { id: 'a5', title: 'How to Bring Down Your HbA1c Levels Naturally', author: 'Tatito Health+', date: 'Jul 19, 2025', category: 'Diabetes', initials: 'Hb', color: 'coral' },
  { id: 'a6', title: "9 Subtle Signs of Heart Problems You Shouldn't Ignore", author: 'Tatito Health+', date: 'Jul 15, 2025', category: 'Heart Health', initials: 'HT', color: 'teal' },
]

export const doctorSpecialties = [
  { id: 'general-physician', name: 'General Physician', desc: 'Internal medicine, fever, infections & daily care', icon: 'heart', color: 'teal' },
  { id: 'dermatology', name: 'Dermatology', desc: 'Skin, hair, nails & aesthetic care', icon: 'spark', color: 'coral' },
  { id: 'obstetrics', name: 'Obstetrics & Gynaecology', desc: "Women's health, pregnancy & fertility", icon: 'user', color: 'gold' },
  { id: 'orthopaedics', name: 'Orthopaedics', desc: 'Bones, joints, fractures & spine care', icon: 'shield', color: 'navy' },
  { id: 'ent', name: 'ENT Specialist', desc: 'Ear, nose, throat & sinus treatments', icon: 'phone', color: 'teal' },
  { id: 'neurology', name: 'Neurology', desc: 'Brain, nerves, migraine & stroke care', icon: 'spark', color: 'coral' },
  { id: 'cardiology', name: 'Cardiology', desc: 'Heart health, BP & cardiac consultation', icon: 'heart', color: 'coral' },
  { id: 'urology', name: 'Urology', desc: 'Kidney stones, bladder & urinary tract', icon: 'flask', color: 'navy' },
  { id: 'gastroenterology', name: 'Gastroenterology', desc: 'Stomach, liver, digestion & gut health', icon: 'flask', color: 'gold' },
  { id: 'psychiatry', name: 'Psychiatry', desc: 'Mental health, stress, anxiety & sleep', icon: 'user', color: 'teal' },
  { id: 'paediatrics', name: 'Paediatrics', desc: 'Child health, growth & infant care', icon: 'heart', color: 'gold' },
  { id: 'pulmonology', name: 'Pulmonology', desc: 'Lungs, asthma, chest & breathing care', icon: 'shield', color: 'navy' },
  { id: 'endocrinology', name: 'Endocrinology', desc: 'Diabetes, thyroid & hormone specialists', icon: 'spark', color: 'coral' },
  { id: 'nephrology', name: 'Nephrology', desc: 'Kidney health, dialysis & hypertension', icon: 'flask', color: 'teal' },
  { id: 'neurosurgery', name: 'Neurosurgery', desc: 'Spine & brain surgical expertise', icon: 'shield', color: 'navy' },
  { id: 'rheumatology', name: 'Rheumatology', desc: 'Arthritis, joint pain & autoimmune care', icon: 'heart', color: 'gold' },
  { id: 'ophthalmology', name: 'Ophthalmology', desc: 'Eye care, vision & cataract treatment', icon: 'compass', color: 'teal' },
  { id: 'surgical-gastro', name: 'Surgical Gastro', desc: 'Advanced GI & laparo surgeries', icon: 'flask', color: 'coral' },
  { id: 'infectious', name: 'Infectious Disease', desc: 'Viral, bacterial & tropical infections', icon: 'shield', color: 'navy' },
  { id: 'general-surgery', name: 'General & Laparoscopic', desc: 'Hernia, gall bladder & minimally invasive', icon: 'user', color: 'gold' },
  { id: 'psychology', name: 'Psychology', desc: 'Therapy, counseling & emotional wellness', icon: 'user', color: 'teal' },
  { id: 'oncology', name: 'Medical Oncology', desc: 'Cancer care, chemo & tumor treatment', icon: 'shield', color: 'coral' },
  { id: 'diabetology', name: 'Diabetology', desc: 'Blood sugar control & diabetic care', icon: 'spark', color: 'navy' },
  { id: 'dentist', name: 'Dentist', desc: 'Teeth cleaning, root canal & oral surgery', icon: 'heart', color: 'gold' },
]

export const doctorCities = [
  'Delhi', 'Hyderabad', 'Kolkata', 'Chennai', 'Bengaluru', 'Noida', 'Mumbai', 'Pune', 'Gurgaon', 'Vellore', 'Ghaziabad', 'Guwahati'
]

export const doctors = [
  { id: 'd1', name: 'Dr. Maya Chen', specialty: 'General Physician', city: 'Bengaluru', detail: 'MD, FACP · 12 years experience', location: 'Apollo Greams Road, Bengaluru', rating: '4.9', reviews: '128', fee: 400, initials: 'MC', color: 'coral', next: 'Today, 4:30 PM', type: 'Online & In-Person' },
  { id: 'd2', name: 'Dr. Elias Morgan', specialty: 'Cardiology', city: 'Mumbai', detail: 'MD, FACC · 18 years experience', location: 'St. Clement Heart Institute, Mumbai', rating: '4.8', reviews: '96', fee: 550, initials: 'EM', color: 'navy', next: 'Tomorrow, 9:00 AM', type: 'Online & In-Person' },
  { id: 'd3', name: 'Dr. Priya Nair', specialty: 'Dermatology', city: 'Delhi', detail: 'MBBS, DDVL · 9 years experience', location: 'Tatito Skin & Wellness, Delhi', rating: '4.9', reviews: '214', fee: 350, initials: 'PN', color: 'gold', next: 'Today, 6:00 PM', type: 'Online Video' },
  { id: 'd4', name: 'Dr. James Okoro', specialty: 'Paediatrics', city: 'Hyderabad', detail: 'MD, FAAP · 15 years experience', location: 'Apollo Jubilee Hills, Hyderabad', rating: '4.8', reviews: '167', fee: 300, initials: 'JO', color: 'teal', next: 'Tomorrow, 11:00 AM', type: 'Online & In-Person' },
  { id: 'd5', name: 'Dr. Sarah Lin', specialty: 'Psychiatry', city: 'Pune', detail: 'MD · 10 years experience', location: 'Tatito Mental Wellness, Pune', rating: '4.9', reviews: '89', fee: 450, initials: 'SL', color: 'coral', next: 'Today, 7:00 PM', type: 'Online Video' },
  { id: 'd6', name: 'Dr. Robert Kane', specialty: 'Orthopaedics', city: 'Chennai', detail: 'MS Ortho · 20 years experience', location: 'St. Clement Bone & Joint, Chennai', rating: '4.7', reviews: '203', fee: 500, initials: 'RK', color: 'navy', next: 'Tomorrow, 2:00 PM', type: 'In-Person' },
  { id: 'd7', name: 'Dr. Ananya Sharma', specialty: 'Obstetrics & Gynaecology', city: 'Noida', detail: 'MD, DGO · 14 years experience', location: 'Apollo Women Center, Noida', rating: '4.9', reviews: '310', fee: 420, initials: 'AS', color: 'gold', next: 'Today, 5:00 PM', type: 'Online & In-Person' },
  { id: 'd8', name: 'Dr. Vikram Malhotra', specialty: 'Neurology', city: 'Gurgaon', detail: 'DM Neuro · 16 years experience', location: 'Neuro Care Institute, Gurgaon', rating: '4.9', reviews: '175', fee: 600, initials: 'VM', color: 'teal', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=360&q=85', next: 'Tomorrow, 10:30 AM', type: 'Online & In-Person' },
  { id: 'd9', name: 'Dr. Kavita Reddy', specialty: 'Gastroenterology', city: 'Kolkata', detail: 'DM Gastro · 11 years experience', location: 'Apollo Gleneagles, Kolkata', rating: '4.8', reviews: '142', fee: 480, initials: 'KR', color: 'coral', next: 'Today, 6:30 PM', type: 'Online Video' },
  { id: 'd10', name: 'Dr. Siddharth Joshi', specialty: 'ENT Specialist', city: 'Vellore', detail: 'MS ENT · 13 years experience', location: 'Medical Super Center, Vellore', rating: '4.7', reviews: '118', fee: 380, initials: 'SJ', color: 'navy', next: 'Tomorrow, 3:00 PM', type: 'Online & In-Person' },
]

export const cart = []

export const internshipPrograms = [
  {
    id: 'int-1',
    title: 'AI Clinical Diagnostics & Medical LLM Fellowship',
    category: 'Health AI & Data Science',
    type: 'Hybrid / Digital AI Lab',
    duration: '6 Months',
    commitment: '20 hrs / week',
    stipend: '$2,800 / month',
    badge: 'FELLOWSHIP',
    color: 'teal',
    partner: 'Tatito Health AI Lab & Johns Hopkins Network',
    desc: 'Train large vision-language AI models on anonymized DICOM medical imaging, EHR clinical notes, and diagnostic triage algorithms under top AI research scientists.',
    skills: ['Python', 'PyTorch', 'DICOM Imaging', 'Clinical LLMs', 'EHR Pipelines'],
    eligibility: 'MD Students, MS in CS / Bioengineering, Data Science Graduates',
    certification: 'CME Certified Fellow Diploma & Co-Authorship on Peer-Reviewed Papers',
    spotsLeft: 4
  },
  {
    id: 'int-2',
    title: 'Virtual Urgent Care & Telemedicine Clinical Rotation',
    category: 'Clinical Medicine',
    type: 'On-Site & Virtual Triage',
    duration: '3 Months',
    commitment: '25 hrs / week',
    stipend: '$2,400 / month',
    badge: 'CLINICAL ROTATION',
    color: 'coral',
    partner: 'Tatito Virtual Care & Brooklyn Academic Health Center',
    desc: 'Shadow board-certified attending physicians during live 24/7 video consultations, virtual patient triage, prescription audit protocols, and emergency escalation pipelines.',
    skills: ['Virtual Patient Triage', 'EHR Documentation', 'Pharmacology Audit', 'Differential Diagnosis'],
    eligibility: 'Final Year MBBS / MD Candidates, Clinical Residents',
    certification: 'ACLS / BLS Verified Clinical Rotation Certificate & Attending Letter of Rec',
    spotsLeft: 6
  },
  {
    id: 'int-3',
    title: 'Diagnostic Pathology & Genomic Sequencing Program',
    category: 'Pathology & Diagnostics',
    type: 'NABL Certified Lab Facility',
    duration: '6 Months',
    commitment: '30 hrs / week',
    stipend: '$2,600 / month',
    badge: 'LAB PATHOLOGY',
    color: 'navy',
    partner: 'Apollo Diagnostics & Tatito Pathology Hub',
    desc: 'Hands-on training in automated blood chemistry analyzers, histopathology tissue processing, NGS genomic variant classification, and digital lab quality assurance.',
    skills: ['Hematology Analyzers', 'Histopathology', 'Genomic Sequencing', 'ISO 15189 QA'],
    eligibility: 'MD Pathology, MSc Biochemistry / Biotechnology, Lab Tech Graduates',
    certification: 'NABL Accredited Diagnostic Pathologist Certificate',
    spotsLeft: 3
  },
  {
    id: 'int-4',
    title: 'Digital Health Product Management & EHR Ops Track',
    category: 'Healthcare Product & Operations',
    type: 'Remote / NYC HQ',
    duration: '4 Months',
    commitment: '20 hrs / week',
    stipend: '$2,200 / month',
    badge: 'HEALTH TECH OPS',
    color: 'gold',
    partner: 'Tatito Health Product Engineering & Stanford Health AI Hub',
    desc: 'Work at the intersection of clinical care and SaaS product design. Help build real-time doctor scheduling workflows, prescription fulfillment APIs, and patient portal features.',
    skills: ['Figma Healthcare UI', 'HL7 / FHIR Standards', 'User Analytics', 'Clinical Workflows'],
    eligibility: 'MBBS/MBA Dual Degree, Health Informatics Students, CS/Design Seniors',
    certification: 'Executive Health-Tech Product Fellow Certification',
    spotsLeft: 5
  },
  {
    id: 'int-5',
    title: 'Clinical Pharmacology & Pharmacy Fulfillment Internship',
    category: 'Telemedicine & Digital Health',
    type: 'Hybrid Pharmacy Ops',
    duration: '3 Months',
    commitment: '18 hrs / week',
    stipend: '$2,100 / month',
    badge: 'PHARMA CARE',
    color: 'teal',
    partner: 'Tatito Central Pharmacy & WHO-GMP Partner Network',
    desc: 'Gain expertise in cold-chain pharmaceutical logistics, automated pill dispensing, drug-drug interaction screening algorithms, and patient medication adherence counselling.',
    skills: ['Pharmacovigilance', 'Cold-Chain Management', 'Drug Interaction Audits', 'Rx Triage'],
    eligibility: 'PharmD / B.Pharm / M.Pharm Candidates',
    certification: 'WHO-GMP Compliant Clinical Pharmacist Internship Seal',
    spotsLeft: 8
  },
  {
    id: 'int-6',
    title: 'Preventive Cardiology & Remote Patient Monitoring Track',
    category: 'Clinical Medicine',
    type: 'Hybrid Clinical RPM',
    duration: '6 Months',
    commitment: '22 hrs / week',
    stipend: '$2,700 / month',
    badge: 'CARDIOLOGY RPM',
    color: 'coral',
    partner: 'St. Clement Heart Institute & Tatito Wearable Health Team',
    desc: 'Analyze continuous ECG telemetry feeds, smart blood pressure monitor logs, and wearable arrhythmia warnings to assist cardiologists with early interventions.',
    skills: ['ECG Waveform Analysis', 'RPM Sensor Telemetry', 'Cardiovascular Risk Stratification'],
    eligibility: 'MD Cardiology Fellows, Biomedical Engineering Postgrads',
    certification: 'Preventive Tele-Cardiology Fellowship Certificate',
    spotsLeft: 4
  }
]


