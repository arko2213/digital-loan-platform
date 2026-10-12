import mongoose from 'mongoose';

const loanSchema = new mongoose.Schema({
  lender: { type: String, required: true, trim: true }, loanName: { type: String, required: true, trim: true },
  loanType: { type: String, enum: ['personal', 'home', 'education', 'car', 'business'], required: true, index: true },
  interestRate: { type: Number, required: true, min: 0, max: 60 }, rateMax: { type: Number, min: 0, max: 60 },
  minAmount: { type: Number, required: true, min: 0 }, maxAmount: { type: Number, required: true, min: 0 },
  minTenure: { type: Number, required: true, min: 1 }, maxTenure: { type: Number, required: true, min: 1 },
  processingFee: { type: Number, default: 0, min: 0 }, minIncome: { type: Number, default: 0, min: 0 },
  minCreditScore: { type: Number, default: 0, min: 0, max: 900 },
  benchmark: { type: String, default: 'RBI Repo Linked' }, sourceUrl: { type: String },
  isLiveVerified: { type: Boolean, default: false },
  eligibilityCriteria: [String], documents: [String], status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  description: String, isDemo: { type: Boolean, default: false }, lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });
export default mongoose.model('Loan', loanSchema);
