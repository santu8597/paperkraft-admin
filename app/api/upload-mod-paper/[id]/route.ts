import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subject from '@/lib/models/Subject';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: subjectId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Word document file is required' },
        { status: 400 }
      );
    }

    // Validate file type (accept both .doc and .docx)
    const allowedTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only Word documents (.doc, .docx) are allowed' },
        { status: 400 }
      );
    }

    // Upload to Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': process.env.PINATA_API_KEY!,
        'pinata_secret_api_key': process.env.PINATA_API_SECRET!,
      },
      body: pinataFormData,
    });

    if (!pinataResponse.ok) {
      const error = await pinataResponse.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const pinataData = await pinataResponse.json();
    const cid = pinataData.IpfsHash;

    const modQuestionPaperData = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      ipfsHash: cid,
      pinataUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
    };

    // Update subject with moderator's question paper details
    await dbConnect();
    const updatedSubject = await Subject.findByIdAndUpdate(
      subjectId,
      {
        mod_questionPaper: modQuestionPaperData,
        is_mod_questionPaperUploaded: true,
      },
      { new: true }
    );

    if (!updatedSubject) {
      return NextResponse.json(
        { success: false, error: 'Subject not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: modQuestionPaperData,
        message: 'Moderator question paper uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error uploading moderator question paper:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
