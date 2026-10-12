export function calculateEmi(principal, annualRate, months) {
  const p = Number(principal), n = Number(months), r = Number(annualRate) / 1200;
  if (!Number.isFinite(p) || !Number.isFinite(n) || !Number.isFinite(r) || p <= 0 || n <= 0 || r < 0) throw new Error('Enter a valid amount, rate, and tenure.');
  const monthlyEmi = Math.round(r === 0 ? p / n : p * r * (1 + r) ** n / ((1 + r) ** n - 1));
  const totalRepayment = monthlyEmi * n;
  return { monthlyEmi, totalInterest: totalRepayment - p, totalRepayment };
}
