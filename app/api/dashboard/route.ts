import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Subject from '@/lib/models/Subject';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

interface JWTPayload {
  id: string;
  name: string;
  email: string;
  assignedSubjects: string[];
  iat: number;
  exp: number;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    // Verify token
    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Verify email matches token
    if (decoded.email !== email) {
      return NextResponse.json(
        { error: 'Email does not match token' },
        { status: 401 }
      );
    }

    await connectDB();

    // Get assigned subjects from the database
    const assignedSubjects = decoded.assignedSubjects || [];
    
    // Fetch subject details for assigned subjects
    const subjects = await Subject.find({
      code: { $in: assignedSubjects }
    });

    return NextResponse.json({
      success: true,
      moderator: {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
      },
      assignedSubjects: subjects,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
