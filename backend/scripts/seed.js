import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { connectDatabase } from '../config/db.js';
import Loan from '../models/Loan.js';
import { INDIAN_BANKS_LIVE_RATES } from '../services/bankRatesService.js';

await connectDatabase();
await Loan.deleteMany({});
const realBankProducts = INDIAN_BANKS_LIVE_RATES.map(p => ({
  ...p,
  isDemo: false,
  isLiveVerified: true,
  lastUpdated: new Date()
}));

await Loan.insertMany(realBankProducts);
console.log(`✅ Seeded ${realBankProducts.length} authentic Indian bank loan products into database.`);
process.exit(0);
