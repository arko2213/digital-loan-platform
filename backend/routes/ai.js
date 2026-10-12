import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import Loan from '../models/Loan.js';
import { optionalProtect } from '../middleware/auth.js';
import { ChatHistory } from '../models/Activity.js';
const router = Router();

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 12_000;   // 12-second timeout per attempt

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
      if (answer && answer.trim()) {
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
  if (!apiKey) return res.status(503).json({ message: 'AI Advisor is temporarily unavailable. Configure NVIDIA_API_KEY on the backend to enable it.' });

  console.log(`[AI] ── New chat request ──`);
  console.log(`[AI] User message: "${req.body.message}"`);
  console.log(`[AI] NVIDIA URL: ${NVIDIA_URL}`);
  console.log(`[AI] API key loaded: ${apiKey.substring(0, 12)}…`);

  try {
    const loans = await Loan.find({ status: 'active' }).select('lender loanName loanType interestRate minAmount maxAmount minTenure maxTenure processingFee minIncome minCreditScore isDemo isLiveVerified benchmark').limit(50).lean();
    const context = {
      profile: req.user ? { monthlyIncome: req.user.monthlyIncome, employmentType: req.user.employmentType, creditScore: req.user.creditScore } : null,
      loans
    };
    const systemPrompt = `You are LoanAI Advisor, an educational loan comparison assistant. Answer concisely and transparently. Product information is from the supplied JSON only; never invent lenders, rates, fees or eligibility. Distinguish calculations, estimates, live bank rate facts, and general financial education. Do not promise approvals or give personalized financial advice. Context JSON: ${JSON.stringify(context)}`;

    const payload = {
      model: process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct',
      max_tokens: 1024,
      stream: false,
      temperature: 0.5,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: req.body.message }
      ]
    };

    const candidateModels = [
      'meta/llama-3.2-11b-vision-instruct',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'google/diffusiongemma-26b-a4b-it'
    ];
    const answer = await callNvidia(apiKey, payload, candidateModels);

    if (!answer) {
      console.error('[AI] NVIDIA returned empty answer');
      return res.status(502).json({ message: 'The AI service returned an empty response. Please try again.' });
    }

    if (req.user?.id) {
      let chat = await ChatHistory.findOne({ userId: req.user.id }).sort({ updatedAt: -1 });
      if (!chat) chat = new ChatHistory({ userId: req.user.id, messages: [] });
      chat.messages.push({ role: 'user', content: req.body.message }, { role: 'assistant', content: answer });
      await chat.save();
      console.log(`[AI] ✓ Success — saved to chat history`);
    }

    res.json({ answer });
  } catch (e) {
    console.error('[AI] ✗ Final error:', e.message);
    const status = e.message.includes('timed out') ? 504 : 502;
    res.status(status).json({
      message: 'Sorry, I couldn\'t get a response from the AI service. The NVIDIA endpoint may be temporarily unavailable — please try again in a moment.'
    });
  }
});
export default router;
