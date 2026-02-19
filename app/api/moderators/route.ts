import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Moderator from '@/lib/models/Moderator';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const moderators = await request.json();

    console.log('Received moderators:', moderators);

    // Set password to admin123 for all moderators
    const moderatorsWithPassword = moderators.map((mod: any) => ({
      name: mod.name,
      email: mod.email,
      phone: mod.phone,
      password: 'admin123',
      assignedSubjects: mod.assignedSubjects,
    }));

    console.log('Moderators with password:', moderatorsWithPassword);

    // Clear existing moderators and insert new ones
    await Moderator.deleteMany({});
    const result = await Moderator.insertMany(moderatorsWithPassword);

    console.log('Saved result:', result);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving moderators:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const moderators = await Moderator.find({});
    return NextResponse.json({ success: true, data: moderators }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await dbConnect();
    await Moderator.deleteMany({});
    return NextResponse.json({ success: true, message: 'All moderators deleted' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
