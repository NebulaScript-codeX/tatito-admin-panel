export function calculatePlanSavings(plan, inputs, consultationValue) {
  const benefits = plan.benefits || {};
  const visits = Math.max(0, Number(inputs.doctorVisits) || 0);
  const monthlyPharmacySpend = Math.max(0, Number(inputs.pharmacySpend) || 0);
  const annualLabSpend = Math.max(0, Number(inputs.labSpend) || 0);
  const consultationLimit = benefits.free_consultations_per_month;
  const eligibleVisits = consultationLimit == null
    ? visits
    : Math.min(visits, Math.max(0, Number(consultationLimit) || 0));
  const consultationSavings = eligibleVisits * 12 * Math.max(0, Number(consultationValue) || 0);
  const pharmacySavings = monthlyPharmacySpend * 12
    * (Number(benefits.pharmacy_discount_percent) || 0) / 100;
  const labSavings = annualLabSpend
    * (Number(benefits.lab_discount_percent) || 0) / 100;
  const annualPlanCost = Math.max(0, Number(plan.annualPrice ?? plan.annual_price) || 0) * 12;
  const grossSavings = consultationSavings + pharmacySavings + labSavings;

  return {
    eligibleVisits,
    consultationSavings,
    pharmacySavings,
    labSavings,
    grossSavings,
    annualPlanCost,
    netSavings: Math.max(0, Math.round(grossSavings - annualPlanCost)),
  };
}

export function calculateBestPlanSavings(plans, inputs, consultationValue) {
  return plans.reduce((best, plan) => {
    const estimate = calculatePlanSavings(plan, inputs, consultationValue);
    return estimate.netSavings > best.estimate.netSavings
      ? { plan, estimate }
      : best;
  }, {
    plan: null,
    estimate: {
      eligibleVisits: 0,
      consultationSavings: 0,
      pharmacySavings: 0,
      labSavings: 0,
      grossSavings: 0,
      annualPlanCost: 0,
      netSavings: 0,
    },
  });
}
