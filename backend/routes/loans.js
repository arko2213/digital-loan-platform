import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Loan from '../models/Loan.js';
import { protect, optionalProtect, adminOnly } from '../middleware/auth.js';
import { Comparison } from '../models/Activity.js';
import { calculateEmi } from '../utils/emi.js';
import { rankLoans } from '../services/recommendationService.js';
const router = Router();
const validate = (req, res, next) => { const e = validationResult(req); if (!e.isEmpty()) return res.status(400).json({ message: e.array()[0].msg }); next(); };
router.get('/', async (req, res, next) => {
  try {
    const { type, q, sort = 'interestRate', order = 'asc', page = 1, limit = 12, amount, tenure, maxRate, maxFee, maxIncome, creditScore } = req.query;
    const filter = { status: 'active' };
    if (type && type !== 'all') filter.loanType = type;
    if (amount !== undefined && amount !== '' && !isNaN(Number(amount)) && Number(amount) > 0) {
      filter.minAmount = { $lte: Number(amount) };
      filter.maxAmount = { $gte: Number(amount) };
    }
    if (tenure !== undefined && tenure !== '' && !isNaN(Number(tenure)) && Number(tenure) > 0) {
      filter.minTenure = { $lte: Number(tenure) };
      filter.maxTenure = { $gte: Number(tenure) };
    }
    if (maxRate !== undefined && maxRate !== '' && !isNaN(Number(maxRate)) && Number(maxRate) > 0) {
      filter.interestRate = { $lte: Number(maxRate) };
    }
    if (maxFee !== undefined && maxFee !== '' && !isNaN(Number(maxFee)) && Number(maxFee) >= 0) {
      filter.processingFee = { $lte: Number(maxFee) };
    }
    if (maxIncome !== undefined && maxIncome !== '' && !isNaN(Number(maxIncome)) && Number(maxIncome) > 0) {
      filter.minIncome = { $lte: Number(maxIncome) };
    }
    if (creditScore !== undefined && creditScore !== '' && !isNaN(Number(creditScore)) && Number(creditScore) > 0) {
      filter.minCreditScore = { $lte: Number(creditScore) };
    }
    if (q) filter.$or = [{ lender: new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { loanName: new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
    const sortField = ['interestRate', 'processingFee', 'minIncome', 'lender'].includes(sort) ? sort : 'interestRate';
    const p = Math.max(1, Number(page));
    const n = Math.min(50, Math.max(1, Number(limit)));
    const [loans, total] = await Promise.all([Loan.find(filter).sort({ [sortField]: order === 'desc' ? -1 : 1 }).skip((p - 1) * n).limit(n), Loan.countDocuments(filter)]);
    res.json({ loans, total, page: p, pages: Math.ceil(total / n) });
  } catch (e) {
    next(e);
  }
});
router.get('/stats', async (req, res, next) => { try { const [products, lenders] = await Promise.all([Loan.countDocuments({ status: 'active' }), Loan.distinct('lender', { status: 'active' })]); res.json({ products, lenders: lenders.length }); } catch (e) { next(e); } });
router.get('/benchmark', async (req, res, next) => { try { const { RBI_BENCHMARK } = await import('../services/bankRatesService.js'); res.json({ benchmark: RBI_BENCHMARK }); } catch (e) { next(e); } });
router.get('/recommendations', protect, async (req, res, next) => { try { const loans = await Loan.find({ status: 'active' }); res.json({ recommendations: rankLoans(loans, req.query) }); } catch (e) { next(e); } });
router.post('/compare', optionalProtect, [body('loanIds').isArray({ min: 2, max: 3 }).withMessage('Choose two or three loans to compare.'), body('amount').isFloat({ min: 1 }).withMessage('Enter a valid loan amount.'), body('tenure').isInt({ min: 1, max: 360 }).withMessage('Enter a valid tenure.')], validate, async (req, res, next) => {
  try {
    const loans = await Loan.find({ _id: { $in: req.body.loanIds }, status: 'active' });
    if (req.user) {
      await Comparison.create({ userId: req.user.id, selectedLoans: loans.map(l => l.id), loanType: loans[0]?.loanType, amount: req.body.amount, tenure: req.body.tenure });
    }
    res.json({ loans: loans.map(loan => ({ loan, ...calculateEmi(req.body.amount, loan.interestRate, req.body.tenure) })) });
  } catch (e) {
    next(e);
  }
});
router.get('/history', protect, async (req, res, next) => { try { const comparisons = await Comparison.find({ userId: req.user.id }).populate('selectedLoans').sort({ createdAt: -1 }).limit(8); res.json({ comparisons }); } catch (e) { next(e); } });
router.get('/:id', async (req, res, next) => { try { const loan = await Loan.findOne({ _id: req.params.id, status: 'active' }); if (!loan) return res.status(404).json({ message: 'Loan product not found.' }); res.json({ loan }); } catch (e) { next(e); } });
router.post('/', protect, adminOnly, async (req, res, next) => { try { const loan = await Loan.create({ ...req.body, isDemo: false, lastUpdated: new Date() }); res.status(201).json({ loan }); } catch (e) { next(e); } });
router.put('/:id', protect, adminOnly, async (req, res, next) => { try { const loan = await Loan.findByIdAndUpdate(req.params.id, { ...req.body, lastUpdated: new Date() }, { new: true, runValidators: true }); if (!loan) return res.status(404).json({ message: 'Loan product not found.' }); res.json({ loan }); } catch (e) { next(e); } });
router.delete('/:id', protect, adminOnly, async (req, res, next) => { try { const loan = await Loan.findByIdAndDelete(req.params.id); if (!loan) return res.status(404).json({ message: 'Loan product not found.' }); res.json({ message: 'Loan product removed.' }); } catch (e) { next(e); } });
export default router;
