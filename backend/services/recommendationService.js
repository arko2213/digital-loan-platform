import { calculateEmi } from '../utils/emi.js';

export function rankLoans(loans, profile = {}) {
  const amount = Number(profile.amount || profile.desiredAmount || 500000);
  const tenure = Number(profile.tenure || profile.desiredTenure || 36);
  const income = Number(profile.monthlyIncome || 0);
  const score = Number(profile.creditScore || 0);
  return loans.map(loan => {
    let points = 0; const reasons = [];
    if (amount >= loan.minAmount && amount <= loan.maxAmount) { points += 30; reasons.push('Matches your requested amount.'); }
    if (tenure >= loan.minTenure && tenure <= loan.maxTenure) { points += 15; reasons.push('Supports your requested tenure.'); }
    if (income >= loan.minIncome) { points += 20; reasons.push('Meets the listed demo income threshold.'); }
    if (!score || score >= loan.minCreditScore) { points += 15; reasons.push(score ? 'Your entered score meets the listed demo requirement.' : 'Credit score not provided; verify this requirement.'); }
    const emi = calculateEmi(Math.min(Math.max(amount, loan.minAmount), loan.maxAmount), loan.interestRate, Math.max(tenure, 1));
    if (income && emi.monthlyEmi <= income * 0.35) { points += 15; reasons.push('Estimated EMI is within 35% of your stated monthly income.'); }
    if (loan.processingFee <= 1) { points += 5; reasons.push('Listed processing fee is comparatively low.'); }
    return { loan, score: points, reasons, emi };
  }).sort((a, b) => b.score - a.score);
}
