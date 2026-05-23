import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    const mongoose = await dbConnect();

    if (mongoose.connection.db) {
      await mongoose.connection.db.listCollections({}, { nameOnly: true }).limit(1).toArray();
    }

    return NextResponse.json(
      {
        success: true,
        message: 'MongoDB keep-alive read completed',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Keep-alive read failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to read from MongoDB',
      },
      { status: 500 }
    );
  }
}