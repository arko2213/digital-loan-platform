import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Loan from '../models/Loan.js';
import { protect, optionalProtect } from '../middleware/auth.js';
import { EligibilityCheck, Recommendation } from '../models/Activity.js';
import { calculateEmi } from '../utils/emi.js';
import { assessEligibility } from '../services/eligibilityService.js';
import { rankLoans } from '../services/recommendationService.js';
const router = Router();
const validate = (req, res, next) => { const e = validationResult(req); if (!e.isEmpty()) return res.status(400).json({ message: e.array()[0].msg }); next(); };
router.post('/emi/calculate', [body('amount').isFloat({ min: 1, max: 1000000000 }).withMessage('Please enter a valid loan amount.'), body('rate').isFloat({ min: 0, max: 60 }).withMessage('Please enter a valid interest rate.'), body('months').isInt({ min: 1, max: 600 }).withMessage('Please enter a valid tenure.')], validate, (req, res, next) => { try { res.json(calculateEmi(req.body.amount, req.body.rate, req.body.months)); } catch (e) { next(e); } });
router.post('/eligibility/check', optionalProtect, [body('age').isInt({ min: 18, max: 100 }).withMessage('Enter an age between 18 and 100.'), body('monthlyIncome').isFloat({ min: 0 }).withMessage('Enter a valid monthly income.'), body('desiredAmount').isFloat({ min: 1 }).withMessage('Enter a valid loan amount.'), body('desiredTenure').isInt({ min: 1, max: 360 }).withMessage('Enter a valid tenure.'), body('creditScore').optional().isInt({ min: 300, max: 900 }).withMessage('Enter a score between 300 and 900.')], validate, async (req, res, next) => {
  try {
    const loans = await Loan.find({ status: 'active', loanType: req.body.loanType });
    const results = loans.map(loan => ({ loan, ...assessEligibility(loan, req.body) }));
    if (req.user) {
      await Promise.all(results.map(r => EligibilityCheck.create({ userId: req.user.id, loanId: r.loan.id, inputData: req.body, result: r.result, reasons: r.reasons })));
    }
    res.json({ results, disclaimer: 'Preliminary estimate based on demo product criteria. This is not a lender decision or approval.' });
  } catch (e) {
    next(e);
  }
});
router.post('/recommendations', protect, [body('amount').isFloat({ min: 1 }).withMessage('Enter a valid loan amount.'), body('tenure').isInt({ min: 1, max: 360 }).withMessage('Enter a valid tenure.'), body('loanType').isIn(['personal', 'home', 'education', 'car', 'business']).withMessage('Choose a loan type.')], validate, async (req, res, next) => {
  try { const loans = await Loan.find({ status: 'active', loanType: req.body.loanType }); const recommendations = rankLoans(loans, { ...req.body, monthlyIncome: req.body.monthlyIncome || req.user.monthlyIncome, creditScore: req.body.creditScore || req.user.creditScore }); await Promise.all(recommendations.map(r => Recommendation.create({ userId: req.user.id, loanId: r.loan.id, score: r.score, reasons: r.reasons }))); res.json({ recommendations }); } catch (e) { next(e); }
});
export default router;
