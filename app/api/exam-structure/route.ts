import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import ExamStructure from '../../../lib/models/ExamStructure';

// GET - Fetch exam structure
export async function GET() {
  try {
    await connectDB();
    let structure = await ExamStructure.findOne({});
    
    // Return default structure if none exists
    if (!structure) {
      structure = {
        groups: [
          {
            name: 'Group A',
            questionTypes: [
              { type: 'mcq', min: 1, max: 10 },
              { type: 'fillInTheBlanks', min: 0, max: 5 },
            ],
          },
        ],
      };
    }
    
    return NextResponse.json({ success: true, data: structure });
  } catch (error) {
    console.error('Error fetching exam structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exam structure' },
      { status: 500 }
    );
  }
}

// POST - Create or update exam structure
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    
    if (!data.groups || !Array.isArray(data.groups)) {
      return NextResponse.json(
        { success: false, error: 'Groups array is required' },
        { status: 400 }
      );
    }

    // Delete existing structure and create new one
    await ExamStructure.deleteMany({});
    
    const structure = await ExamStructure.create({
      groups: data.groups,
      updatedAt: new Date(),
    });

    return NextResponse.json({ 
      success: true, 
      data: structure,
      message: 'Exam structure saved successfully' 
    });
  } catch (error) {
    console.error('Error saving exam structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save exam structure' },
      { status: 500 }
    );
  }
}
