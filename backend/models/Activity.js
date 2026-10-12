import mongoose from 'mongoose';
const comparisonSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, selectedLoans: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Loan' }], loanType: String, amount: Number, tenure: Number }, { timestamps: true });
const eligibilitySchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' }, inputData: mongoose.Schema.Types.Mixed, result: String, reasons: [String] }, { timestamps: true });
const recommendationSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' }, score: Number, reasons: [String] }, { timestamps: true });
const chatHistorySchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, messages: [{ role: String, content: String, createdAt: { type: Date, default: Date.now } }] }, { timestamps: true });
export const Comparison = mongoose.model('Comparison', comparisonSchema);
export const EligibilityCheck = mongoose.model('EligibilityCheck', eligibilitySchema);
export const Recommendation = mongoose.model('Recommendation', recommendationSchema);
export const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
