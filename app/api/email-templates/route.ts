import { NextRequest, NextResponse } from 'next/server';
import connectDB from '../../../lib/mongodb';
import EmailTemplate from '../../../lib/models/EmailTemplate';

// GET - Fetch email templates
export async function GET() {
  try {
    await connectDB();
    const templates = await EmailTemplate.find({});
    
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

// POST - Create or update email templates
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();
    
    if (!data.type || !data.subject || !data.body) {
      return NextResponse.json(
        { success: false, error: 'Type, subject, and body are required' },
        { status: 400 }
      );
    }

    // Update or create template
    const template = await EmailTemplate.findOneAndUpdate(
      { type: data.type },
      { 
        subject: data.subject, 
        body: data.body,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ 
      success: true, 
      data: template,
      message: 'Template saved successfully' 
    });
  } catch (error) {
    console.error('Error saving email template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save email template' },
      { status: 500 }
    );
  }
}
