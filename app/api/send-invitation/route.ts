import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import connectDB from '../../../lib/mongodb';
import Moderator from '../../../lib/models/Moderator';
import EmailTemplate from '../../../lib/models/EmailTemplate';
import { generatePassword } from '../../../lib/passwordGenerator';

export async function POST(request: NextRequest) {
  try {
    const { moderatorName, moderatorEmail, password } = await request.json();

    if (!moderatorEmail || !moderatorName) {
      return NextResponse.json(
        { success: false, error: 'Moderator email and name are required' },
        { status: 400 }
      );
    }

    // Get email template from database
    await connectDB();
    let invitationPassword = password;

    if (!invitationPassword) {
      invitationPassword = generatePassword(6);
      const hashedPassword = await bcrypt.hash(invitationPassword, 10);

      const updatedModerator = await Moderator.findOneAndUpdate(
        { email: moderatorEmail },
        { password: hashedPassword },
        { new: true }
      );

      if (!updatedModerator) {
        return NextResponse.json(
          { success: false, error: 'Moderator not found' },
          { status: 404 }
        );
      }
    }

    const template = await EmailTemplate.findOne({ type: 'invitation' });

    let subject = 'Invitation to Admin Panel - Moderator Access';
    let htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to the Admin Panel</h2>
        <p>Dear {{moderatorName}},</p>
        <p>You have been invited to join as a moderator in our admin panel.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials:</h3>
          <p><strong>Email:</strong> {{moderatorEmail}}</p>
          <p><strong>Password:</strong> {{password}}</p>
        </div>
        
        <p>Please login using these credentials to access your dashboard.</p>
        <p>If you have any questions, please contact the administrator.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">This is an automated email. Please do not reply.</p>
      </div>
    `;

    // Use custom template if available
    if (template) {
      subject = template.subject;
      htmlBody = template.body;
    }

    // Replace placeholders
    htmlBody = htmlBody
      .replace(/{{moderatorName}}/g, moderatorName)
      .replace(/{{moderatorEmail}}/g, moderatorEmail)
      .replace(/{{password}}/g, invitationPassword);

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
      { success: true, message: 'Invitation email sent successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
