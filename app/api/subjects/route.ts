import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subject from '@/lib/models/Subject';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const subjects = await request.json();

    // Clear existing subjects and insert new ones
    await Subject.deleteMany({});
    const result = await Subject.insertMany(subjects);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const subjects = await Subject.find({});
    return NextResponse.json({ success: true, data: subjects }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await dbConnect();
    await Subject.deleteMany({});
    return NextResponse.json({ success: true, message: 'All subjects deleted' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
