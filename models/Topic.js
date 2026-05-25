import mongoose from 'mongoose';

const TopicSchema = new mongoose.Schema({
  subject: { type: String, required: true, default: 'General' },
  name: { type: String, required: true },
  userEmail: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  reviews: [{
    scheduledFor: { type: Date, required: true },
    completed: { type: Boolean, default: false }
  }]
});

export default mongoose.models.Topic || mongoose.model('Topic', TopicSchema);
