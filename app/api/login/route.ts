import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import Moderator from '@/lib/models/Moderator';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

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
    await connectDB();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find moderator by email
    const moderator = await Moderator.findOne({ email });

    if (!moderator) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if password matches
    // If password is stored as plain text (not recommended for production)
    let isPasswordValid = false;
    
    if (moderator.password.startsWith('$2a$') || moderator.password.startsWith('$2b$')) {
      // Password is hashed
      isPasswordValid = await bcrypt.compare(password, moderator.password);
    } else {
      // Password is plain text (for backward compatibility)
      isPasswordValid = password === moderator.password;
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: moderator._id.toString(),
        name: moderator.name,
        email: moderator.email,
        assignedSubjects: moderator.assignedSubjects,
      },
      JWT_SECRET,
      { expiresIn: '7d' } // Token expires in 7 days
    );

    return NextResponse.json({
      success: true,
      token,
      moderator: {
        id: moderator._id,
        name: moderator.name,
        email: moderator.email,
        assignedSubjects: moderator.assignedSubjects,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
