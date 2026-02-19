import mongoose from 'mongoose';

export interface IQuestionType {
  type: 'mcq' | 'fillInTheBlanks' | 'shortAnswer' | 'longAnswer';
  min: number;
  max: number;
}

export interface IGroup {
  name: string;
  questionTypes: IQuestionType[];
}

export interface IExamStructure {
  groups: IGroup[];
  updatedAt?: Date;
}

const QuestionTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['mcq', 'fillInTheBlanks', 'shortAnswer', 'longAnswer'],
  },
  min: {
    type: Number,
    required: true,
    min: 0,
  },
  max: {
    type: Number,
    required: true,
    min: 0,
  },
});

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  questionTypes: [QuestionTypeSchema],
});

const ExamStructureSchema = new mongoose.Schema<IExamStructure>({
  groups: {
    type: [GroupSchema],
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.ExamStructure || mongoose.model<IExamStructure>('ExamStructure', ExamStructureSchema);
