import mongoose from 'mongoose';

export const PROJECT_ROLES = Object.freeze(['admin', 'manager', 'developer', 'viewer']);
export const PROJECT_STATUSES = Object.freeze(['active', 'on_hold', 'completed', 'archived']);

export const PROJECT_RULES = Object.freeze({
  NAME_MIN: 2,
  NAME_MAX: 100,
  DESCRIPTION_MAX: 2000,
  // Jira-style key used as an issue prefix (e.g. "BUG" -> BUG-123):
  // starts with a letter, 2–10 uppercase letters/digits.
  KEY_REGEX: /^[A-Z][A-Z0-9]{1,9}$/,
  MEMBERS_MAX: 500,
});

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member user is required'],
    },
    role: {
      type: String,
      enum: {
        values: PROJECT_ROLES,
        message: `Role must be one of: ${PROJECT_ROLES.join(', ')}`,
      },
      default: 'developer',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [PROJECT_RULES.NAME_MIN, `Project name must be at least ${PROJECT_RULES.NAME_MIN} characters`],
      maxlength: [PROJECT_RULES.NAME_MAX, `Project name cannot exceed ${PROJECT_RULES.NAME_MAX} characters`],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [PROJECT_RULES.DESCRIPTION_MAX, `Description cannot exceed ${PROJECT_RULES.DESCRIPTION_MAX} characters`],
    },
    key: {
      type: String,
      required: [true, 'Project key is required'],
      unique: true, // unique index — duplicates raise E11000 (mapped to 409 by the error handler)
      trim: true,
      uppercase: true, // normalizing case makes uniqueness case-insensitive
      immutable: true, // issue identifiers (KEY-123) depend on it never changing
      match: [PROJECT_RULES.KEY_REGEX, 'Project key must be 2–10 characters, start with a letter, and contain only letters and numbers'],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project owner is required'],
    },
    members: {
      type: [memberSchema],
      default: [],
      validate: [
        {
          validator: (members) => members.length <= PROJECT_RULES.MEMBERS_MAX,
          message: `A project cannot have more than ${PROJECT_RULES.MEMBERS_MAX} members`,
        },
        {
          validator: (members) => {
            const ids = members.map((m) => String(m.user));
            return new Set(ids).size === ids.length;
          },
          message: 'A user can only be a member of a project once',
        },
      ],
    },
    status: {
      type: String,
      enum: {
        values: PROJECT_STATUSES,
        message: `Status must be one of: ${PROJECT_STATUSES.join(', ')}`,
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// "Projects I belong to" (optionally filtered by status) — multikey index on member ids.
projectSchema.index({ 'members.user': 1, status: 1 });
// "Projects I own".
projectSchema.index({ owner: 1 });

/**
 * Guarantees the owner is always a project member with the `admin` role.
 * Adds the owner if missing, or promotes an existing owner entry to admin.
 * Runs before validation on save()/create(). Query updates (updateOne,
 * findOneAndUpdate) bypass document middleware — modify membership via save().
 */
projectSchema.pre('validate', function ensureOwnerMembership() {
  if (!this.owner) return; // `required` validator reports the missing owner

  const ownerId = String(this.owner._id ?? this.owner);
  const ownerEntry = this.members.find((m) => String(m.user?._id ?? m.user) === ownerId);

  if (!ownerEntry) {
    this.members.unshift({ user: this.owner, role: 'admin' });
  } else if (ownerEntry.role !== 'admin') {
    ownerEntry.role = 'admin';
  }
});

/**
 * Returns the user's role in this project, or null if they are not a member.
 * Works whether or not `members.user` is populated.
 */
projectSchema.methods.getMemberRole = function getMemberRole(userId) {
  const id = String(userId);
  const member = this.members.find((m) => String(m.user?._id ?? m.user) === id);
  return member ? member.role : null;
};

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
