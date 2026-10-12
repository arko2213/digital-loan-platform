import Loan from '../models/Loan.js';
import { fetchLiveBankRates, RBI_BENCHMARK } from './bankRatesService.js';

/**
 * Synchronize live bank rate feeds into the MongoDB collection.
 * Upserts existing lender products and adds new real bank products.
 */
export async function syncLiveLoanProducts({ clearDemo = false } = {}) {
  const startTime = Date.now();
  const liveRates = await fetchLiveBankRates();

  if (clearDemo) {
    await Loan.deleteMany({ isDemo: true });
  }

  const results = {
    updated: 0,
    created: 0,
    total: liveRates.length,
    rbiRepoRate: RBI_BENCHMARK.repoRate,
    syncedAt: new Date()
  };

  for (const item of liveRates) {
    const existing = await Loan.findOne({
      lender: item.lender,
      loanName: item.loanName
    });

    if (existing) {
      await Loan.updateOne(
        { _id: existing._id },
        {
          $set: {
            interestRate: item.interestRate,
            rateMax: item.rateMax,
            minAmount: item.minAmount,
            maxAmount: item.maxAmount,
            minTenure: item.minTenure,
            maxTenure: item.maxTenure,
            processingFee: item.processingFee,
            minIncome: item.minIncome,
            minCreditScore: item.minCreditScore,
            benchmark: item.benchmark,
            sourceUrl: item.sourceUrl,
            eligibilityCriteria: item.eligibilityCriteria,
            documents: item.documents,
            description: item.description,
            isLiveVerified: true,
            isDemo: false,
            lastUpdated: new Date()
          }
        }
      );
      results.updated++;
    } else {
      await Loan.create({
        ...item,
        isLiveVerified: true,
        isDemo: false,
        lastUpdated: new Date()
      });
      results.created++;
    }
  }

  results.durationMs = Date.now() - startTime;
  return results;
}
