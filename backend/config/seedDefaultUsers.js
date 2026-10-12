import User from '../models/User.js';

export async function seedDefaultUsers() {
  try {
    // 1. Ensure Demo Borrower Account exists
    const demoEmail = 'demo@digitalloan.com';
    let demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      demoUser = new User({
        name: 'Priya Sharma',
        email: demoEmail,
        mobile: '9876543210',
        password: 'Password123',
        employmentType: 'salaried',
        monthlyIncome: 65000,
        creditScore: 750,
        role: 'user'
      });
      await demoUser.save();
      console.log('✅ Demo user seeded: demo@digitalloan.com / Password123');
    }

    // 2. Ensure Admin Account exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = new User({
        name: 'System Administrator',
        email: adminEmail,
        mobile: '9998887770',
        password: 'AdminPass123',
        employmentType: 'salaried',
        monthlyIncome: 120000,
        creditScore: 820,
        role: 'admin'
      });
      await adminUser.save();
      console.log(`✅ Demo admin seeded: ${adminEmail} / AdminPass123`);
    } else if (adminUser.role !== 'admin') {
      adminUser.role = 'admin';
      await adminUser.save();
    }
  } catch (err) {
    console.error('Warning: could not seed default users:', err.message);
  }
}
