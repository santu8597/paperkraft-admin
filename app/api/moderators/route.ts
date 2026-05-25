import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import dbConnect from '@/lib/mongodb';
import Moderator from '@/lib/models/Moderator';
import EmailTemplate from '@/lib/models/EmailTemplate';
import { generatePassword } from '@/lib/passwordGenerator';

async function sendModeratorInvitationEmail(params: {
  moderatorName: string;
  moderatorEmail: string;
  password: string;
}) {
  const { moderatorName, moderatorEmail, password } = params;

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

  if (template) {
    subject = template.subject;
    htmlBody = template.body;
  }

  htmlBody = htmlBody
    .replace(/{{moderatorName}}/g, moderatorName)
    .replace(/{{moderatorEmail}}/g, moderatorEmail)
    .replace(/{{password}}/g, password);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: moderatorEmail,
    subject,
    html: htmlBody,
  });
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const moderators = await request.json();

    console.log('Received moderators:', moderators);

    const moderatorsWithCredentials = await Promise.all(
      moderators.map(async (mod: any) => {
        const password = generatePassword(6);
        const hashedPassword = await bcrypt.hash(password, 10);

        return {
          name: mod.name,
          email: mod.email,
          phone: mod.phone,
          password: hashedPassword,
          assignedSubjects: mod.assignedSubjects,
          plaintextPassword: password,
        };
      })
    );

    console.log('Moderators with generated credentials:', moderatorsWithCredentials);

    // Clear existing moderators and insert new ones
    await Moderator.deleteMany({});
    const result = await Moderator.insertMany(
      moderatorsWithCredentials.map(({ plaintextPassword, ...moderator }) => moderator)
    );

    await Promise.allSettled(
      moderatorsWithCredentials
        .filter((mod: any) => mod.email)
        .map((mod: any) =>
          sendModeratorInvitationEmail({
            moderatorName: mod.name,
            moderatorEmail: mod.email,
            password: mod.plaintextPassword,
          })
        )
    );

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
