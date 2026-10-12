export function assessEligibility(loan, data) {
  const reasons = [];
  if (Number(data.age) < 18 || Number(data.age) > 70) reasons.push('Age is outside the general assessment range of 18–70 years.');
  if (Number(data.desiredAmount) < loan.minAmount || Number(data.desiredAmount) > loan.maxAmount) reasons.push(`Requested amount is outside this product’s demo range (₹${loan.minAmount.toLocaleString('en-IN')}–₹${loan.maxAmount.toLocaleString('en-IN')}).`);
  if (Number(data.desiredTenure) < loan.minTenure || Number(data.desiredTenure) > loan.maxTenure) reasons.push(`Requested tenure is outside this product’s demo range (${loan.minTenure}–${loan.maxTenure} months).`);
  if (Number(data.monthlyIncome) < loan.minIncome) reasons.push(`Monthly income is below the listed demo threshold of ₹${loan.minIncome.toLocaleString('en-IN')}.`);
  if (Number(data.creditScore) < loan.minCreditScore) reasons.push(`Credit score is below the listed demo threshold of ${loan.minCreditScore}.`);
  const result = reasons.length ? 'not_eligible' : 'potentially_eligible';
  return { result, reasons: reasons.length ? reasons : ['The provided details meet the displayed demo criteria. A lender would make the actual decision after verification.'] };
}
