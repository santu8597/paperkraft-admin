import mongoose from 'mongoose';

const SubjectSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  is_questionPaperUploaded: {
    type: Boolean,
    default: false,
  },
  questionPaper: {
    fileName: String,
    fileType: String,
    fileSize: Number,
    ipfsHash: String,
    pinataUrl: String,
  },
  is_mod_questionPaperUploaded: {
    type: Boolean,
    default: false,
  },
  mod_questionPaper: {
    fileName: String,
    fileType: String,
    fileSize: Number,
    ipfsHash: String,
    pinataUrl: String,
  },
  syllabus: {
    fileName: String,
    fileType: String,
    fileSize: Number,
    ipfsHash: String,
    pinataUrl: String,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Subject || mongoose.model('Subject', SubjectSchema);
