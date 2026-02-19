import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subject from '@/lib/models/Subject';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const syllabusFile = formData.get('syllabus') as File | null;
    const subjectCode = formData.get('subjectCode') as string;

    if ((!file && !syllabusFile) || !subjectCode) {
      return NextResponse.json(
        { success: false, error: 'At least one file (question paper or syllabus) and subject code are required' },
        { status: 400 }
      );
    }

    let questionPaperData = null;
    let syllabusData = null;

    // Upload question paper if provided
    if (file) {
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

      questionPaperData = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        ipfsHash: cid,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      };
    }

    // Upload syllabus if provided
    if (syllabusFile) {
      const syllabusPinataFormData = new FormData();
      syllabusPinataFormData.append('file', syllabusFile);

      const syllabusPinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': process.env.PINATA_API_KEY!,
          'pinata_secret_api_key': process.env.PINATA_API_SECRET!,
        },
        body: syllabusPinataFormData,
      });

      if (!syllabusPinataResponse.ok) {
        const error = await syllabusPinataResponse.text();
        throw new Error(`Syllabus upload to Pinata failed: ${error}`);
      }

      const syllabusPinataData = await syllabusPinataResponse.json();
      const syllabusCid = syllabusPinataData.IpfsHash;

      syllabusData = {
        fileName: syllabusFile.name,
        fileType: syllabusFile.type,
        fileSize: syllabusFile.size,
        ipfsHash: syllabusCid,
        pinataUrl: `https://gateway.pinata.cloud/ipfs/${syllabusCid}`,
      };
    }

    // Update subject with IPFS CID and file details
    await dbConnect();
    const updateData: any = {};
    if (questionPaperData) {
      updateData.questionPaper = questionPaperData;
    }
    if (syllabusData) {
      updateData.syllabus = syllabusData;
    }
    
    await Subject.findOneAndUpdate(
      { code: subjectCode },
      updateData
    );

    return NextResponse.json(
      { 
        success: true, 
        data: { 
          questionPaper: questionPaperData,
          syllabus: syllabusData 
        }, 
        message: questionPaperData && syllabusData
          ? 'Question paper and syllabus uploaded successfully' 
          : questionPaperData 
          ? 'Question paper uploaded successfully'
          : 'Syllabus uploaded successfully'
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error uploading to Pinata:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
