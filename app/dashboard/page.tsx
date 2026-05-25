'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import RichTextEditor from '../components/RichTextEditor';
import Toast from '../components/Toast';
import Dialog from '../components/Dialog';

interface Subject {
  code: string;
  name: string;
  department: string;
  is_questionPaperUploaded?: boolean;
  questionPaper?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    ipfsHash: string;
    pinataUrl: string;
  };
  syllabus?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    ipfsHash: string;
    pinataUrl: string;
  };
  is_mod_questionPaperUploaded?: boolean;
  mod_questionPaper?: {
    fileName: string;
    fileType: string;
    fileSize: number;
    ipfsHash: string;
    pinataUrl: string;
  };
}

interface Moderator {
  name: string;
  email: string;
  phone: string;
  password?: string;
  assignedSubjects: string[];
}

interface EmailTemplate {
  type: 'invitation' | 'reminder';
  subject: string;
  body: string;
}

interface QuestionType {
  type: 'mcq' | 'fillInTheBlanks' | 'shortAnswer' | 'longAnswer';
  min: number;
  max: number;
}

interface Group {
  name: string;
  questionTypes: QuestionType[];
}

interface ExamStructure { 
  groups: Group[];
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'subjects' | 'moderators' | 'emailTemplates' | 'examStructure'>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<{ invitation: EmailTemplate | null; reminder: EmailTemplate | null }>({
    invitation: null,
    reminder: null,
  });
  const [editingTemplate, setEditingTemplate] = useState<'invitation' | 'reminder' | null>(null);
  const [editorValues, setEditorValues] = useState<{ invitationSubject: string; invitationBody: string; reminderSubject: string; reminderBody: string }>({
    invitationSubject: '',
    invitationBody: '',
    reminderSubject: '',
    reminderBody: '',
  });
  const [examStructure, setExamStructure] = useState<ExamStructure>({
    groups: [
      {
        name: 'Group A',
        questionTypes: [
          { type: 'mcq', min: 1, max: 10 },
          { type: 'fillInTheBlanks', min: 0, max: 5 },
        ],
      },
    ],
  });
  const [uploadingSubjectCode, setUploadingSubjectCode] = useState<string | null>(null);
  const [uploadingSyllabusCode, setUploadingSyllabusCode] = useState<string | null>(null);
  const [sendingInvitationEmail, setSendingInvitationEmail] = useState<string | null>(null);
  const [sendingReminderEmail, setSendingReminderEmail] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const router = useRouter();

  const defaultInvitationBody = `<h2>Welcome to the Admin Panel</h2>
<p>Dear {{moderatorName}},</p>
<p>You have been invited to join as a moderator in our admin panel.</p>
<h3>Your Login Credentials:</h3>
<p><strong>Email:</strong> {{moderatorEmail}}</p>
<p><strong>Password:</strong> {{password}}</p>
<p>Please login using these credentials to access your dashboard.</p>
<p>If you have any questions, please contact the administrator.</p>`;

  const defaultReminderBody = `<h2>Reminder: Question Paper Deadline</h2>
<p>Dear {{moderatorName}},</p>
<p>This is a friendly reminder that the deadline for setting the question paper is approaching.</p>
<h3>Your Assigned Subjects:</h3>
<p>{{assignedSubjects}}</p>
<p><strong>Please ensure to submit your question papers before the deadline.</strong></p>
<p>If you have any questions or need assistance, please contact the administrator immediately.</p>`;

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      router.push('/');
    } else {
      loadDataFromDatabase();
    }
  }, [router]);

  const loadDataFromDatabase = async () => {
    try {
      const subjectsRes = await fetch('/api/subjects');
      const subjectsData = await subjectsRes.json();
      if (subjectsData.success) {
        setSubjects(subjectsData.data);
      }

      const moderatorsRes = await fetch('/api/moderators');
      const moderatorsData = await moderatorsRes.json();
      if (moderatorsData.success) {
        setModerators(moderatorsData.data);
      }

      const templatesRes = await fetch('/api/email-templates');
      const templatesData = await templatesRes.json();
      if (templatesData.success) {
        const invitationTemplate = templatesData.data.find((t: EmailTemplate) => t.type === 'invitation');
        const reminderTemplate = templatesData.data.find((t: EmailTemplate) => t.type === 'reminder');
        setEmailTemplates({
          invitation: invitationTemplate || null,
          reminder: reminderTemplate || null,
        });
      }

      const structureRes = await fetch('/api/exam-structure');
      const structureData = await structureRes.json();
      if (structureData.success && structureData.data.groups) {
        setExamStructure(structureData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });

      const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rowsData: any[] = XLSX.utils.sheet_to_json(mainSheet);

      const parsedSubjects: Subject[] = [];
      const moderatorsMap = new Map<string, Moderator>();

      rowsData.forEach((row: any) => {
        const subject: Subject = {
          code: row['PAPER CODE'] || '',
          name: row['PAPER NAME'] || '',
          department: row['DEPARTMENT'] || '',
        };
        parsedSubjects.push(subject);

        const moderatorName = row['NAME OF EXTERNAL PAPER SETTER'] || '';
        const moderatorEmail = row['EMAIL ADDRESS OF EXTERNAL PAPER SETTER'] || '';
        const moderatorPhone = row['MOBILE NO OF EXTERNAL PAPER SETTER'] || '';
        
        if (moderatorName) {
          if (moderatorsMap.has(moderatorEmail || moderatorName)) {
            const existingModerator = moderatorsMap.get(moderatorEmail || moderatorName)!;
            if (!existingModerator.assignedSubjects.includes(subject.code)) {
              existingModerator.assignedSubjects.push(subject.code);
            }
          } else {
            const moderator: Moderator = {
              name: moderatorName,
              email: moderatorEmail,
              phone: moderatorPhone,
              assignedSubjects: [subject.code],
            };
            moderatorsMap.set(moderatorEmail || moderatorName, moderator);
          }
        }
      });

      const parsedModerators = Array.from(moderatorsMap.values());
      setSubjects(parsedSubjects);
      setModerators(parsedModerators);
      setToast({ message: 'File parsed successfully!', type: 'success' });
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveToDatabase = async () => {
    if (subjects.length === 0 && moderators.length === 0) {
      setToast({ message: 'No data to save. Please upload a file first.', type: 'error' });
      return;
    }

    try {
      await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subjects),
      });

      await fetch('/api/moderators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moderators),
      });

      setToast({ message: 'Data saved to database successfully!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Error saving data to database.', type: 'error' });
    }
  };

  const handleClearDatabase = async () => {
    setDialog({
      isOpen: true,
      title: 'Clear Database',
      message: 'Are you sure you want to delete all data from the database? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await fetch('/api/subjects', {
            method: 'DELETE',
          });

          await fetch('/api/moderators', {
            method: 'DELETE',
          });

          setSubjects([]);
          setModerators([]);
          setToast({ message: 'Database cleared successfully!', type: 'success' });
        } catch (error) {
          setToast({ message: 'Error clearing database.', type: 'error' });
        }
        setDialog(null);
      },
    });
  };

  const handleUploadQuestionPaper = async (subjectCode: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSubjectCode(subjectCode);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectCode', subjectCode);

    try {
      const response = await fetch('/api/upload-paper', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSubjects(subjects.map(sub => 
          sub.code === subjectCode 
            ? { ...sub, questionPaper: result.data } 
            : sub
        ));
        setToast({ message: 'Question paper uploaded successfully!', type: 'success' });
      } else {
        setToast({ message: 'Error: ' + result.error, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error uploading question paper.', type: 'error' });
    } finally {
      setUploadingSubjectCode(null);
    }
  };

  const handleUploadSyllabus = async (subjectCode: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSyllabusCode(subjectCode);

    const formData = new FormData();
    formData.append('syllabus', file);
    formData.append('subjectCode', subjectCode);

    try {
      const response = await fetch('/api/upload-paper', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setSubjects(subjects.map(sub => 
          sub.code === subjectCode 
            ? { ...sub, syllabus: result.data.syllabus } 
            : sub
        ));
        setToast({ message: 'Syllabus uploaded successfully!', type: 'success' });
      } else {
        setToast({ message: 'Error: ' + result.error, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error uploading syllabus.', type: 'error' });
    } finally {
      setUploadingSyllabusCode(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    router.push('/');
  };

  const handleSendInvitation = async (moderator: Moderator) => {
    if (!moderator.email) {
      setToast({ message: 'Moderator email is not available.', type: 'error' });
      return;
    }

    setSendingInvitationEmail(moderator.email);

    try {
      const response = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorName: moderator.name,
          moderatorEmail: moderator.email,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setToast({ message: 'Invitation sent!', type: 'success' });
      } else {
        setToast({ message: 'Error: ' + result.error, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error sending invitation.', type: 'error' });
    } finally {
      setSendingInvitationEmail(null);
    }
  };

  const handleSendReminder = async (moderator: Moderator) => {
    if (!moderator.email) {
      setToast({ message: 'Moderator email is not available.', type: 'error' });
      return;
    }

    setSendingReminderEmail(moderator.email);

    try {
      const response = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moderatorName: moderator.name,
          moderatorEmail: moderator.email,
          assignedSubjects: moderator.assignedSubjects,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setToast({ message: 'Reminder sent!', type: 'success' });
      } else {
        setToast({ message: 'Error: ' + result.error, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error sending reminder.', type: 'error' });
    } finally {
      setSendingReminderEmail(null);
    }
  };

  const areAllAssignedModeratorPapersUploaded = (moderator: Moderator) => {
    if (moderator.assignedSubjects.length === 0) {
      return false;
    }

    return moderator.assignedSubjects.every((subjectCode) => {
      const assignedSubject = subjects.find((subject) => subject.code === subjectCode);
      return Boolean(assignedSubject?.is_mod_questionPaperUploaded);
    });
  };

  const handleSaveEmailTemplate = async (type: 'invitation' | 'reminder', subject: string, body: string) => {
    try {
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject, body }),
      });

      const result = await response.json();

      if (result.success) {
        setEmailTemplates({
          ...emailTemplates,
          [type]: result.data,
        });
        setEditingTemplate(null);
        setToast({ message: 'Template saved successfully!', type: 'success' });
      } else {
        setToast({ message: 'Error: ' + result.error, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error saving template.', type: 'error' });
    }
  };

  const handleAddGroup = () => {
    const nextLetter = String.fromCharCode(65 + examStructure.groups.length); // A, B, C, etc.
    setExamStructure({
      ...examStructure,
      groups: [
        ...examStructure.groups,
        {
          name: `Group ${nextLetter}`,
          questionTypes: [],
        },
      ],
    });
  };

  const handleRemoveGroup = (index: number) => {
    setExamStructure({
      ...examStructure,
      groups: examStructure.groups.filter((_, i) => i !== index),
    });
  };

  const handleUpdateGroupName = (index: number, name: string) => {
    const updated = [...examStructure.groups];
    updated[index].name = name;
    setExamStructure({ ...examStructure, groups: updated });
  };

  const handleAddQuestionType = (groupIndex: number) => {
    const updated = [...examStructure.groups];
    const isGroupA = groupIndex === 0;
    updated[groupIndex].questionTypes.push({
      type: isGroupA ? 'mcq' : 'shortAnswer',
      min: 0,
      max: 10,
    });
    setExamStructure({ ...examStructure, groups: updated });
  };

  const handleRemoveQuestionType = (groupIndex: number, typeIndex: number) => {
    const updated = [...examStructure.groups];
    updated[groupIndex].questionTypes = updated[groupIndex].questionTypes.filter((_, i) => i !== typeIndex);
    setExamStructure({ ...examStructure, groups: updated });
  };

  const handleUpdateQuestionType = (groupIndex: number, typeIndex: number, field: 'type' | 'min' | 'max', value: any) => {
    const updated = [...examStructure.groups];
    if (field === 'type') {
      updated[groupIndex].questionTypes[typeIndex].type = value;
    } else {
      updated[groupIndex].questionTypes[typeIndex][field] = parseInt(value) || 0;
    }
    setExamStructure({ ...examStructure, groups: updated });
  };

  const handleSaveExamStructure = async () => {
    try {
      const response = await fetch('/api/exam-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examStructure),
      });

      const result = await response.json();

      if (result.success) {
        setToast({ message: 'Exam structure saved successfully!', type: 'success' });
      } else {
        setToast({ message: 'Error: ' + result.error, type: 'error' });
      }
    } catch (error) {
      setToast({ message: 'Error saving exam structure.', type: 'error' });
    }
  };

  useEffect(() => {
    if (editingTemplate === 'invitation') {
      setEditorValues({
        ...editorValues,
        invitationSubject: emailTemplates.invitation?.subject || 'Invitation to Admin Panel - Moderator Access',
        invitationBody: emailTemplates.invitation?.body || defaultInvitationBody,
      });
    } else if (editingTemplate === 'reminder') {
      setEditorValues({
        ...editorValues,
        reminderSubject: emailTemplates.reminder?.subject || 'Reminder: Question Paper Submission Deadline Approaching',
        reminderBody: emailTemplates.reminder?.body || defaultReminderBody,
      });
    }
  }, [editingTemplate, emailTemplates]);

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-gray-100">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {dialog && (
        <Dialog
          isOpen={dialog.isOpen}
          title={dialog.title}
          message={dialog.message}
          onConfirm={dialog.onConfirm}
          onCancel={() => setDialog(null)}
        />
      )}

      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage subjects and moderators</p>
          </div>
          <div className="flex gap-3">
            <a
              href="https://github.com/santu8597/electron-builder/releases/download/revised/PaperKraft-revised-Setup.1.0.0.exe"
              download
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Get PaperKraft
            </a>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Upload Excel File</h2>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-700 mb-4
              file:mr-4 file:py-2.5 file:px-5
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100 file:cursor-pointer
              border border-gray-300 rounded-lg cursor-pointer bg-gray-50"
          />
          <div className="flex gap-3">
            <button
              onClick={handleSaveToDatabase}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              Save to Database
            </button>
            <button
              onClick={handleClearDatabase}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow-md"
            >
              Clear Database
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('subjects')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'subjects'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Subject Allocation
              </button>
              <button
                onClick={() => setActiveTab('moderators')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'moderators'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Moderators
              </button>
              <button
                onClick={() => setActiveTab('emailTemplates')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'emailTemplates'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Email Templates
              </button>
              <button
                onClick={() => setActiveTab('examStructure')}
                className={`px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === 'examStructure'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Exam Structure
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'subjects' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Subjects</h3>
                {subjects.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No subjects uploaded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Subject Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Subject Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Department
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Question Bank
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Moderator's Paper
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Syllabus
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {subjects.map((subject, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {subject.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {subject.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {subject.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {subject.questionPaper ? (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Uploaded
                                  </span>
                                  <a 
                                    href={subject.questionPaper.pinataUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                                    title={subject.questionPaper.fileName}
                                  >
                                    View
                                  </a>
                                </div>
                              ) : (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".doc,.docx,.pdf"
                                    onChange={(e) => handleUploadQuestionPaper(subject.code, e)}
                                    className="hidden"
                                    disabled={uploadingSubjectCode === subject.code}
                                  />
                                  <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md disabled:bg-gray-400">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    {uploadingSubjectCode === subject.code ? 'Uploading...' : 'Upload Question Bank'}
                                  </span>
                                </label>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {subject.is_mod_questionPaperUploaded && subject.mod_questionPaper ? (
                                <a
                                  href={subject.mod_questionPaper.pinataUrl}
                                  download={subject.mod_questionPaper.fileName}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm hover:shadow-md text-xs"
                                  title={`Download ${subject.mod_questionPaper.fileName}`}
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download Paper
                                </a>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  Not Uploaded
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {subject.syllabus ? (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ✓ Uploaded
                                  </span>
                                  <a 
                                    href={subject.syllabus.pinataUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium hover:underline"
                                    title={subject.syllabus.fileName}
                                  >
                                    View
                                  </a>
                                </div>
                              ) : (
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept=".doc,.docx,.pdf"
                                    onChange={(e) => handleUploadSyllabus(subject.code, e)}
                                    className="hidden"
                                    disabled={uploadingSyllabusCode === subject.code}
                                  />
                                  <span className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-sm hover:shadow-md disabled:bg-gray-400">
                                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    {uploadingSyllabusCode === subject.code ? 'Uploading...' : 'Upload Syllabus'}
                                  </span>
                                </label>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'moderators' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Moderators</h3>
                {moderators.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No moderators uploaded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Phone
                          </th>
                          {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Password
                          </th> */}
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Assigned Subjects
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {moderators.map((moderator, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {moderator.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {moderator.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {moderator.phone}
                            </td>
                            
                            <td className="px-6 py-4 text-sm text-gray-700">
                              <div className="flex flex-wrap gap-1">
                                {moderator.assignedSubjects.map((subject, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {subject}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex gap-2">
                                {(() => {
                                  const disableActions = areAllAssignedModeratorPapersUploaded(moderator);
                                  const disabledReason = 'Already uploaded paper';

                                  return (
                                    <>
                                <button
                                  onClick={() => handleSendInvitation(moderator)}
                                      disabled={disableActions || sendingInvitationEmail === moderator.email}
                                      title={disableActions ? disabledReason : undefined}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  {sendingInvitationEmail === moderator.email ? 'Sending...' : 'Invite'}
                                </button>
                                <button
                                  onClick={() => handleSendReminder(moderator)}
                                      disabled={disableActions || sendingReminderEmail === moderator.email}
                                      title={disableActions ? disabledReason : undefined}
                                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium shadow-sm hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                  {sendingReminderEmail === moderator.email ? 'Sending...' : 'Remind'}
                                </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'emailTemplates' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Email Templates</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Customize email body templates for invitations and reminders. Use placeholders like{' '}
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{moderatorName}}'}</code>,{' '}
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{moderatorEmail}}'}</code>,{' '}
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{password}}'}</code>, and{' '}
                  <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{'{{assignedSubjects}}'}</code>.
                </p>
                
                <div className="space-y-6">
                  {/* Invitation Template */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-semibold text-gray-800">Invitation Email Template</h4>
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'invitation' ? null : 'invitation')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        {editingTemplate === 'invitation' ? 'Cancel' : 'Edit Template'}
                      </button>
                    </div>

                    {editingTemplate === 'invitation' ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveEmailTemplate('invitation', editorValues.invitationSubject, editorValues.invitationBody);
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                          <input
                            type="text"
                            value={editorValues.invitationSubject}
                            onChange={(e) => setEditorValues({ ...editorValues, invitationSubject: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                          <RichTextEditor
                            value={editorValues.invitationBody}
                            onChange={(html) => setEditorValues({ ...editorValues, invitationBody: html })}
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Save Template
                        </button>
                      </form>
                    ) : (
                      <div>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-600">Subject:</p>
                          <p className="text-sm text-gray-800 mt-1">
                            {emailTemplates.invitation?.subject || 'Invitation to Admin Panel - Moderator Access'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Body Preview:</p>
                          <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-64 overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                              {emailTemplates.invitation?.body || 'No template saved yet. Click "Edit Template" to create one.'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reminder Template */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-md font-semibold text-gray-800">Reminder Email Template</h4>
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'reminder' ? null : 'reminder')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        {editingTemplate === 'reminder' ? 'Cancel' : 'Edit Template'}
                      </button>
                    </div>

                    {editingTemplate === 'reminder' ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveEmailTemplate('reminder', editorValues.reminderSubject, editorValues.reminderBody);
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                          <input
                            type="text"
                            value={editorValues.reminderSubject}
                            onChange={(e) => setEditorValues({ ...editorValues, reminderSubject: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                          <RichTextEditor
                            value={editorValues.reminderBody}
                            onChange={(html) => setEditorValues({ ...editorValues, reminderBody: html })}
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Save Template
                        </button>
                      </form>
                    ) : (
                      <div>
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-600">Subject:</p>
                          <p className="text-sm text-gray-800 mt-1">
                            {emailTemplates.reminder?.subject || 'Reminder: Question Paper Submission Deadline Approaching'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-2">Body Preview:</p>
                          <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-64 overflow-y-auto">
                            <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                              {emailTemplates.reminder?.body || 'No template saved yet. Click "Edit Template" to create one.'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'examStructure' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Exam Structure Configuration</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Group A: MCQ & Fill in the Blanks only | Groups B+: Short & Long Answer only
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddGroup}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Add Group
                    </button>
                    <button
                      onClick={handleSaveExamStructure}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                      Save Structure
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {examStructure.groups.map((group, groupIndex) => (
                    <div key={groupIndex} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => handleUpdateGroupName(groupIndex, e.target.value)}
                            className="text-lg font-semibold bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 mb-2"
                          />
                          {groupIndex === 0 && (
                            <p className="text-xs text-blue-600 font-medium">
                              Group A: Can only have MCQ and Fill in the Blanks
                            </p>
                          )}
                          {groupIndex > 0 && (
                            <p className="text-xs text-gray-600 font-medium">
                              Groups B+: Can only have Short Answer and Long Answer
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveGroup(groupIndex)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                        >
                          Remove Group
                        </button>
                      </div>

                      <div className="space-y-3 mb-4">
                        {group.questionTypes.map((qt, typeIndex) => (
                          <div key={typeIndex} className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-300">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Question Type</label>
                              <select
                                value={qt.type}
                                onChange={(e) => handleUpdateQuestionType(groupIndex, typeIndex, 'type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                              >
                                {groupIndex === 0 ? (
                                  <>
                                    <option value="mcq">Multiple Choice (MCQ)</option>
                                    <option value="fillInTheBlanks">Fill in the Blanks</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="shortAnswer">Short Answer</option>
                                    <option value="longAnswer">Long Answer</option>
                                  </>
                                )}
                              </select>
                            </div>
                            <div className="w-24">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Min</label>
                              <input
                                type="number"
                                value={qt.min}
                                onChange={(e) => handleUpdateQuestionType(groupIndex, typeIndex, 'min', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                min="0"
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-xs font-medium text-gray-600 mb-1">Max</label>
                              <input
                                type="number"
                                value={qt.max}
                                onChange={(e) => handleUpdateQuestionType(groupIndex, typeIndex, 'max', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                                min="0"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveQuestionType(groupIndex, typeIndex)}
                              className="mt-5 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleAddQuestionType(groupIndex)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                      >
                        Add Question Type
                      </button>
                    </div>
                  ))}
                </div>

                {examStructure.groups.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <p>No groups configured yet. Click "Add Group" to start.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
