import dns from 'dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Loan from '../models/Loan.js';
import { optionalProtect } from '../middleware/auth.js';
import { ChatHistory } from '../models/Activity.js';

const router = Router();

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 25_000;   // 25-second timeout per attempt

/**
 * Intelligent local fallback answering engine in case of NVIDIA network timeouts or outages.
 */
function generateLocalAnswer(userMessage, context) {
  const q = (userMessage || '').toLowerCase();
  const loans = context?.loans || [];
  
  const types = ['personal', 'home', 'education', 'car', 'business'];
  const matchedType = types.find(t => q.includes(t));
  
  let relevantLoans = matchedType 
    ? loans.filter(l => l.loanType === matchedType) 
    : loans;

  if (relevantLoans.length === 0) relevantLoans = loans;

  const sorted = [...relevantLoans].sort((a, b) => a.interestRate - b.interestRate);
  const best = sorted[0];

  if (q.includes('rate') || q.includes('best') || q.includes('lowest') || q.includes('compare') || matchedType || q.includes('option') || q.includes('recommend')) {
    const typeLabel = matchedType ? `${matchedType.toUpperCase()} loans` : 'active loan options';
    const top3 = sorted.slice(0, 4);
    
    let answer = `Here are the top competitive ${typeLabel} currently active in the platform:\n\n`;
    answer += `| Lender | Loan Name | Interest Rate | Processing Fee | Min Income |\n`;
    answer += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const l of top3) {
      answer += `| **${l.lender}** | ${l.loanName} | **${l.interestRate}%** | ${l.processingFee}% | ₹${(l.minIncome || 0).toLocaleString('en-IN')} |\n`;
    }
    answer += `\n**Key Takeaways:**\n`;
    if (best) {
      answer += `• **Lowest Rate:** **${best.lender} (${best.loanName})** offers starting rates from **${best.interestRate}% p.a.**\n`;
      answer += `• **Processing Fees:** Ranging from ${Math.min(...top3.map(l => l.processingFee))}% to ${Math.max(...top3.map(l => l.processingFee))}%\n`;
    }
    if (context?.profile?.creditScore) {
      answer += `• **Your Credit Profile:** With a credit score of ${context.profile.creditScore}, you meet eligibility for these offers.\n`;
    }
    answer += `\n*Note: Rates are subject to RBI benchmark updates and lender verification.*`;
    return answer;
  }

  if (q.includes('tenure') || q.includes('duration') || q.includes('time')) {
    return `### How Loan Tenure Affects Your Costs\n\n1. **Shorter Tenure (e.g. 12–24 months):**\n   • Higher monthly EMI\n   • Significantly lower total interest paid over the life of the loan\n\n2. **Longer Tenure (e.g. 36–60 months):**\n   • Lower monthly EMI, easier on monthly cash flow\n   • Higher total interest paid overall\n\n**Recommendation:** Use our built-in **EMI Calculator** to find the optimal tenure that keeps your EMI under 40% of your net monthly income.`;
  }

  if (q.includes('fixed') || q.includes('floating')) {
    return `### Fixed vs Floating Interest Rates\n\n• **Floating Rates:** Tied to external benchmarks like the **RBI Repo Rate (6.50%)**. If RBI changes repo rates, your interest rate adjusts accordingly. Most Indian home and bank loans use repo-linked floating rates.\n• **Fixed Rates:** The interest rate remains locked throughout the tenure. Provides monthly payment predictability, but typically carries a 1–2% higher initial rate.\n\nMost verified options on our platform use repo-linked floating rate cards for transparency.`;
  }

  return `### LoanAI Advice & Comparison\n\nWhen evaluating loan offers on DigitalLoan, consider:\n1. **Annual Interest Rate (APR):** Look for repo-linked benchmark spreads.\n2. **Processing & Prepayment Charges:** Compare upfront fees and foreclosure rules.\n3. **EMI Affordability:** Aim to keep total debt EMIs under 40% of your net monthly income.\n\nCurrently, our lowest active rate starts from **${best ? best.interestRate + '%' : '8.50%'}** with top lenders. Visit the **Compare** tab to compare loans side-by-side or calculate your exact EMI in the **Calculator** tab.`;
}

/**
 * Call NVIDIA NIM with timeout and automatic model fallback.
 */
async function callNvidia(apiKey, basePayload, candidateModels = []) {
  const models = [...new Set([basePayload.model, ...candidateModels].filter(Boolean))];
  let lastError;

  for (const model of models) {
    console.log(`[AI] Attempting NVIDIA model: ${model}`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(NVIDIA_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ ...basePayload, model })
      });

      console.log(`[AI] Model ${model} responded: HTTP ${response.status}`);
      if (!response.ok) {
        const errBody = await response.text();
        console.error(`[AI] ${model} error: ${errBody.substring(0, 300)}`);
        lastError = new Error(`NVIDIA API error ${response.status} on ${model}: ${errBody}`);
        continue;
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content;
      if (answer && typeof answer === 'string' && answer.trim()) {
        console.log(`[AI] Success with model: ${model} (length: ${answer.length})`);
        return answer.trim();
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`[AI] Model ${model} timed out after ${REQUEST_TIMEOUT_MS / 1000}s, trying fallback...`);
        lastError = new Error(`Model ${model} timed out`);
      } else {
        console.error(`[AI] Model ${model} error:`, err.message);
        lastError = err;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('NVIDIA API failed for all candidate models.');
}

router.post('/chat', optionalProtect, [body('message').trim().isLength({ min: 2, max: 1200 }).withMessage('Enter a message (up to 1,200 characters).')], async (req, res) => {
  const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  const apiKey = process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.replace(/^["']|["']$/g, '').trim() : '';

  console.log(`[AI] ── New chat request ──`);
  console.log(`[AI] User message: "${req.body.message}"`);

  let context = { profile: null, loans: [] };
  try {
    const loans = await Loan.find({ status: 'active' }).select('lender loanName loanType interestRate minAmount maxAmount minTenure maxTenure processingFee minIncome minCreditScore isDemo isLiveVerified benchmark').limit(50).lean();
    context = {
      profile: req.user ? { monthlyIncome: req.user.monthlyIncome, employmentType: req.user.employmentType, creditScore: req.user.creditScore } : null,
      loans
    };
  } catch (dbErr) {
    console.warn('[AI] Could not load loans for context:', dbErr.message);
  }

  let answer = '';

  if (apiKey) {
    try {
      const systemPrompt = `You are LoanAI Advisor, an educational loan comparison assistant. Answer concisely and transparently. Product information is from the supplied JSON only; never invent lenders, rates, fees or eligibility. Distinguish calculations, estimates, live bank rate facts, and general financial education. Do not promise approvals or give personalized financial advice. Context JSON: ${JSON.stringify(context)}`;

      const payload = {
        model: process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-bolt-e4b',
        max_tokens: 1024,
        stream: false,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: req.body.message }
        ]
      };

      const candidateModels = [
        'nvidia/nemotron-3.5-bolt-e4b',
        'nvidia/nemotron-3.5-lightning-30b-a3b',
        'meta/llama-3.2-11b-vision-instruct',
        'google/diffusiongemma-26b-a4b-it'
      ];

      answer = await callNvidia(apiKey, payload, candidateModels);
    } catch (e) {
      console.warn('[AI] NVIDIA API calls failed, falling back to local advisor:', e.message);
    }
  }

  // If NVIDIA returned no answer or API key was absent/failed, provide intelligent local fallback
  if (!answer) {
    console.log('[AI] Generating intelligent local answer...');
    answer = generateLocalAnswer(req.body.message, context);
  }

  if (req.user?.id && answer) {
    try {
      let chat = await ChatHistory.findOne({ userId: req.user.id }).sort({ updatedAt: -1 });
      if (!chat) chat = new ChatHistory({ userId: req.user.id, messages: [] });
      chat.messages.push({ role: 'user', content: req.body.message }, { role: 'assistant', content: answer });
      await chat.save();
    } catch (saveErr) {
      console.warn('[AI] Could not save chat history:', saveErr.message);
    }
  }

  res.json({ answer });
});

export default router;
