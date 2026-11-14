import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { EMAIL_REGEX, URL_REGEX, USER_RULES, byteLength } from '../utils/validation.js';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [USER_RULES.NAME_MIN, `Name must be at least ${USER_RULES.NAME_MIN} characters`],
      maxlength: [USER_RULES.NAME_MAX, `Name cannot exceed ${USER_RULES.NAME_MAX} characters`],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // creates a unique index (not a validator) — duplicates raise E11000
      trim: true,
      lowercase: true,
      maxlength: [USER_RULES.EMAIL_MAX, `Email cannot exceed ${USER_RULES.EMAIL_MAX} characters`],
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [USER_RULES.PASSWORD_MIN, `Password must be at least ${USER_RULES.PASSWORD_MIN} characters`],
      validate: {
        validator: (value) => byteLength(value) <= USER_RULES.PASSWORD_MAX_BYTES,
        message: `Password cannot exceed ${USER_RULES.PASSWORD_MAX_BYTES} bytes`,
      },
      select: false, // excluded from query results unless explicitly selected with .select('+password')
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: (value) => !value || URL_REGEX.test(value),
        message: 'Avatar must be a valid http(s) URL',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Defense in depth: never serialize the password, even on documents
      // where it was loaded or just created (e.g. the result of User.create()).
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash the password whenever it is set or changed. Schema validation runs before
// this hook, so the length rules above apply to the plaintext, not the hash.
// Note: query updates (findOneAndUpdate, updateOne) bypass this hook — change
// passwords via document.save().
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

/**
 * Compares a plaintext candidate against the stored hash.
 * The document must be loaded with `.select('+password')`.
 */
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!this.password) {
    throw new Error('comparePassword requires the password field — query with .select("+password")');
  }
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export { SALT_ROUNDS };
export default User;
