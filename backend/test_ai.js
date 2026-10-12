// Quick test script for the NVIDIA AI integration
const BASE = 'http://localhost:5000/api';

async function test() {
  // 1. Login
  console.log('1. Logging in...');
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'testuser123@example.com', password: 'Test@12345' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    process.exit(1);
  }
  
  const { token } = await loginRes.json();
  console.log('   ✓ Login successful, token obtained');

  // 2. Test AI chat
  console.log('2. Sending AI chat request...');
  const chatRes = await fetch(`${BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message: 'What is the best personal loan option for me?' })
  });

  console.log('   Status:', chatRes.status);
  const body = await chatRes.json();
  
  if (chatRes.ok) {
    console.log('   ✓ AI responded successfully!');
    console.log('   Answer (first 300 chars):', body.answer?.substring(0, 300));
  } else {
    console.error('   ✗ AI chat failed:', JSON.stringify(body));
  }

  // 3. Test loans endpoint
  console.log('3. Testing loans endpoint...');
  const loansRes = await fetch(`${BASE}/loans`);
  const loansData = await loansRes.json();
  console.log(`   ✓ Loans endpoint: ${loansData.loans?.length || 0} loans found`);

  // 4. Test health
  console.log('4. Testing health endpoint...');
  const healthRes = await fetch(`${BASE}/health`);
  const healthData = await healthRes.json();
  console.log(`   ✓ Health: ${healthData.status}`);

  console.log('\n=== Test complete ===');
}

test().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
