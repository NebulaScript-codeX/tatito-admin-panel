export const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' }
]

const translations = {

  /* ======================================================
     ENGLISH
  ====================================================== */

  en: {
    doctors: 'Doctors',
    pharmacy: 'Pharmacy',
    labTests: 'Lab Tests',
    healthPlans: 'Health Plans',
    healthRecords: 'Health Records',
    internships: 'Internships',
    trackOrders: 'Track Your Orders',

    searchPlaceholder: 'Search doctors, medicines, lab tests, imaging...',
    homeSearchPlaceholder: 'Search doctors, medicines, lab tests, imaging, conditions...',
    search: 'Search',

    cart: 'Cart',
    login: 'Login',
    register: 'Register',
    notifications: 'Notifications',
    location: 'Brooklyn, NY',

    announcementOne: 'Care that moves with you',
    announcementTwo: '24/7 virtual care & emergency support ready',

    homeKicker: '01 / DIGITAL HEALTH ECOSYSTEM',
    virtualCare: '24/7 Virtual Care Active',

    heroTitle: 'Complete healthcare,',
    heroTitleSecond: 'one platform.',
    heroDescription: 'Consult top doctors, order authentic medicines, book lab tests & imaging, and manage your health records — all in one connected super-app.',

    popularSearches: 'Popular Searches:',
    findDoctor: 'Find Doctor',
    orderMedicines: 'Order Medicines',
    bookDiagnostics: 'Book Diagnostics',
    emergency: '24/7 Emergency',

    whoCertified: 'WHO-GMP Certified',
    dispatch: '30-Min Dispatch',
    verifiedSpecialists: 'Verified Specialists',
    authenticMedicines: 'Authentic Medicines',
    labReports: 'Lab Test Reports',
    viewHealthRecords: 'View Encrypted Health Records',

    expressCare: '30-Min Express',
    expressGuarantee: '10-Hour Guarantee',

    consultDoctor: 'Consult a Doctor',
    onlineInPerson: 'Online & In-Person',
    buyMedicines: 'Buy Medicines',
    expressDelivery: 'Express Delivery',
    bookLabTests: 'Book Lab Tests',
    homeCollection: 'Home Collection',
    uploadRx: 'Upload Prescription',
    snapOrder: 'Snap & Order',
    xrayImaging: 'X-Ray & Imaging',
    ctMriRadiology: 'CT, MRI & Radiology',
    healthRecordsShort: 'Health Records',
    encryptedHistory: 'Encrypted History',
    healthPlansShort: 'Health Plans',
    familySubscriptions: 'Family Subscriptions',
    urgentCare: 'Urgent Care',

    prescriptionAssistant: 'PRESCRIPTION ASSISTANT',
    doctorsPrescription: "Doctor's Prescription, Simplified",
    prescriptionDescription: 'Upload your prescription and let our verified pharmacists prepare your medicines and deliver them to your doorstep.',
    snapOrDragRx: 'Snap or drag prescription',
    pharmacistVerification: 'Pharmacist verification',
    doorstepDelivery: 'Doorstep delivery',
    licensedPharmacists: 'Licensed pharmacists',
    hundredAuthentic: '100% authentic medicines',
    thirtyMinDelivery: '30-min delivery',
    snapOrDragDropRx: 'Snap or drag & drop your prescription',
    fileTypes: 'JPG, PNG or PDF',
    uploadPrescription: 'Upload Prescription',

    exclusiveOffers: 'EXCLUSIVE OFFERS',
    featuredPromotions: 'Featured Promotions',
    exploreAllOffers: 'Explore All Offers',
    upTo40Off: 'UP TO 40% OFF',
    vitaminsSupplements: 'Vitamins & Supplements',
    vitaminsDescription: 'Daily wellness essentials at special prices.',
    shopNow: 'Shop Now',

    sixtyOffPackage: 'UP TO 60% OFF',
    fullBodyCheckup: 'Full Body Checkup',
    checkupDescription: 'Comprehensive health packages with trusted diagnostics.',
    bookPackage: 'Book Package',

    freeDelivery: 'FREE DELIVERY',
    expressMedicineDelivery: 'Express Medicine Delivery',
    deliveryDescription: 'Get authentic medicines delivered quickly to your doorstep.',
    orderMedicine: 'Order Medicine',

    diagnosticsImaging: 'DIAGNOSTICS & IMAGING',
    topBookedTests: 'Top Booked Lab Tests & Scans',
    viewAllDiagnostics: 'View All Diagnostics',
    fullBody: 'Full Body',
    heartCheck: 'Heart Check',
    diabetesCare: 'Diabetes Care',
    thyroidAssessment: 'Thyroid Assessment',
    xrayScans: 'X-Ray & Scans',

    pharmacyEcosystem: 'PHARMACY ECOSYSTEM',
    exploreByCategory: 'Explore by Category',
    viewPharmacy: 'View Pharmacy',

    medicinesWellness: 'MEDICINES & WELLNESS',
    trendingEssentials: 'Trending Essentials',
    browseMedicines: 'Browse Medicines',

    doctorConsultation: 'DOCTOR CONSULTATION',
    consultTopDoctors: 'Consult Top Doctors',
    findAllDoctors: 'Find All Doctors',

    personalHealthSnapshot: 'PERSONAL HEALTH SNAPSHOT',
    welcomeBack: 'Welcome back,',
    openDashboard: 'Open Dashboard',
    healthScore: 'Health Score',
    optimalVitals: 'Optimal vitals',
    labReportsCount: '12 Lab Reports',
    annualPanel: 'Annual health panel',
    prescriptionsCount: '8 Prescriptions',
    digitalArchive: 'Digital archive',

    medicalInsights: 'MEDICAL INSIGHTS',
    healthArticles: 'Health Articles',
    forYou: 'for You',
    readAllArticles: 'Read All Articles',

    emergencyHotline: '24/7 Emergency Care',
    emergencyDescription: 'Get immediate medical assistance whenever you need it.',
    callEmergency: 'Call Emergency',

    off: 'OFF',
    rxRequired: 'Rx Required',
    lowStock: 'Low Stock',
    saveWishlist: 'Save to wishlist',
    quickView: 'Quick View',
    reviews: 'reviews',
    decreaseQuantity: 'Decrease quantity',
    increaseQuantity: 'Increase quantity',
    add: 'Add',

    testsIncluded: 'tests included',
    report: 'report',
    bookTest: 'Book Test',

    perVisit: 'per visit',
    next: 'Next',
    bookAppointment: 'Book Appointment',

    saved: 'Saved',
    signedOut: 'Signed out',
    removedWishlist: 'Removed from wishlist',
    savedWishlist: 'Saved to wishlist',

    home: 'Home',
    findDoctors: 'Find Doctors',
    talkToDoctor: 'Talk to a Doctor for',
    instant: 'Instant',
    advice: 'advice',
    doctorHeroDescription: 'Connect with top-rated specialists within 15 minutes. 24/7 video consultation, private & secure care.',
    consultNow: 'Consult Now',
    specialties: 'Specialties',
    browseBy: 'Browse by',
    medical: 'Medical',
    specialtiesDescription: 'Choose from 24+ medical specialties for targeted health care',
  },


  /* ======================================================
     HINDI
  ====================================================== */

  hi: {
    doctors: 'डॉक्टर',
    pharmacy: 'फार्मेसी',
    labTests: 'लैब टेस्ट',
    healthPlans: 'हेल्थ प्लान',
    healthRecords: 'हेल्थ रिकॉर्ड',
    internships: 'इंटर्नशिप',
    trackOrders: 'अपने ऑर्डर ट्रैक करें',

    searchPlaceholder: 'डॉक्टर, दवाइयाँ, लैब टेस्ट, इमेजिंग खोजें...',
    homeSearchPlaceholder: 'डॉक्टर, दवाइयाँ, लैब टेस्ट, इमेजिंग, बीमारियाँ खोजें...',
    search: 'खोजें',

    cart: 'कार्ट',
    login: 'लॉगिन',
    register: 'रजिस्टर',
    notifications: 'सूचनाएँ',
    location: 'ब्रुकलिन, न्यूयॉर्क',

    announcementOne: 'आपकी देखभाल, आपके साथ',
    announcementTwo: '24/7 वर्चुअल केयर और आपातकालीन सहायता उपलब्ध',

    homeKicker: '01 / डिजिटल हेल्थ इकोसिस्टम',
    virtualCare: '24/7 वर्चुअल केयर सक्रिय',

    heroTitle: 'संपूर्ण स्वास्थ्य सेवा,',
    heroTitleSecond: 'एक ही प्लेटफॉर्म।',
    heroDescription: 'शीर्ष डॉक्टरों से परामर्श लें, असली दवाइयाँ ऑर्डर करें, लैब टेस्ट और इमेजिंग बुक करें और अपने स्वास्थ्य रिकॉर्ड प्रबंधित करें — सब एक ही प्लेटफॉर्म पर।',

    popularSearches: 'लोकप्रिय खोज:',
    findDoctor: 'डॉक्टर खोजें',
    orderMedicines: 'दवाइयाँ ऑर्डर करें',
    bookDiagnostics: 'डायग्नोस्टिक्स बुक करें',
    emergency: '24/7 आपातकाल',

    whoCertified: 'WHO-GMP प्रमाणित',
    dispatch: '30 मिनट डिलीवरी',
    verifiedSpecialists: 'सत्यापित विशेषज्ञ',
    authenticMedicines: 'असली दवाइयाँ',
    labReports: 'लैब टेस्ट रिपोर्ट',
    viewHealthRecords: 'एन्क्रिप्टेड स्वास्थ्य रिकॉर्ड देखें',

    expressCare: '30 मिनट एक्सप्रेस',
    expressGuarantee: '10 घंटे की गारंटी',

    consultDoctor: 'डॉक्टर से परामर्श',
    onlineInPerson: 'ऑनलाइन और व्यक्तिगत',
    buyMedicines: 'दवाइयाँ खरीदें',
    expressDelivery: 'एक्सप्रेस डिलीवरी',
    bookLabTests: 'लैब टेस्ट बुक करें',
    homeCollection: 'घर से सैंपल कलेक्शन',
    uploadRx: 'प्रिस्क्रिप्शन अपलोड करें',
    snapOrder: 'फोटो लें और ऑर्डर करें',
    xrayImaging: 'एक्स-रे और इमेजिंग',
    ctMriRadiology: 'CT, MRI और रेडियोलॉजी',
    healthRecordsShort: 'स्वास्थ्य रिकॉर्ड',
    encryptedHistory: 'एन्क्रिप्टेड हिस्ट्री',
    healthPlansShort: 'हेल्थ प्लान',
    familySubscriptions: 'फैमिली सब्सक्रिप्शन',
    urgentCare: 'तुरंत चिकित्सा सहायता',

    prescriptionAssistant: 'प्रिस्क्रिप्शन असिस्टेंट',
    doctorsPrescription: 'डॉक्टर का प्रिस्क्रिप्शन, आसान तरीके से',
    prescriptionDescription: 'अपना प्रिस्क्रिप्शन अपलोड करें और हमारे सत्यापित फार्मासिस्ट आपकी दवाइयाँ तैयार करके आपके घर तक पहुँचाएँगे।',
    snapOrDragRx: 'प्रिस्क्रिप्शन की फोटो लें या खींचें',
    pharmacistVerification: 'फार्मासिस्ट द्वारा सत्यापन',
    doorstepDelivery: 'घर तक डिलीवरी',
    licensedPharmacists: 'लाइसेंस प्राप्त फार्मासिस्ट',
    hundredAuthentic: '100% असली दवाइयाँ',
    thirtyMinDelivery: '30 मिनट डिलीवरी',
    snapOrDragDropRx: 'प्रिस्क्रिप्शन की फोटो लें या ड्रैग और ड्रॉप करें',
    fileTypes: 'JPG, PNG या PDF',
    uploadPrescription: 'प्रिस्क्रिप्शन अपलोड करें',

    exclusiveOffers: 'विशेष ऑफर',
    featuredPromotions: 'खास प्रमोशन',
    exploreAllOffers: 'सभी ऑफर देखें',
    upTo40Off: '40% तक की छूट',
    vitaminsSupplements: 'विटामिन और सप्लीमेंट्स',
    vitaminsDescription: 'दैनिक स्वास्थ्य उत्पाद विशेष कीमतों पर।',
    shopNow: 'अभी खरीदें',

    sixtyOffPackage: '60% तक की छूट',
    fullBodyCheckup: 'फुल बॉडी चेकअप',
    checkupDescription: 'विश्वसनीय डायग्नोस्टिक्स के साथ व्यापक स्वास्थ्य पैकेज।',
    bookPackage: 'पैकेज बुक करें',

    freeDelivery: 'मुफ्त डिलीवरी',
    expressMedicineDelivery: 'एक्सप्रेस मेडिसिन डिलीवरी',
    deliveryDescription: 'असली दवाइयाँ जल्दी आपके घर तक पहुँचाएँ।',
    orderMedicine: 'दवा ऑर्डर करें',

    diagnosticsImaging: 'डायग्नोस्टिक्स और इमेजिंग',
    topBookedTests: 'सबसे ज्यादा बुक किए गए लैब टेस्ट और स्कैन',
    viewAllDiagnostics: 'सभी डायग्नोस्टिक्स देखें',
    fullBody: 'फुल बॉडी',
    heartCheck: 'हार्ट चेक',
    diabetesCare: 'डायबिटीज केयर',
    thyroidAssessment: 'थायरॉइड जांच',
    xrayScans: 'एक्स-रे और स्कैन',

    pharmacyEcosystem: 'फार्मेसी इकोसिस्टम',
    exploreByCategory: 'कैटेगरी के अनुसार देखें',
    viewPharmacy: 'फार्मेसी देखें',

    medicinesWellness: 'दवाइयाँ और वेलनेस',
    trendingEssentials: 'ट्रेंडिंग हेल्थ उत्पाद',
    browseMedicines: 'दवाइयाँ देखें',

    doctorConsultation: 'डॉक्टर परामर्श',
    consultTopDoctors: 'शीर्ष डॉक्टरों से परामर्श',
    findAllDoctors: 'सभी डॉक्टर देखें',

    personalHealthSnapshot: 'व्यक्तिगत स्वास्थ्य सारांश',
    welcomeBack: 'वापसी पर स्वागत है,',
    openDashboard: 'डैशबोर्ड खोलें',
    healthScore: 'स्वास्थ्य स्कोर',
    optimalVitals: 'स्वास्थ्य संकेत सामान्य',
    labReportsCount: '12 लैब रिपोर्ट',
    annualPanel: 'वार्षिक स्वास्थ्य जांच',
    prescriptionsCount: '8 प्रिस्क्रिप्शन',
    digitalArchive: 'डिजिटल संग्रह',

    medicalInsights: 'मेडिकल जानकारी',
    healthArticles: 'स्वास्थ्य लेख',
    forYou: 'आपके लिए',
    readAllArticles: 'सभी लेख पढ़ें',

    emergencyHotline: '24/7 आपातकालीन देखभाल',
    emergencyDescription: 'जब भी जरूरत हो तुरंत चिकित्सा सहायता प्राप्त करें।',
    callEmergency: 'आपातकाल पर कॉल करें',

    off: 'छूट',
    rxRequired: 'Rx आवश्यक',
    lowStock: 'कम स्टॉक',
    saveWishlist: 'विशलिस्ट में सेव करें',
    quickView: 'त्वरित देखें',
    reviews: 'रिव्यू',
    decreaseQuantity: 'मात्रा कम करें',
    increaseQuantity: 'मात्रा बढ़ाएँ',
    add: 'जोड़ें',

    testsIncluded: 'टेस्ट शामिल',
    report: 'रिपोर्ट',
    bookTest: 'टेस्ट बुक करें',

    perVisit: 'प्रति विजिट',
    next: 'अगला',
    bookAppointment: 'अपॉइंटमेंट बुक करें',

    saved: 'सेव किया गया',
    signedOut: 'साइन आउट किया गया',
    removedWishlist: 'विशलिस्ट से हटाया गया',
    savedWishlist: 'विशलिस्ट में सेव किया गया'
  },


  /* ======================================================
     KANNADA
  ====================================================== */

  kn: {
    doctors: 'ವೈದ್ಯರು',
    pharmacy: 'ಫಾರ್ಮಸಿ',
    labTests: 'ಲ್ಯಾಬ್ ಟೆಸ್ಟ್‌ಗಳು',
    healthPlans: 'ಆರೋಗ್ಯ ಯೋಜನೆಗಳು',
    healthRecords: 'ಆರೋಗ್ಯ ದಾಖಲೆಗಳು',
    internships: 'ಇಂಟರ್ನ್‌ಶಿಪ್‌ಗಳು',
    trackOrders: 'ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',

    searchPlaceholder: 'ವೈದ್ಯರು, ಔಷಧಿಗಳು, ಲ್ಯಾಬ್ ಟೆಸ್ಟ್‌ಗಳು, ಇಮೇಜಿಂಗ್ ಹುಡುಕಿ...',
    homeSearchPlaceholder: 'ವೈದ್ಯರು, ಔಷಧಿಗಳು, ಲ್ಯಾಬ್ ಟೆಸ್ಟ್‌ಗಳು, ಇಮೇಜಿಂಗ್, ಕಾಯಿಲೆಗಳನ್ನು ಹುಡುಕಿ...',
    search: 'ಹುಡುಕಿ',

    cart: 'ಕಾರ್ಟ್',
    login: 'ಲಾಗಿನ್',
    register: 'ನೋಂದಣಿ',
    notifications: 'ಅಧಿಸೂಚನೆಗಳು',
    location: 'ಬ್ರೂಕ್ಲಿನ್, ನ್ಯೂಯಾರ್ಕ್',

    announcementOne: 'ನಿಮ್ಮ ಆರೈಕೆ, ನಿಮ್ಮೊಂದಿಗೆ',
    announcementTwo: '24/7 ವರ್ಚುವಲ್ ಕೇರ್ ಮತ್ತು ತುರ್ತು ಸಹಾಯ ಸಿದ್ಧವಾಗಿದೆ',

    homeKicker: '01 / ಡಿಜಿಟಲ್ ಹೆಲ್ತ್ ಇಕೋಸಿಸ್ಟಮ್',
    virtualCare: '24/7 ವರ್ಚುವಲ್ ಕೇರ್ ಸಕ್ರಿಯವಾಗಿದೆ',

    heroTitle: 'ಸಂಪೂರ್ಣ ಆರೋಗ್ಯ ಸೇವೆ,',
    heroTitleSecond: 'ಒಂದೇ ವೇದಿಕೆ.',
    heroDescription: 'ಪ್ರಮುಖ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ, ನೈಜ ಔಷಧಿಗಳನ್ನು ಆರ್ಡರ್ ಮಾಡಿ, ಲ್ಯಾಬ್ ಟೆಸ್ಟ್‌ಗಳು ಮತ್ತು ಇಮೇಜಿಂಗ್ ಬುಕ್ ಮಾಡಿ ಹಾಗೂ ನಿಮ್ಮ ಆರೋಗ್ಯ ದಾಖಲೆಗಳನ್ನು ನಿರ್ವಹಿಸಿ — ಎಲ್ಲವೂ ಒಂದೇ ವೇದಿಕೆಯಲ್ಲಿ.',

    popularSearches: 'ಜನಪ್ರಿಯ ಹುಡುಕಾಟಗಳು:',
    findDoctor: 'ವೈದ್ಯರನ್ನು ಹುಡುಕಿ',
    orderMedicines: 'ಔಷಧಿಗಳನ್ನು ಆರ್ಡರ್ ಮಾಡಿ',
    bookDiagnostics: 'ಡಯಾಗ್ನೋಸ್ಟಿಕ್ಸ್ ಬುಕ್ ಮಾಡಿ',
    emergency: '24/7 ತುರ್ತು ಸೇವೆ',

    whoCertified: 'WHO-GMP ಪ್ರಮಾಣಿತ',
    dispatch: '30 ನಿಮಿಷ ಡಿಸ್ಪ್ಯಾಚ್',
    verifiedSpecialists: 'ಪರಿಶೀಲಿಸಿದ ತಜ್ಞರು',
    authenticMedicines: 'ಅಸಲಿ ಔಷಧಿಗಳು',
    labReports: 'ಲ್ಯಾಬ್ ಟೆಸ್ಟ್ ವರದಿಗಳು',
    viewHealthRecords: 'ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಿದ ಆರೋಗ್ಯ ದಾಖಲೆಗಳನ್ನು ನೋಡಿ',

    expressCare: '30 ನಿಮಿಷ ಎಕ್ಸ್‌ಪ್ರೆಸ್',
    expressGuarantee: '10 ಗಂಟೆಗಳ ಗ್ಯಾರಂಟಿ',

    consultDoctor: 'ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ',
    onlineInPerson: 'ಆನ್‌ಲೈನ್ ಮತ್ತು ನೇರವಾಗಿ',
    buyMedicines: 'ಔಷಧಿಗಳನ್ನು ಖರೀದಿಸಿ',
    expressDelivery: 'ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಡೆಲಿವರಿ',
    bookLabTests: 'ಲ್ಯಾಬ್ ಟೆಸ್ಟ್ ಬುಕ್ ಮಾಡಿ',
    homeCollection: 'ಮನೆಯಲ್ಲೇ ಸ್ಯಾಂಪಲ್ ಕಲೆಕ್ಷನ್',
    uploadRx: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    snapOrder: 'ಫೋಟೋ ತೆಗೆದು ಆರ್ಡರ್ ಮಾಡಿ',
    xrayImaging: 'ಎಕ್ಸ್-ರೇ ಮತ್ತು ಇಮೇಜಿಂಗ್',
    ctMriRadiology: 'CT, MRI ಮತ್ತು ರೇಡಿಯಾಲಜಿ',
    healthRecordsShort: 'ಆರೋಗ್ಯ ದಾಖಲೆಗಳು',
    encryptedHistory: 'ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಿದ ಇತಿಹಾಸ',
    healthPlansShort: 'ಆರೋಗ್ಯ ಯೋಜನೆಗಳು',
    familySubscriptions: 'ಕುಟುಂಬ ಸಬ್‌ಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳು',
    urgentCare: 'ತುರ್ತು ಆರೈಕೆ',

    prescriptionAssistant: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸಹಾಯಕ',
    doctorsPrescription: 'ವೈದ್ಯರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್, ಸುಲಭವಾಗಿ',
    prescriptionDescription: 'ನಿಮ್ಮ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ನಮ್ಮ ಪರಿಶೀಲಿತ ಫಾರ್ಮಸಿಸ್ಟ್‌ಗಳು ಔಷಧಿಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿ ನಿಮ್ಮ ಮನೆಗೆ ತಲುಪಿಸುತ್ತಾರೆ.',
    snapOrDragRx: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ ತೆಗೆದು ಅಥವಾ ಡ್ರ್ಯಾಗ್ ಮಾಡಿ',
    pharmacistVerification: 'ಫಾರ್ಮಸಿಸ್ಟ್ ಪರಿಶೀಲನೆ',
    doorstepDelivery: 'ಮನೆ ಬಾಗಿಲಿಗೆ ಡೆಲಿವರಿ',
    licensedPharmacists: 'ಪರವಾನಗಿ ಪಡೆದ ಫಾರ್ಮಸಿಸ್ಟ್‌ಗಳು',
    hundredAuthentic: '100% ಅಸಲಿ ಔಷಧಿಗಳು',
    thirtyMinDelivery: '30 ನಿಮಿಷ ಡೆಲಿವರಿ',
    snapOrDragDropRx: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಫೋಟೋ ತೆಗೆದು ಅಥವಾ ಡ್ರ್ಯಾಗ್ ಮತ್ತು ಡ್ರಾಪ್ ಮಾಡಿ',
    fileTypes: 'JPG, PNG ಅಥವಾ PDF',
    uploadPrescription: 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',

    exclusiveOffers: 'ವಿಶೇಷ ಆಫರ್‌ಗಳು',
    featuredPromotions: 'ವಿಶೇಷ ಪ್ರಚಾರಗಳು',
    exploreAllOffers: 'ಎಲ್ಲಾ ಆಫರ್‌ಗಳನ್ನು ನೋಡಿ',
    upTo40Off: '40% ವರೆಗೆ ರಿಯಾಯಿತಿ',
    vitaminsSupplements: 'ವಿಟಮಿನ್‌ಗಳು ಮತ್ತು ಸಪ್ಲಿಮೆಂಟ್‌ಗಳು',
    vitaminsDescription: 'ದೈನಂದಿನ ಆರೋಗ್ಯ ಉತ್ಪನ್ನಗಳು ವಿಶೇಷ ಬೆಲೆಯಲ್ಲಿ.',
    shopNow: 'ಈಗ ಖರೀದಿಸಿ',

    sixtyOffPackage: '60% ವರೆಗೆ ರಿಯಾಯಿತಿ',
    fullBodyCheckup: 'ಸಂಪೂರ್ಣ ದೇಹ ತಪಾಸಣೆ',
    checkupDescription: 'ವಿಶ್ವಾಸಾರ್ಹ ಡಯಾಗ್ನೋಸ್ಟಿಕ್ಸ್‌ನೊಂದಿಗೆ ಸಮಗ್ರ ಆರೋಗ್ಯ ಪ್ಯಾಕೇಜ್‌ಗಳು.',
    bookPackage: 'ಪ್ಯಾಕೇಜ್ ಬುಕ್ ಮಾಡಿ',

    freeDelivery: 'ಉಚಿತ ಡೆಲಿವರಿ',
    expressMedicineDelivery: 'ಎಕ್ಸ್‌ಪ್ರೆಸ್ ಔಷಧಿ ಡೆಲಿವರಿ',
    deliveryDescription: 'ಅಸಲಿ ಔಷಧಿಗಳನ್ನು ವೇಗವಾಗಿ ನಿಮ್ಮ ಮನೆಗೆ ಪಡೆಯಿರಿ.',
    orderMedicine: 'ಔಷಧಿ ಆರ್ಡರ್ ಮಾಡಿ',

    diagnosticsImaging: 'ಡಯಾಗ್ನೋಸ್ಟಿಕ್ಸ್ ಮತ್ತು ಇಮೇಜಿಂಗ್',
    topBookedTests: 'ಹೆಚ್ಚಾಗಿ ಬುಕ್ ಮಾಡಲಾದ ಲ್ಯಾಬ್ ಟೆಸ್ಟ್‌ಗಳು ಮತ್ತು ಸ್ಕ್ಯಾನ್‌ಗಳು',
    viewAllDiagnostics: 'ಎಲ್ಲಾ ಡಯಾಗ್ನೋಸ್ಟಿಕ್ಸ್ ನೋಡಿ',
    fullBody: 'ಸಂಪೂರ್ಣ ದೇಹ',
    heartCheck: 'ಹೃದಯ ತಪಾಸಣೆ',
    diabetesCare: 'ಮಧುಮೇಹ ಆರೈಕೆ',
    thyroidAssessment: 'ಥೈರಾಯ್ಡ್ ತಪಾಸಣೆ',
    xrayScans: 'ಎಕ್ಸ್-ರೇ ಮತ್ತು ಸ್ಕ್ಯಾನ್‌ಗಳು',

    pharmacyEcosystem: 'ಫಾರ್ಮಸಿ ಇಕೋಸಿಸ್ಟಮ್',
    exploreByCategory: 'ವರ್ಗದ ಪ್ರಕಾರ ನೋಡಿ',
    viewPharmacy: 'ಫಾರ್ಮಸಿ ನೋಡಿ',

    medicinesWellness: 'ಔಷಧಿಗಳು ಮತ್ತು ವೆಲ್‌ನೆಸ್',
    trendingEssentials: 'ಟ್ರೆಂಡಿಂಗ್ ಆರೋಗ್ಯ ಉತ್ಪನ್ನಗಳು',
    browseMedicines: 'ಔಷಧಿಗಳನ್ನು ನೋಡಿ',

    doctorConsultation: 'ವೈದ್ಯರ ಸಮಾಲೋಚನೆ',
    consultTopDoctors: 'ಪ್ರಮುಖ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ',
    findAllDoctors: 'ಎಲ್ಲಾ ವೈದ್ಯರನ್ನು ನೋಡಿ',

    personalHealthSnapshot: 'ವೈಯಕ್ತಿಕ ಆರೋಗ್ಯ ಸಾರಾಂಶ',
    welcomeBack: 'ಮತ್ತೆ ಸ್ವಾಗತ,',
    openDashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ',
    healthScore: 'ಆರೋಗ್ಯ ಸ್ಕೋರ್',
    optimalVitals: 'ಆರೋಗ್ಯ ಸೂಚಕಗಳು ಉತ್ತಮವಾಗಿವೆ',
    labReportsCount: '12 ಲ್ಯಾಬ್ ವರದಿಗಳು',
    annualPanel: 'ವಾರ್ಷಿಕ ಆರೋಗ್ಯ ತಪಾಸಣೆ',
    prescriptionsCount: '8 ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳು',
    digitalArchive: 'ಡಿಜಿಟಲ್ ಸಂಗ್ರಹ',

    medicalInsights: 'ವೈದ್ಯಕೀಯ ಮಾಹಿತಿ',
    healthArticles: 'ಆರೋಗ್ಯ ಲೇಖನಗಳು',
    forYou: 'ನಿಮಗಾಗಿ',
    readAllArticles: 'ಎಲ್ಲಾ ಲೇಖನಗಳನ್ನು ಓದಿ',

    emergencyHotline: '24/7 ತುರ್ತು ಆರೈಕೆ',
    emergencyDescription: 'ಅಗತ್ಯವಿದ್ದಾಗ ತಕ್ಷಣ ವೈದ್ಯಕೀಯ ಸಹಾಯ ಪಡೆಯಿರಿ.',
    callEmergency: 'ತುರ್ತು ಸೇವೆಗೆ ಕರೆ ಮಾಡಿ',

    off: 'ರಿಯಾಯಿತಿ',
    rxRequired: 'Rx ಅಗತ್ಯ',
    lowStock: 'ಕಡಿಮೆ ಸ್ಟಾಕ್',
    saveWishlist: 'ವಿಶ್‌ಲಿಸ್ಟ್‌ಗೆ ಉಳಿಸಿ',
    quickView: 'ತ್ವರಿತ ವೀಕ್ಷಣೆ',
    reviews: 'ವಿಮರ್ಶೆಗಳು',
    decreaseQuantity: 'ಪ್ರಮಾಣ ಕಡಿಮೆ ಮಾಡಿ',
    increaseQuantity: 'ಪ್ರಮಾಣ ಹೆಚ್ಚಿಸಿ',
    add: 'ಸೇರಿಸಿ',

    testsIncluded: 'ಟೆಸ್ಟ್‌ಗಳು ಒಳಗೊಂಡಿವೆ',
    report: 'ವರದಿ',
    bookTest: 'ಟೆಸ್ಟ್ ಬುಕ್ ಮಾಡಿ',

    perVisit: 'ಪ್ರತಿ ಭೇಟಿಗೆ',
    next: 'ಮುಂದಿನದು',
    bookAppointment: 'ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ',

    saved: 'ಉಳಿಸಲಾಗಿದೆ',
    signedOut: 'ಸೈನ್ ಔಟ್ ಮಾಡಲಾಗಿದೆ',
    removedWishlist: 'ವಿಶ್‌ಲಿಸ್ಟ್‌ನಿಂದ ತೆಗೆದುಹಾಕಲಾಗಿದೆ',
    savedWishlist: 'ವಿಶ್‌ಲಿಸ್ಟ್‌ಗೆ ಉಳಿಸಲಾಗಿದೆ'
  },


  /* ======================================================
     TAMIL
  ====================================================== */

  ta: {
    doctors: 'மருத்துவர்கள்',
    pharmacy: 'மருந்தகம்',
    labTests: 'ஆய்வக பரிசோதனைகள்',
    healthPlans: 'சுகாதார திட்டங்கள்',
    healthRecords: 'சுகாதார பதிவுகள்',
    internships: 'இன்டர்ன்ஷிப்',
    trackOrders: 'உங்கள் ஆர்டர்களை கண்காணிக்கவும்',

    searchPlaceholder: 'மருத்துவர்கள், மருந்துகள், ஆய்வக பரிசோதனைகள், இமேஜிங் தேடுங்கள்...',
    homeSearchPlaceholder: 'மருத்துவர்கள், மருந்துகள், ஆய்வக பரிசோதனைகள், இமேஜிங், நோய்களை தேடுங்கள்...',
    search: 'தேடுக',

    cart: 'கார்ட்',
    login: 'உள்நுழைவு',
    register: 'பதிவு செய்யவும்',
    notifications: 'அறிவிப்புகள்',
    location: 'புரூக்ளின், நியூயார்க்',

    announcementOne: 'உங்கள் பராமரிப்பு, உங்களுடன்',
    announcementTwo: '24/7 மெய்நிகர் பராமரிப்பு மற்றும் அவசர உதவி தயார்',

    homeKicker: '01 / டிஜிட்டல் ஹெல்த் இகோசிஸ்டம்',
    virtualCare: '24/7 மெய்நிகர் பராமரிப்பு செயலில் உள்ளது',

    heroTitle: 'முழுமையான சுகாதார சேவை,',
    heroTitleSecond: 'ஒரே தளம்.',
    heroDescription: 'சிறந்த மருத்துவர்களை அணுகுங்கள், உண்மையான மருந்துகளை ஆர்டர் செய்யுங்கள், ஆய்வக பரிசோதனைகள் மற்றும் இமேஜிங்கை முன்பதிவு செய்யுங்கள், உங்கள் சுகாதார பதிவுகளை நிர்வகியுங்கள் — அனைத்தும் ஒரே தளத்தில்.',

    popularSearches: 'பிரபலமான தேடல்கள்:',
    findDoctor: 'மருத்துவரை கண்டுபிடிக்கவும்',
    orderMedicines: 'மருந்துகளை ஆர்டர் செய்யவும்',
    bookDiagnostics: 'பரிசோதனைகளை முன்பதிவு செய்யவும்',
    emergency: '24/7 அவசர சேவை',

    whoCertified: 'WHO-GMP சான்றளிக்கப்பட்டது',
    dispatch: '30 நிமிட டெலிவரி',
    verifiedSpecialists: 'சரிபார்க்கப்பட்ட நிபுணர்கள்',
    authenticMedicines: 'உண்மையான மருந்துகள்',
    labReports: 'ஆய்வக அறிக்கைகள்',
    viewHealthRecords: 'குறியாக்கப்பட்ட சுகாதார பதிவுகளை பார்க்கவும்',

    expressCare: '30 நிமிட எக்ஸ்பிரஸ்',
    expressGuarantee: '10 மணி நேர உத்தரவாதம்',

    consultDoctor: 'மருத்துவரை அணுகவும்',
    onlineInPerson: 'ஆன்லைன் மற்றும் நேரில்',
    buyMedicines: 'மருந்துகளை வாங்கவும்',
    expressDelivery: 'எக்ஸ்பிரஸ் டெலிவரி',
    bookLabTests: 'ஆய்வக பரிசோதனை முன்பதிவு',
    homeCollection: 'வீட்டு மாதிரி சேகரிப்பு',
    uploadRx: 'மருத்துவ பரிந்துரையை பதிவேற்றவும்',
    snapOrder: 'புகைப்படம் எடுத்து ஆர்டர் செய்யவும்',
    xrayImaging: 'எக்ஸ்-ரே மற்றும் இமேஜிங்',
    ctMriRadiology: 'CT, MRI மற்றும் ரேடியாலஜி',
    healthRecordsShort: 'சுகாதார பதிவுகள்',
    encryptedHistory: 'குறியாக்கப்பட்ட வரலாறு',
    healthPlansShort: 'சுகாதார திட்டங்கள்',
    familySubscriptions: 'குடும்ப சந்தாக்கள்',
    urgentCare: 'அவசர சிகிச்சை',

    prescriptionAssistant: 'மருத்துவ பரிந்துரை உதவியாளர்',
    doctorsPrescription: 'மருத்துவரின் பரிந்துரை, எளிதாக',
    prescriptionDescription: 'உங்கள் மருத்துவ பரிந்துரையை பதிவேற்றுங்கள். எங்கள் சரிபார்க்கப்பட்ட மருந்தாளர்கள் மருந்துகளை தயார் செய்து உங்கள் வீட்டிற்கு வழங்குவார்கள்.',
    snapOrDragRx: 'மருத்துவ பரிந்துரையின் புகைப்படம் எடுக்கவும் அல்லது இழுக்கவும்',
    pharmacistVerification: 'மருந்தாளர் சரிபார்ப்பு',
    doorstepDelivery: 'வீட்டு வாசல் டெலிவரி',
    licensedPharmacists: 'உரிமம் பெற்ற மருந்தாளர்கள்',
    hundredAuthentic: '100% உண்மையான மருந்துகள்',
    thirtyMinDelivery: '30 நிமிட டெலிவரி',
    snapOrDragDropRx: 'மருத்துவ பரிந்துரையை புகைப்படம் எடுக்கவும் அல்லது இழுத்து விடவும்',
    fileTypes: 'JPG, PNG அல்லது PDF',
    uploadPrescription: 'மருத்துவ பரிந்துரையை பதிவேற்றவும்',

    exclusiveOffers: 'சிறப்பு சலுகைகள்',
    featuredPromotions: 'சிறப்பு விளம்பரங்கள்',
    exploreAllOffers: 'அனைத்து சலுகைகளையும் பார்க்கவும்',
    upTo40Off: '40% வரை தள்ளுபடி',
    vitaminsSupplements: 'வைட்டமின்கள் மற்றும் சப்ளிமென்ட்கள்',
    vitaminsDescription: 'தினசரி ஆரோக்கிய பொருட்கள் சிறப்பு விலையில்.',
    shopNow: 'இப்போதே வாங்கவும்',

    sixtyOffPackage: '60% வரை தள்ளுபடி',
    fullBodyCheckup: 'முழு உடல் பரிசோதனை',
    checkupDescription: 'நம்பகமான பரிசோதனை மையங்களுடன் முழுமையான சுகாதார தொகுப்புகள்.',
    bookPackage: 'தொகுப்பை முன்பதிவு செய்யவும்',

    freeDelivery: 'இலவச டெலிவரி',
    expressMedicineDelivery: 'எக்ஸ்பிரஸ் மருந்து டெலிவரி',
    deliveryDescription: 'உண்மையான மருந்துகளை விரைவாக உங்கள் வீட்டிற்கு பெறுங்கள்.',
    orderMedicine: 'மருந்தை ஆர்டர் செய்யவும்',

    diagnosticsImaging: 'பரிசோதனைகள் மற்றும் இமேஜிங்',
    topBookedTests: 'அதிகம் முன்பதிவு செய்யப்பட்ட ஆய்வக பரிசோதனைகள் மற்றும் ஸ்கேன்கள்',
    viewAllDiagnostics: 'அனைத்து பரிசோதனைகளையும் பார்க்கவும்',
    fullBody: 'முழு உடல்',
    heartCheck: 'இதய பரிசோதனை',
    diabetesCare: 'நீரிழிவு பராமரிப்பு',
    thyroidAssessment: 'தைராய்டு பரிசோதனை',
    xrayScans: 'எக்ஸ்-ரே மற்றும் ஸ்கேன்கள்',

    pharmacyEcosystem: 'மருந்தக இகோசிஸ்டம்',
    exploreByCategory: 'வகை வாரியாக பார்க்கவும்',
    viewPharmacy: 'மருந்தகத்தை பார்க்கவும்',

    medicinesWellness: 'மருந்துகள் மற்றும் நலவாழ்வு',
    trendingEssentials: 'பிரபலமான ஆரோக்கிய பொருட்கள்',
    browseMedicines: 'மருந்துகளை பார்க்கவும்',

    doctorConsultation: 'மருத்துவர் ஆலோசனை',
    consultTopDoctors: 'சிறந்த மருத்துவர்களை அணுகவும்',
    findAllDoctors: 'அனைத்து மருத்துவர்களையும் பார்க்கவும்',

    personalHealthSnapshot: 'தனிப்பட்ட சுகாதார சுருக்கம்',
    welcomeBack: 'மீண்டும் வரவேற்கிறோம்,',
    openDashboard: 'டாஷ்போர்டை திறக்கவும்',
    healthScore: 'சுகாதார மதிப்பெண்',
    optimalVitals: 'உடல்நிலை சீராக உள்ளது',
    labReportsCount: '12 ஆய்வக அறிக்கைகள்',
    annualPanel: 'ஆண்டு சுகாதார பரிசோதனை',
    prescriptionsCount: '8 மருத்துவ பரிந்துரைகள்',
    digitalArchive: 'டிஜிட்டல் காப்பகம்',

    medicalInsights: 'மருத்துவ தகவல்கள்',
    healthArticles: 'சுகாதார கட்டுரைகள்',
    forYou: 'உங்களுக்காக',
    readAllArticles: 'அனைத்து கட்டுரைகளையும் படிக்கவும்',

    emergencyHotline: '24/7 அவசர சிகிச்சை',
    emergencyDescription: 'தேவைப்படும் போது உடனடி மருத்துவ உதவியைப் பெறுங்கள்.',
    callEmergency: 'அவசர சேவைக்கு அழைக்கவும்',

    off: 'தள்ளுபடி',
    rxRequired: 'Rx தேவை',
    lowStock: 'குறைந்த இருப்பு',
    saveWishlist: 'விருப்பப்பட்டியலில் சேமிக்கவும்',
    quickView: 'விரைவான பார்வை',
    reviews: 'மதிப்புரைகள்',
    decreaseQuantity: 'அளவை குறைக்கவும்',
    increaseQuantity: 'அளவை அதிகரிக்கவும்',
    add: 'சேர்க்கவும்',

    testsIncluded: 'பரிசோதனைகள் சேர்க்கப்பட்டுள்ளன',
    report: 'அறிக்கை',
    bookTest: 'பரிசோதனையை முன்பதிவு செய்யவும்',

    perVisit: 'ஒவ்வொரு வருகைக்கும்',
    next: 'அடுத்து',
    bookAppointment: 'சந்திப்பை முன்பதிவு செய்யவும்',

    saved: 'சேமிக்கப்பட்டது',
    signedOut: 'வெளியேறப்பட்டது',
    removedWishlist: 'விருப்பப்பட்டியலில் இருந்து நீக்கப்பட்டது',
    savedWishlist: 'விருப்பப்பட்டியலில் சேமிக்கப்பட்டது'
  },


  /* ======================================================
     TELUGU
  ====================================================== */

  te: {
    doctors: 'వైద్యులు',
    pharmacy: 'ఫార్మసీ',
    labTests: 'ల్యాబ్ పరీక్షలు',
    healthPlans: 'ఆరోగ్య ప్రణాళికలు',
    healthRecords: 'ఆరోగ్య రికార్డులు',
    internships: 'ఇంటర్న్‌షిప్‌లు',
    trackOrders: 'మీ ఆర్డర్‌లను ట్రాక్ చేయండి',

    searchPlaceholder: 'వైద్యులు, మందులు, ల్యాబ్ పరీక్షలు, ఇమేజింగ్ కోసం శోధించండి...',
    homeSearchPlaceholder: 'వైద్యులు, మందులు, ల్యాబ్ పరీక్షలు, ఇమేజింగ్, వ్యాధుల కోసం శోధించండి...',
    search: 'శోధించండి',

    cart: 'కార్ట్',
    login: 'లాగిన్',
    register: 'నమోదు',
    notifications: 'నోటిఫికేషన్లు',
    location: 'బ్రూక్లిన్, న్యూయార్క్',

    announcementOne: 'మీ సంరక్షణ, మీతో పాటు',
    announcementTwo: '24/7 వర్చువల్ కేర్ మరియు అత్యవసర సహాయం సిద్ధంగా ఉంది',

    homeKicker: '01 / డిజిటల్ హెల్త్ ఎకోసిస్టమ్',
    virtualCare: '24/7 వర్చువల్ కేర్ యాక్టివ్',

    heroTitle: 'పూర్తి ఆరోగ్య సంరక్షణ,',
    heroTitleSecond: 'ఒకే వేదిక.',
    heroDescription: 'ప్రമുഖ వైద్యులను సంప్రదించండి, అసలైన మందులను ఆర్డర్ చేయండి, ల్యాబ్ పరీక్షలు మరియు ఇమేజింగ్ బుక్ చేయండి, మీ ఆరోగ్య రికార్డులను నిర్వహించండి — అన్నీ ఒకే వేదికలో.',

    popularSearches: 'ప్రసిద్ధ శోధనలు:',
    findDoctor: 'వైద్యుడిని కనుగొనండి',
    orderMedicines: 'మందులను ఆర్డర్ చేయండి',
    bookDiagnostics: 'డయాగ్నోస్టిక్స్ బుక్ చేయండి',
    emergency: '24/7 అత్యవసర సేవ',

    whoCertified: 'WHO-GMP సర్టిఫైడ్',
    dispatch: '30 నిమిషాల డిస్పాచ్',
    verifiedSpecialists: 'ధృవీకరించిన నిపుణులు',
    authenticMedicines: 'అసలైన మందులు',
    labReports: 'ల్యాబ్ పరీక్ష నివేదికలు',
    viewHealthRecords: 'ఎన్‌క్రిప్ట్ చేసిన ఆరోగ్య రికార్డులను చూడండి',

    expressCare: '30 నిమిషాల ఎక్స్‌ప్రెస్',
    expressGuarantee: '10 గంటల గ్యారంటీ',

    consultDoctor: 'వైద్యుడిని సంప్రదించండి',
    onlineInPerson: 'ఆన్‌లైన్ మరియు ప్రత్యక్షంగా',
    buyMedicines: 'మందులు కొనండి',
    expressDelivery: 'ఎక్స్‌ప్రెస్ డెలివరీ',
    bookLabTests: 'ల్యాబ్ పరీక్షలు బుక్ చేయండి',
    homeCollection: 'ఇంటి వద్ద నమూనా సేకరణ',
    uploadRx: 'ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి',
    snapOrder: 'ఫోటో తీసి ఆర్డర్ చేయండి',
    xrayImaging: 'ఎక్స్-రే మరియు ఇమేజింగ్',
    ctMriRadiology: 'CT, MRI మరియు రేడియాలజీ',
    healthRecordsShort: 'ఆరోగ్య రికార్డులు',
    encryptedHistory: 'ఎన్‌క్రిప్ట్ చేసిన చరిత్ర',
    healthPlansShort: 'ఆరోగ్య ప్రణాళికలు',
    familySubscriptions: 'కుటుంబ సబ్‌స్క్రిప్షన్‌లు',
    urgentCare: 'అత్యవసర సంరక్షణ',

    prescriptionAssistant: 'ప్రిస్క్రిప్షన్ సహాయకుడు',
    doctorsPrescription: 'వైద్యుడి ప్రిస్క్రిప్షన్, సులభంగా',
    prescriptionDescription: 'మీ ప్రిస్క్రిప్షన్‌ను అప్‌లోడ్ చేయండి. మా ధృవీకరించిన ఫార్మసిస్ట్‌లు మందులను సిద్ధం చేసి మీ ఇంటికి అందిస్తారు.',
    snapOrDragRx: 'ప్రిస్క్రిప్షన్ ఫోటో తీసి లేదా డ్రాగ్ చేయండి',
    pharmacistVerification: 'ఫార్మసిస్ట్ ధృవీకరణ',
    doorstepDelivery: 'ఇంటి వద్ద డెలివరీ',
    licensedPharmacists: 'లైసెన్స్ పొందిన ఫార్మసిస్ట్‌లు',
    hundredAuthentic: '100% అసలైన మందులు',
    thirtyMinDelivery: '30 నిమిషాల డెలివరీ',
    snapOrDragDropRx: 'ప్రిస్క్రిప్షన్ ఫోటో తీసి లేదా డ్రాగ్ & డ్రాప్ చేయండి',
    fileTypes: 'JPG, PNG లేదా PDF',
    uploadPrescription: 'ప్రిస్క్రిప్షన్ అప్‌లోడ్ చేయండి',

    exclusiveOffers: 'ప్రత్యేక ఆఫర్లు',
    featuredPromotions: 'ప్రత్యేక ప్రమోషన్లు',
    exploreAllOffers: 'అన్ని ఆఫర్లను చూడండి',
    upTo40Off: '40% వరకు తగ్గింపు',
    vitaminsSupplements: 'విటమిన్లు మరియు సప్లిమెంట్లు',
    vitaminsDescription: 'రోజువారీ ఆరోగ్య ఉత్పత్తులు ప్రత్యేక ధరల్లో.',
    shopNow: 'ఇప్పుడే కొనండి',

    sixtyOffPackage: '60% వరకు తగ్గింపు',
    fullBodyCheckup: 'పూర్తి శరీర పరీక్ష',
    checkupDescription: 'విశ్వసనీయ డయాగ్నోస్టిక్స్‌తో సమగ్ర ఆరోగ్య ప్యాకేజీలు.',
    bookPackage: 'ప్యాకేజీ బుక్ చేయండి',

    freeDelivery: 'ఉచిత డెలివరీ',
    expressMedicineDelivery: 'ఎక్స్‌ప్రెస్ మెడిసిన్ డెలివరీ',
    deliveryDescription: 'అసలైన మందులను వేగంగా మీ ఇంటికి పొందండి.',
    orderMedicine: 'మందు ఆర్డర్ చేయండి',

    diagnosticsImaging: 'డయాగ్నోస్టిక్స్ మరియు ఇమేజింగ్',
    topBookedTests: 'ఎక్కువగా బుక్ చేసిన ల్యాబ్ పరీక్షలు మరియు స్కాన్లు',
    viewAllDiagnostics: 'అన్ని డయాగ్నోస్టిక్స్ చూడండి',
    fullBody: 'పూర్తి శరీరం',
    heartCheck: 'హార్ట్ చెక్',
    diabetesCare: 'డయాబెటిస్ కేర్',
    thyroidAssessment: 'థైరాయిడ్ పరీక్ష',
    xrayScans: 'ఎక్స్-రే మరియు స్కాన్లు',

    pharmacyEcosystem: 'ఫార్మసీ ఎకోసిస్టమ్',
    exploreByCategory: 'కేటగిరీ ప్రకారం చూడండి',
    viewPharmacy: 'ఫార్మసీ చూడండి',

    medicinesWellness: 'మందులు మరియు వెల్‌నెస్',
    trendingEssentials: 'ట్రెండింగ్ ఆరోగ్య ఉత్పత్తులు',
    browseMedicines: 'మందులను చూడండి',

    doctorConsultation: 'వైద్యుల సంప్రదింపు',
    consultTopDoctors: 'ప్రമുഖ వైద్యులను సంప్రదించండి',
    findAllDoctors: 'అన్ని వైద్యులను చూడండి',

    personalHealthSnapshot: 'వ్యక్తిగత ఆరోగ్య సారాంశం',
    welcomeBack: 'తిరిగి స్వాగతం,',
    openDashboard: 'డ్యాష్‌బోర్డ్ తెరవండి',
    healthScore: 'ఆరోగ్య స్కోర్',
    optimalVitals: 'ఆరోగ్య సూచికలు సాధారణంగా ఉన్నాయి',
    labReportsCount: '12 ల్యాబ్ నివేదికలు',
    annualPanel: 'వార్షిక ఆరోగ్య పరీక్ష',
    prescriptionsCount: '8 ప్రిస్క్రిప్షన్‌లు',
    digitalArchive: 'డిజిటల్ ఆర్కైవ్',

    medicalInsights: 'వైద్య సమాచారం',
    healthArticles: 'ఆరోగ్య కథనాలు',
    forYou: 'మీ కోసం',
    readAllArticles: 'అన్ని కథనాలను చదవండి',

    emergencyHotline: '24/7 అత్యవసర సంరక్షణ',
    emergencyDescription: 'అవసరమైనప్పుడు వెంటనే వైద్య సహాయం పొందండి.',
    callEmergency: 'అత్యవసర సేవకు కాల్ చేయండి',

    off: 'తగ్గింపు',
    rxRequired: 'Rx అవసరం',
    lowStock: 'తక్కువ స్టాక్',
    saveWishlist: 'విష్‌లిస్ట్‌లో సేవ్ చేయండి',
    quickView: 'త్వరిత వీక్షణ',
    reviews: 'రివ్యూలు',
    decreaseQuantity: 'పరిమాణాన్ని తగ్గించండి',
    increaseQuantity: 'పరిమాణాన్ని పెంచండి',
    add: 'జోడించండి',

    testsIncluded: 'పరీక్షలు చేర్చబడ్డాయి',
    report: 'నివేదిక',
    bookTest: 'పరీక్షను బుక్ చేయండి',

    perVisit: 'ప్రతి సందర్శనకు',
    next: 'తదుపరి',
    bookAppointment: 'అపాయింట్‌మెంట్ బుక్ చేయండి',

    saved: 'సేవ్ చేయబడింది',
    signedOut: 'సైన్ అవుట్ చేయబడింది',
    removedWishlist: 'విష్‌లిస్ట్ నుండి తొలగించబడింది',
    savedWishlist: 'విష్‌లిస్ట్‌లో సేవ్ చేయబడింది'
  },


  /* ======================================================
     MALAYALAM
  ====================================================== */

  ml: {
    doctors: 'ഡോക്ടർമാർ',
    pharmacy: 'ഫാർമസി',
    labTests: 'ലാബ് പരിശോധനകൾ',
    healthPlans: 'ആരോഗ്യ പദ്ധതികൾ',
    healthRecords: 'ആരോഗ്യ രേഖകൾ',
    internships: 'ഇന്റേൺഷിപ്പുകൾ',
    trackOrders: 'നിങ്ങളുടെ ഓർഡറുകൾ ട്രാക്ക് ചെയ്യുക',

    searchPlaceholder: 'ഡോക്ടർമാർ, മരുന്നുകൾ, ലാബ് പരിശോധനകൾ, ഇമേജിംഗ് തിരയുക...',
    homeSearchPlaceholder: 'ഡോക്ടർമാർ, മരുന്നുകൾ, ലാബ് പരിശോധനകൾ, ഇമേജിംഗ്, രോഗങ്ങൾ തിരയുക...',
    search: 'തിരയുക',

    cart: 'കാർട്ട്',
    login: 'ലോഗിൻ',
    register: 'രജിസ്റ്റർ',
    notifications: 'അറിയിപ്പുകൾ',
    location: 'ബ്രൂക്ക്ലിൻ, ന്യൂയോർക്ക്',

    announcementOne: 'നിങ്ങളുടെ പരിചരണം, നിങ്ങളോടൊപ്പം',
    announcementTwo: '24/7 വെർച്വൽ കെയറും അടിയന്തര സഹായവും തയ്യാറാണ്',

    homeKicker: '01 / ഡിജിറ്റൽ ഹെൽത്ത് ഇക്കോസിസ്റ്റം',
    virtualCare: '24/7 വെർച്വൽ കെയർ സജീവമാണ്',

    heroTitle: 'സമ്പൂർണ്ണ ആരോഗ്യ സേവനം,',
    heroTitleSecond: 'ഒരൊറ്റ പ്ലാറ്റ്‌ഫോം.',
    heroDescription: 'മികച്ച ഡോക്ടർമാരെ സമീപിക്കുക, യഥാർത്ഥ മരുന്നുകൾ ഓർഡർ ചെയ്യുക, ലാബ് പരിശോധനകളും ഇമേജിംഗും ബുക്ക് ചെയ്യുക, നിങ്ങളുടെ ആരോഗ്യ രേഖകൾ നിയന്ത്രിക്കുക — എല്ലാം ഒരൊറ്റ പ്ലാറ്റ്‌ഫോമിൽ.',

    popularSearches: 'ജനപ്രിയ തിരച്ചിലുകൾ:',
    findDoctor: 'ഡോക്ടറെ കണ്ടെത്തുക',
    orderMedicines: 'മരുന്നുകൾ ഓർഡർ ചെയ്യുക',
    bookDiagnostics: 'ഡയഗ്നോസ്റ്റിക്സ് ബുക്ക് ചെയ്യുക',
    emergency: '24/7 അടിയന്തര സേവനം',

    whoCertified: 'WHO-GMP സർട്ടിഫൈഡ്',
    dispatch: '30 മിനിറ്റ് ഡെലിവറി',
    verifiedSpecialists: 'പരിശോധിച്ച വിദഗ്ധർ',
    authenticMedicines: 'യഥാർത്ഥ മരുന്നുകൾ',
    labReports: 'ലാബ് പരിശോധനാ റിപ്പോർട്ടുകൾ',
    viewHealthRecords: 'എൻക്രിപ്റ്റ് ചെയ്ത ആരോഗ്യ രേഖകൾ കാണുക',

    expressCare: '30 മിനിറ്റ് എക്സ്പ്രസ്',
    expressGuarantee: '10 മണിക്കൂർ ഗ്യാരണ്ടി',

    consultDoctor: 'ഡോക്ടറെ സമീപിക്കുക',
    onlineInPerson: 'ഓൺലൈനും നേരിട്ടും',
    buyMedicines: 'മരുന്നുകൾ വാങ്ങുക',
    expressDelivery: 'എക്സ്പ്രസ് ഡെലിവറി',
    bookLabTests: 'ലാബ് പരിശോധനകൾ ബുക്ക് ചെയ്യുക',
    homeCollection: 'വീട്ടിൽ സാമ്പിൾ ശേഖരണം',
    uploadRx: 'പ്രിസ്ക്രിപ്ഷൻ അപ്‌ലോഡ് ചെയ്യുക',
    snapOrder: 'ഫോട്ടോ എടുത്ത് ഓർഡർ ചെയ്യുക',
    xrayImaging: 'എക്സ്-റേ & ഇമേജിംഗ്',
    ctMriRadiology: 'CT, MRI & റേഡിയോളജി',
    healthRecordsShort: 'ആരോഗ്യ രേഖകൾ',
    encryptedHistory: 'എൻക്രിപ്റ്റ് ചെയ്ത ചരിത്രം',
    healthPlansShort: 'ആരോഗ്യ പദ്ധതികൾ',
    familySubscriptions: 'കുടുംബ സബ്സ്ക്രിപ്ഷനുകൾ',
    urgentCare: 'അടിയന്തര പരിചരണം',

    prescriptionAssistant: 'പ്രിസ്ക്രിപ്ഷൻ അസിസ്റ്റന്റ്',
    doctorsPrescription: 'ഡോക്ടറുടെ പ്രിസ്ക്രിപ്ഷൻ, എളുപ്പത്തിൽ',
    prescriptionDescription: 'നിങ്ങളുടെ പ്രിസ്ക്രിപ്ഷൻ അപ്‌ലോഡ് ചെയ്യുക. ഞങ്ങളുടെ പരിശോധിച്ച ഫാർമസിസ്റ്റുകൾ മരുന്നുകൾ തയ്യാറാക്കി വീട്ടിലെത്തിക്കും.',
    snapOrDragRx: 'പ്രിസ്ക്രിപ്ഷന്റെ ഫോട്ടോ എടുക്കുക അല്ലെങ്കിൽ ഡ്രാഗ് ചെയ്യുക',
    pharmacistVerification: 'ഫാർമസിസ്റ്റ് പരിശോധന',
    doorstepDelivery: 'വീട്ടുപടിക്കൽ ഡെലിവറി',
    licensedPharmacists: 'ലൈസൻസുള്ള ഫാർമസിസ്റ്റുകൾ',
    hundredAuthentic: '100% യഥാർത്ഥ മരുന്നുകൾ',
    thirtyMinDelivery: '30 മിനിറ്റ് ഡെലിവറി',
    snapOrDragDropRx: 'പ്രിസ്ക്രിപ്ഷന്റെ ഫോട്ടോ എടുക്കുക അല്ലെങ്കിൽ ഡ്രാഗ് & ഡ്രോപ്പ് ചെയ്യുക',
    fileTypes: 'JPG, PNG അല്ലെങ്കിൽ PDF',
    uploadPrescription: 'പ്രിസ്ക്രിപ്ഷൻ അപ്‌ലോഡ് ചെയ്യുക',

    exclusiveOffers: 'പ്രത്യേക ഓഫറുകൾ',
    featuredPromotions: 'പ്രധാന പ്രമോഷനുകൾ',
    exploreAllOffers: 'എല്ലാ ഓഫറുകളും കാണുക',
    upTo40Off: '40% വരെ ഇളവ്',
    vitaminsSupplements: 'വിറ്റാമിനുകളും സപ്ലിമെന്റുകളും',
    vitaminsDescription: 'ദൈനംദിന ആരോഗ്യ ഉൽപ്പന്നങ്ങൾ പ്രത്യേക വിലയിൽ.',
    shopNow: 'ഇപ്പോൾ വാങ്ങുക',

    sixtyOffPackage: '60% വരെ ഇളവ്',
    fullBodyCheckup: 'പൂർണ്ണ ശരീര പരിശോധന',
    checkupDescription: 'വിശ്വസനീയമായ ഡയഗ്നോസ്റ്റിക്സിനൊപ്പം സമഗ്ര ആരോഗ്യ പാക്കേജുകൾ.',
    bookPackage: 'പാക്കേജ് ബുക്ക് ചെയ്യുക',

    freeDelivery: 'സൗജന്യ ഡെലിവറി',
    expressMedicineDelivery: 'എക്സ്പ്രസ് മെഡിസിൻ ഡെലിവറി',
    deliveryDescription: 'യഥാർത്ഥ മരുന്നുകൾ വേഗത്തിൽ വീട്ടിലെത്തിക്കുക.',
    orderMedicine: 'മരുന്ന് ഓർഡർ ചെയ്യുക',

    diagnosticsImaging: 'ഡയഗ്നോസ്റ്റിക്സ് & ഇമേജിംഗ്',
    topBookedTests: 'ഏറ്റവും കൂടുതൽ ബുക്ക് ചെയ്ത ലാബ് പരിശോധനകളും സ്കാനുകളും',
    viewAllDiagnostics: 'എല്ലാ ഡയഗ്നോസ്റ്റിക്സും കാണുക',
    fullBody: 'പൂർണ്ണ ശരീരം',
    heartCheck: 'ഹൃദയ പരിശോധന',
    diabetesCare: 'പ്രമേഹ പരിചരണം',
    thyroidAssessment: 'തൈറോയ്ഡ് പരിശോധന',
    xrayScans: 'എക്സ്-റേ & സ്കാനുകൾ',

    pharmacyEcosystem: 'ഫാർമസി ഇക്കോസിസ്റ്റം',
    exploreByCategory: 'വിഭാഗം അനുസരിച്ച് കാണുക',
    viewPharmacy: 'ഫാർമസി കാണുക',

    medicinesWellness: 'മരുന്നുകളും വെൽനെസും',
    trendingEssentials: 'ട്രെൻഡിംഗ് ആരോഗ്യ ഉൽപ്പന്നങ്ങൾ',
    browseMedicines: 'മരുന്നുകൾ കാണുക',

    doctorConsultation: 'ഡോക്ടർ കൺസൾട്ടേഷൻ',
    consultTopDoctors: 'മികച്ച ഡോക്ടർമാരെ സമീപിക്കുക',
    findAllDoctors: 'എല്ലാ ഡോക്ടർമാരെയും കാണുക',

    personalHealthSnapshot: 'വ്യക്തിഗത ആരോഗ്യ സംഗ്രഹം',
    welcomeBack: 'വീണ്ടും സ്വാഗതം,',
    openDashboard: 'ഡാഷ്ബോർഡ് തുറക്കുക',
    healthScore: 'ആരോഗ്യ സ്കോർ',
    optimalVitals: 'ആരോഗ്യ സൂചകങ്ങൾ സാധാരണമാണ്',
    labReportsCount: '12 ലാബ് റിപ്പോർട്ടുകൾ',
    annualPanel: 'വാർഷിക ആരോഗ്യ പരിശോധന',
    prescriptionsCount: '8 പ്രിസ്ക്രിപ്ഷനുകൾ',
    digitalArchive: 'ഡിജിറ്റൽ ആർക്കൈവ്',

    medicalInsights: 'മെഡിക്കൽ വിവരങ്ങൾ',
    healthArticles: 'ആരോഗ്യ ലേഖനങ്ങൾ',
    forYou: 'നിങ്ങൾക്കായി',
    readAllArticles: 'എല്ലാ ലേഖനങ്ങളും വായിക്കുക',

    emergencyHotline: '24/7 അടിയന്തര പരിചരണം',
    emergencyDescription: 'ആവശ്യമുള്ളപ്പോൾ ഉടൻ മെഡിക്കൽ സഹായം നേടുക.',
    callEmergency: 'അടിയന്തര സേവനത്തിലേക്ക് വിളിക്കുക',

    off: 'ഇളവ്',
    rxRequired: 'Rx ആവശ്യമാണ്',
    lowStock: 'കുറഞ്ഞ സ്റ്റോക്ക്',
    saveWishlist: 'വിഷ്‌ലിസ്റ്റിൽ സേവ് ചെയ്യുക',
    quickView: 'ദ്രുത കാഴ്ച',
    reviews: 'റിവ്യൂകൾ',
    decreaseQuantity: 'അളവ് കുറയ്ക്കുക',
    increaseQuantity: 'അളവ് കൂട്ടുക',
    add: 'ചേർക്കുക',

    testsIncluded: 'പരിശോധനകൾ ഉൾപ്പെടുന്നു',
    report: 'റിപ്പോർട്ട്',
    bookTest: 'പരിശോധന ബുക്ക് ചെയ്യുക',

    perVisit: 'ഓരോ സന്ദർശനത്തിനും',
    next: 'അടുത്തത്',
    bookAppointment: 'അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക',

    saved: 'സേവ് ചെയ്തു',
    signedOut: 'സൈൻ ഔട്ട് ചെയ്തു',
    removedWishlist: 'വിഷ്‌ലിസ്റ്റിൽ നിന്ന് നീക്കം ചെയ്തു',
    savedWishlist: 'വിഷ്‌ലിസ്റ്റിൽ സേവ് ചെയ്തു'
  },


  /* ======================================================
     MARATHI
  ====================================================== */

  mr: {
    doctors: 'डॉक्टर',
    pharmacy: 'फार्मसी',
    labTests: 'लॅब टेस्ट',
    healthPlans: 'आरोग्य योजना',
    healthRecords: 'आरोग्य नोंदी',
    internships: 'इंटर्नशिप',
    trackOrders: 'तुमच्या ऑर्डर्स ट्रॅक करा',

    searchPlaceholder: 'डॉक्टर, औषधे, लॅब टेस्ट, इमेजिंग शोधा...',
    homeSearchPlaceholder: 'डॉक्टर, औषधे, लॅब टेस्ट, इमेजिंग, आजार शोधा...',
    search: 'शोधा',

    cart: 'कार्ट',
    login: 'लॉगिन',
    register: 'नोंदणी',
    notifications: 'सूचना',
    location: 'ब्रुकलिन, न्यूयॉर्क',

    announcementOne: 'तुमची काळजी, तुमच्यासोबत',
    announcementTwo: '24/7 व्हर्च्युअल केअर आणि आपत्कालीन मदत उपलब्ध',

    homeKicker: '01 / डिजिटल हेल्थ इकोसिस्टम',
    virtualCare: '24/7 व्हर्च्युअल केअर सक्रिय',

    heroTitle: 'संपूर्ण आरोग्यसेवा,',
    heroTitleSecond: 'एकाच प्लॅटफॉर्मवर.',
    heroDescription: 'तज्ज्ञ डॉक्टरांचा सल्ला घ्या, अस्सल औषधे ऑर्डर करा, लॅब टेस्ट आणि इमेजिंग बुक करा आणि तुमचे आरोग्य रेकॉर्ड व्यवस्थापित करा — सर्व काही एका प्लॅटफॉर्मवर.',

    popularSearches: 'लोकप्रिय शोध:',
    findDoctor: 'डॉक्टर शोधा',
    orderMedicines: 'औषधे ऑर्डर करा',
    bookDiagnostics: 'डायग्नोस्टिक्स बुक करा',
    emergency: '24/7 आपत्कालीन सेवा',

    whoCertified: 'WHO-GMP प्रमाणित',
    dispatch: '30 मिनिट डिलिव्हरी',
    verifiedSpecialists: 'सत्यापित तज्ज्ञ',
    authenticMedicines: 'अस्सल औषधे',
    labReports: 'लॅब टेस्ट रिपोर्ट',
    viewHealthRecords: 'एन्क्रिप्टेड आरोग्य नोंदी पहा',

    expressCare: '30 मिनिट एक्सप्रेस',
    expressGuarantee: '10 तासांची हमी',

    consultDoctor: 'डॉक्टरांचा सल्ला घ्या',
    onlineInPerson: 'ऑनलाइन आणि प्रत्यक्ष',
    buyMedicines: 'औषधे खरेदी करा',
    expressDelivery: 'एक्सप्रेस डिलिव्हरी',
    bookLabTests: 'लॅब टेस्ट बुक करा',
    homeCollection: 'घरून नमुना संकलन',
    uploadRx: 'प्रिस्क्रिप्शन अपलोड करा',
    snapOrder: 'फोटो काढा आणि ऑर्डर करा',
    xrayImaging: 'एक्स-रे आणि इमेजिंग',
    ctMriRadiology: 'CT, MRI आणि रेडिओलॉजी',
    healthRecordsShort: 'आरोग्य नोंदी',
    encryptedHistory: 'एन्क्रिप्टेड इतिहास',
    healthPlansShort: 'आरोग्य योजना',
    familySubscriptions: 'कुटुंब सदस्यता',
    urgentCare: 'तातडीची काळजी',

    prescriptionAssistant: 'प्रिस्क्रिप्शन असिस्टंट',
    doctorsPrescription: 'डॉक्टरांचे प्रिस्क्रिप्शन, सोप्या पद्धतीने',
    prescriptionDescription: 'तुमचे प्रिस्क्रिप्शन अपलोड करा. आमचे सत्यापित फार्मासिस्ट औषधे तयार करून तुमच्या घरी पोहोचवतील.',
    snapOrDragRx: 'प्रिस्क्रिप्शनचा फोटो घ्या किंवा ड्रॅग करा',
    pharmacistVerification: 'फार्मासिस्ट पडताळणी',
    doorstepDelivery: 'घरपोच डिलिव्हरी',
    licensedPharmacists: 'परवानाधारक फार्मासिस्ट',
    hundredAuthentic: '100% अस्सल औषधे',
    thirtyMinDelivery: '30 मिनिट डिलिव्हरी',
    snapOrDragDropRx: 'प्रिस्क्रिप्शनचा फोटो घ्या किंवा ड्रॅग आणि ड्रॉप करा',
    fileTypes: 'JPG, PNG किंवा PDF',
    uploadPrescription: 'प्रिस्क्रिप्शन अपलोड करा',

    exclusiveOffers: 'विशेष ऑफर्स',
    featuredPromotions: 'विशेष प्रमोशन्स',
    exploreAllOffers: 'सर्व ऑफर्स पहा',
    upTo40Off: '40% पर्यंत सूट',
    vitaminsSupplements: 'व्हिटॅमिन्स आणि सप्लिमेंट्स',
    vitaminsDescription: 'दैनंदिन आरोग्य उत्पादने विशेष किमतीत.',
    shopNow: 'आता खरेदी करा',

    sixtyOffPackage: '60% पर्यंत सूट',
    fullBodyCheckup: 'पूर्ण शरीर तपासणी',
    checkupDescription: 'विश्वसनीय डायग्नोस्टिक्ससह सर्वसमावेशक आरोग्य पॅकेजेस.',
    bookPackage: 'पॅकेज बुक करा',

    freeDelivery: 'मोफत डिलिव्हरी',
    expressMedicineDelivery: 'एक्सप्रेस औषध डिलिव्हरी',
    deliveryDescription: 'अस्सल औषधे जलद तुमच्या घरी मिळवा.',
    orderMedicine: 'औषध ऑर्डर करा',

    diagnosticsImaging: 'डायग्नोस्टिक्स आणि इमेजिंग',
    topBookedTests: 'सर्वाधिक बुक केलेल्या लॅब टेस्ट आणि स्कॅन',
    viewAllDiagnostics: 'सर्व डायग्नोस्टिक्स पहा',
    fullBody: 'पूर्ण शरीर',
    heartCheck: 'हृदय तपासणी',
    diabetesCare: 'मधुमेह काळजी',
    thyroidAssessment: 'थायरॉईड तपासणी',
    xrayScans: 'एक्स-रे आणि स्कॅन',

    pharmacyEcosystem: 'फार्मसी इकोसिस्टम',
    exploreByCategory: 'श्रेणीनुसार पहा',
    viewPharmacy: 'फार्मसी पहा',

    medicinesWellness: 'औषधे आणि वेलनेस',
    trendingEssentials: 'ट्रेंडिंग आरोग्य उत्पादने',
    browseMedicines: 'औषधे पहा',

    doctorConsultation: 'डॉक्टरांचा सल्ला',
    consultTopDoctors: 'तज्ज्ञ डॉक्टरांचा सल्ला घ्या',
    findAllDoctors: 'सर्व डॉक्टर पहा',

    personalHealthSnapshot: 'वैयक्तिक आरोग्य सारांश',
    welcomeBack: 'पुन्हा स्वागत आहे,',
    openDashboard: 'डॅशबोर्ड उघडा',
    healthScore: 'आरोग्य स्कोअर',
    optimalVitals: 'आरोग्य संकेत चांगले आहेत',
    labReportsCount: '12 लॅब रिपोर्ट्स',
    annualPanel: 'वार्षिक आरोग्य तपासणी',
    prescriptionsCount: '8 प्रिस्क्रिप्शन्स',
    digitalArchive: 'डिजिटल संग्रह',

    medicalInsights: 'वैद्यकीय माहिती',
    healthArticles: 'आरोग्य लेख',
    forYou: 'तुमच्यासाठी',
    readAllArticles: 'सर्व लेख वाचा',

    emergencyHotline: '24/7 आपत्कालीन काळजी',
    emergencyDescription: 'गरज असेल तेव्हा त्वरित वैद्यकीय मदत मिळवा.',
    callEmergency: 'आपत्कालीन सेवेला कॉल करा',

    off: 'सूट',
    rxRequired: 'Rx आवश्यक',
    lowStock: 'कमी स्टॉक',
    saveWishlist: 'विशलिस्टमध्ये सेव्ह करा',
    quickView: 'जलद पहा',
    reviews: 'परीक्षणे',
    decreaseQuantity: 'प्रमाण कमी करा',
    increaseQuantity: 'प्रमाण वाढवा',
    add: 'जोडा',

    testsIncluded: 'टेस्ट्स समाविष्ट',
    report: 'रिपोर्ट',
    bookTest: 'टेस्ट बुक करा',

    perVisit: 'प्रति भेट',
    next: 'पुढील',
    bookAppointment: 'अपॉइंटमेंट बुक करा',

    saved: 'सेव्ह केले',
    signedOut: 'साइन आउट केले',
    removedWishlist: 'विशलिस्टमधून काढले',
    savedWishlist: 'विशलिस्टमध्ये सेव्ह केले'
  },


  /* ======================================================
     BENGALI
  ====================================================== */

  bn: {
    doctors: 'ডাক্তার',
    pharmacy: 'ফার্মেসি',
    labTests: 'ল্যাব টেস্ট',
    healthPlans: 'স্বাস্থ্য পরিকল্পনা',
    healthRecords: 'স্বাস্থ্য রেকর্ড',
    internships: 'ইন্টার্নশিপ',
    trackOrders: 'আপনার অর্ডার ট্র্যাক করুন',

    searchPlaceholder: 'ডাক্তার, ওষুধ, ল্যাব টেস্ট, ইমেজিং খুঁজুন...',
    homeSearchPlaceholder: 'ডাক্তার, ওষুধ, ল্যাব টেস্ট, ইমেজিং, রোগ খুঁজুন...',
    search: 'অনুসন্ধান',

    cart: 'কার্ট',
    login: 'লগইন',
    register: 'নিবন্ধন',
    notifications: 'বিজ্ঞপ্তি',
    location: 'ব্রুকলিন, নিউ ইয়র্ক',

    announcementOne: 'আপনার যত্ন, আপনার সঙ্গে',
    announcementTwo: '24/7 ভার্চুয়াল কেয়ার এবং জরুরি সহায়তা প্রস্তুত',

    homeKicker: '01 / ডিজিটাল হেলথ ইকোসিস্টেম',
    virtualCare: '24/7 ভার্চুয়াল কেয়ার সক্রিয়',

    heroTitle: 'সম্পূর্ণ স্বাস্থ্যসেবা,',
    heroTitleSecond: 'একটি প্ল্যাটফর্মে।',
    heroDescription: 'সেরা ডাক্তারদের পরামর্শ নিন, আসল ওষুধ অর্ডার করুন, ল্যাব টেস্ট ও ইমেজিং বুক করুন এবং আপনার স্বাস্থ্য রেকর্ড পরিচালনা করুন — সবকিছু এক প্ল্যাটফর্মে।',

    popularSearches: 'জনপ্রিয় অনুসন্ধান:',
    findDoctor: 'ডাক্তার খুঁজুন',
    orderMedicines: 'ওষুধ অর্ডার করুন',
    bookDiagnostics: 'ডায়াগনস্টিক্স বুক করুন',
    emergency: '24/7 জরুরি পরিষেবা',

    whoCertified: 'WHO-GMP প্রত্যয়িত',
    dispatch: '30 মিনিট ডেলিভারি',
    verifiedSpecialists: 'যাচাইকৃত বিশেষজ্ঞ',
    authenticMedicines: 'আসল ওষুধ',
    labReports: 'ল্যাব টেস্ট রিপোর্ট',
    viewHealthRecords: 'এনক্রিপ্ট করা স্বাস্থ্য রেকর্ড দেখুন',

    expressCare: '30 মিনিট এক্সপ্রেস',
    expressGuarantee: '10 ঘণ্টার গ্যারান্টি',

    consultDoctor: 'ডাক্তারের পরামর্শ নিন',
    onlineInPerson: 'অনলাইন এবং সরাসরি',
    buyMedicines: 'ওষুধ কিনুন',
    expressDelivery: 'এক্সপ্রেস ডেলিভারি',
    bookLabTests: 'ল্যাব টেস্ট বুক করুন',
    homeCollection: 'বাড়িতে নমুনা সংগ্রহ',
    uploadRx: 'প্রেসক্রিপশন আপলোড করুন',
    snapOrder: 'ছবি তুলে অর্ডার করুন',
    xrayImaging: 'এক্স-রে এবং ইমেজিং',
    ctMriRadiology: 'CT, MRI এবং রেডিওলজি',
    healthRecordsShort: 'স্বাস্থ্য রেকর্ড',
    encryptedHistory: 'এনক্রিপ্ট করা ইতিহাস',
    healthPlansShort: 'স্বাস্থ্য পরিকল্পনা',
    familySubscriptions: 'পারিবারিক সাবস্ক্রিপশন',
    urgentCare: 'জরুরি চিকিৎসা',

    prescriptionAssistant: 'প্রেসক্রিপশন সহায়ক',
    doctorsPrescription: 'ডাক্তারের প্রেসক্রিপশন, সহজভাবে',
    prescriptionDescription: 'আপনার প্রেসক্রিপশন আপলোড করুন। আমাদের যাচাইকৃত ফার্মাসিস্টরা ওষুধ প্রস্তুত করে আপনার বাড়িতে পৌঁছে দেবেন।',
    snapOrDragRx: 'প্রেসক্রিপশনের ছবি তুলুন বা ড্র্যাগ করুন',
    pharmacistVerification: 'ফার্মাসিস্ট যাচাইকরণ',
    doorstepDelivery: 'বাড়িতে ডেলিভারি',
    licensedPharmacists: 'লাইসেন্সপ্রাপ্ত ফার্মাসিস্ট',
    hundredAuthentic: '100% আসল ওষুধ',
    thirtyMinDelivery: '30 মিনিট ডেলিভারি',
    snapOrDragDropRx: 'প্রেসক্রিপশনের ছবি তুলুন অথবা ড্র্যাগ ও ড্রপ করুন',
    fileTypes: 'JPG, PNG অথবা PDF',
    uploadPrescription: 'প্রেসক্রিপশন আপলোড করুন',

    exclusiveOffers: 'বিশেষ অফার',
    featuredPromotions: 'বিশেষ প্রচার',
    exploreAllOffers: 'সব অফার দেখুন',
    upTo40Off: '40% পর্যন্ত ছাড়',
    vitaminsSupplements: 'ভিটামিন ও সাপ্লিমেন্ট',
    vitaminsDescription: 'দৈনন্দিন স্বাস্থ্য পণ্য বিশেষ মূল্যে।',
    shopNow: 'এখনই কিনুন',

    sixtyOffPackage: '60% পর্যন্ত ছাড়',
    fullBodyCheckup: 'সম্পূর্ণ স্বাস্থ্য পরীক্ষা',
    checkupDescription: 'বিশ্বস্ত ডায়াগনস্টিক্সের সঙ্গে সম্পূর্ণ স্বাস্থ্য প্যাকেজ।',
    bookPackage: 'প্যাকেজ বুক করুন',

    freeDelivery: 'ফ্রি ডেলিভারি',
    expressMedicineDelivery: 'এক্সপ্রেস ওষুধ ডেলিভারি',
    deliveryDescription: 'আসল ওষুধ দ্রুত আপনার বাড়িতে পান।',
    orderMedicine: 'ওষুধ অর্ডার করুন',

    diagnosticsImaging: 'ডায়াগনস্টিক্স এবং ইমেজিং',
    topBookedTests: 'সবচেয়ে বেশি বুক করা ল্যাব টেস্ট ও স্ক্যান',
    viewAllDiagnostics: 'সব ডায়াগনস্টিক্স দেখুন',
    fullBody: 'সম্পূর্ণ শরীর',
    heartCheck: 'হার্ট চেক',
    diabetesCare: 'ডায়াবেটিস কেয়ার',
    thyroidAssessment: 'থাইরয়েড পরীক্ষা',
    xrayScans: 'এক্স-রে এবং স্ক্যান',

    pharmacyEcosystem: 'ফার্মেসি ইকোসিস্টেম',
    exploreByCategory: 'ক্যাটাগরি অনুযায়ী দেখুন',
    viewPharmacy: 'ফার্মেসি দেখুন',

    medicinesWellness: 'ওষুধ ও সুস্থতা',
    trendingEssentials: 'জনপ্রিয় স্বাস্থ্য পণ্য',
    browseMedicines: 'ওষুধ দেখুন',

    doctorConsultation: 'ডাক্তার পরামর্শ',
    consultTopDoctors: 'সেরা ডাক্তারদের পরামর্শ নিন',
    findAllDoctors: 'সব ডাক্তার দেখুন',

    personalHealthSnapshot: 'ব্যক্তিগত স্বাস্থ্য সারাংশ',
    welcomeBack: 'আবার স্বাগতম,',
    openDashboard: 'ড্যাশবোর্ড খুলুন',
    healthScore: 'স্বাস্থ্য স্কোর',
    optimalVitals: 'স্বাস্থ্য সূচক স্বাভাবিক',
    labReportsCount: '12 ল্যাব রিপোর্ট',
    annualPanel: 'বার্ষিক স্বাস্থ্য পরীক্ষা',
    prescriptionsCount: '8 প্রেসক্রিপশন',
    digitalArchive: 'ডিজিটাল আর্কাইভ',

    medicalInsights: 'চিকিৎসা তথ্য',
    healthArticles: 'স্বাস্থ্য বিষয়ক নিবন্ধ',
    forYou: 'আপনার জন্য',
    readAllArticles: 'সব নিবন্ধ পড়ুন',

    emergencyHotline: '24/7 জরুরি চিকিৎসা',
    emergencyDescription: 'প্রয়োজনের সময় তাৎক্ষণিক চিকিৎসা সহায়তা পান।',
    callEmergency: 'জরুরি পরিষেবায় কল করুন',

    off: 'ছাড়',
    rxRequired: 'Rx প্রয়োজন',
    lowStock: 'কম স্টক',
    saveWishlist: 'উইশলিস্টে সংরক্ষণ করুন',
    quickView: 'দ্রুত দেখুন',
    reviews: 'রিভিউ',
    decreaseQuantity: 'পরিমাণ কমান',
    increaseQuantity: 'পরিমাণ বাড়ান',
    add: 'যোগ করুন',

    testsIncluded: 'পরীক্ষা অন্তর্ভুক্ত',
    report: 'রিপোর্ট',
    bookTest: 'পরীক্ষা বুক করুন',

    perVisit: 'প্রতি ভিজিট',
    next: 'পরবর্তী',
    bookAppointment: 'অ্যাপয়েন্টমেন্ট বুক করুন',

    saved: 'সংরক্ষণ করা হয়েছে',
    signedOut: 'সাইন আউট করা হয়েছে',
    removedWishlist: 'উইশলিস্ট থেকে সরানো হয়েছে',
    savedWishlist: 'উইশলিস্টে সংরক্ষণ করা হয়েছে'
  }
}


/* ======================================================
   LANGUAGE STATE
====================================================== */

let currentLanguage =
  localStorage.getItem('thp_language') || 'en'


/* ======================================================
   GET CURRENT LANGUAGE
====================================================== */

export function getLanguage() {
  return currentLanguage
}


/* ======================================================
   CHANGE LANGUAGE
====================================================== */

export function setLanguage(languageCode) {

  if (!translations[languageCode]) {
    languageCode = 'en'
  }

  currentLanguage = languageCode

  try {
    localStorage.setItem(
      'thp_language',
      languageCode
    )
  } catch (error) {
    console.warn(
      'Unable to save language preference:',
      error
    )
  }

  window.dispatchEvent(
    new CustomEvent(
      'thp-language-change',
      {
        detail: languageCode
      }
    )
  )
}


/* ======================================================
   TRANSLATION HELPER
====================================================== */

export function t(key) {

  return (
    translations[currentLanguage]?.[key] ||
    translations.en[key] ||
    key
  )
}