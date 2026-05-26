import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subject from '@/lib/models/Subject';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const subjectCode = body.subjectCode as string;
    if (!subjectCode) {
      return NextResponse.json({ success: false, error: 'subjectCode is required' }, { status: 400 });
    }

    await dbConnect();
    await Subject.findOneAndUpdate({ code: subjectCode }, { $unset: { questionPaper: 1 }, $set: { is_questionPaperUploaded: false } });

    return NextResponse.json({ success: true, message: 'Question paper removed' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting question paper:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
