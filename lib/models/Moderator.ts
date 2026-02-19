import mongoose from 'mongoose';

const ModeratorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: false,
  },
  password: {
    type: String,
    required: false,
    default: 'moderator123',
  },
  assignedSubjects: [{
    type: String,
  }],
}, {
  timestamps: true,
  strict: false,
});

// Clear the cached model to ensure schema changes are applied
if (mongoose.models.Moderator) {
  delete mongoose.models.Moderator;
}

export default mongoose.model('Moderator', ModeratorSchema);
