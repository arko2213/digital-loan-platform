import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  mobile: { type: String, required: true, trim: true },
  employmentType: { type: String, enum: ['salaried', 'self-employed', 'student', 'other'], default: 'other' },
  monthlyIncome: { type: Number, min: 0, default: 0 },
  creditScore: { type: Number, min: 300, max: 900, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  disabled: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function (candidate) { return bcrypt.compare(candidate, this.password); };
export default mongoose.model('User', userSchema);
