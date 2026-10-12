import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

import { connectDatabase } from '../config/db.js';
import { syncLiveLoanProducts } from '../services/loanSyncService.js';


async function main() {
  try {
    await connectDatabase();
    console.log('🔄 Fetching and synchronizing live Indian Bank rate cards & benchmarks...');
    const result = await syncLiveLoanProducts({ clearDemo: true });
    console.log(`✅ Live Rate Sync Complete!`);
    console.log(`📊 Stats:`);
    console.log(`   - Total Products: ${result.total}`);
    console.log(`   - Products Updated: ${result.updated}`);
    console.log(`   - Products Created: ${result.created}`);
    console.log(`   - RBI Repo Benchmark: ${result.rbiRepoRate}%`);
    console.log(`   - Execution Time: ${result.durationMs}ms`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error synchronizing live rates:', error);
    process.exit(1);
  }
}

main();
