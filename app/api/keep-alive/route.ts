import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    const mongoose = await dbConnect();

    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().command({ ping: 1 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'MongoDB keep-alive ping completed',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Keep-alive ping failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to ping MongoDB',
      },
      { status: 500 }
    );
  }
}