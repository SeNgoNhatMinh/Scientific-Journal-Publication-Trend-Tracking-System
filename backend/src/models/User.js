const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * Stores user information with RBAC support
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false, // Don't return password by default
    },
    role: {
      type: String,
      enum: ['researcher', 'student', 'lecturer', 'admin'],
      default: 'student',
    },
    institution: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    interests: [String], // Keywords/topics of interest
    avatar: String, // URL to profile picture
    isActive: {
      type: Boolean,
      default: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: { type: Date, default: null },
    bookmarks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
    }],
    trackedRuns: [{
      analysisRunId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AnalysisRun',
        required: true,
      },
      notifyEnabled: { type: Boolean, default: true },
      followedAt: { type: Date, default: Date.now },
    }],
    follows: [{
      targetType: {
        type: String,
        enum: ['keyword', 'journal', 'analysisRun'],
        required: true,
      },
      targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      notifyEnabled: { type: Boolean, default: true },
      followedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

userSchema.index({ 'trackedRuns.analysisRunId': 1 });
userSchema.index({ 'follows.targetId': 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
