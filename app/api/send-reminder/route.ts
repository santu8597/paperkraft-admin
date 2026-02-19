import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import connectDB from '../../../lib/mongodb';
import EmailTemplate from '../../../lib/models/EmailTemplate';

export async function POST(request: NextRequest) {
  try {
    const { moderatorName, moderatorEmail, assignedSubjects } = await request.json();

    if (!moderatorEmail || !moderatorName) {
      return NextResponse.json(
        { success: false, error: 'Moderator email and name are required' },
        { status: 400 }
      );
    }

    // Get email template from database
    await connectDB();
    const template = await EmailTemplate.findOne({ type: 'reminder' });

    let subject = 'Reminder: Question Paper Submission Deadline Approaching';
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Reminder: Question Paper Deadline</h2>
        <p>Dear {{moderatorName}},</p>
        <p>This is a friendly reminder that the deadline for setting the question paper is approaching.</p>
        
        <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #dc2626;">Your Assigned Subjects:</h3>
          <ul style="margin: 10px 0;">
            {{assignedSubjects}}
          </ul>
        </div>
        
        <p><strong>Please ensure to submit your question papers before the deadline.</strong></p>
        <p>If you have any questions or need assistance, please contact the administrator immediately.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated reminder email. Please do not reply.</p>
      </div>
    `;

    // Use custom template if available
    if (template) {
      subject = template.subject;
      htmlBody = template.body;
    }

    // Replace placeholders
    const subjectsList = assignedSubjects.map((subject: string) => `<li>${subject}</li>`).join('');
    htmlBody = htmlBody
      .replace(/{{moderatorName}}/g, moderatorName)
      .replace(/{{moderatorEmail}}/g, moderatorEmail)
      .replace(/{{assignedSubjects}}/g, subjectsList);

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: moderatorEmail,
      subject: subject,
      html: htmlBody,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { success: true, message: 'Reminder email sent successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending reminder email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
