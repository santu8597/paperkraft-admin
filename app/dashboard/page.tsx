'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  const [isLoading, setIsLoading] = useState(true);
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

  const tabs = [
    { id: 'subjects', label: 'Subject Allocation', icon: 'grid' },
    { id: 'moderators', label: 'Moderators', icon: 'user' },
    { id: 'emailTemplates', label: 'Email Templates', icon: 'mail' },
    { id: 'examStructure', label: 'Exam Structure', icon: 'layers' },
  ] as const;

  const iconClass = 'h-4 w-4';

  const renderTabIcon = (icon: (typeof tabs)[number]['icon']) => {
    switch (icon) {
      case 'grid':
        return (
          <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="5" height="5" rx="1.2" />
            <rect x="12" y="3" width="5" height="5" rx="1.2" />
            <rect x="3" y="12" width="5" height="5" rx="1.2" />
            <rect x="12" y="12" width="5" height="5" rx="1.2" />
          </svg>
        );
      case 'user':
        return (
          <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="10" cy="7" r="3" />
            <path d="M4 17c1.6-3 4-4.5 6-4.5S14.4 14 16 17" strokeLinecap="round" />
          </svg>
        );
      case 'mail':
        return (
          <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="14" height="10" rx="1.5" />
            <path d="M4 6.5 10 11l6-4.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'layers':
        return (
          <svg className={iconClass} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 3 3 7l7 4 7-4-7-4Z" strokeLinejoin="round" />
            <path d="M3 11l7 4 7-4" strokeLinejoin="round" />
          </svg>
        );
    }
  };

  const pageShell = 'min-h-screen text-slate-900';
  const panelShell = 'rounded-[24px] border border-slate-200/80 bg-white/92 shadow-[0_14px_40px_rgba(15,23,42,0.08)] backdrop-blur';
  const sectionShell = 'rounded-[20px] border border-slate-200/80 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]';
  const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,_#3b73ff_0%,_#2456de_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(47,103,255,0.28)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(47,103,255,0.34)] active:translate-y-0 active:scale-[0.985]';
  const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-[#2f67ff] shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)] active:translate-y-0 active:scale-[0.985]';
  const tabButton = 'group -mb-px inline-flex items-center gap-2 border-b-2 px-3 pb-4 pt-1 text-[14px] font-[600] transition-all duration-200 ease-out sm:px-4 hover:-translate-y-0.5 hover:text-[#2f67ff] active:translate-y-0 active:scale-[0.985]';
  const elevatedActionButton = 'inline-flex items-center justify-center rounded-[12px] bg-[#2f67ff] px-4 py-2.5 text-[13px] font-[700] text-white shadow-[0_10px_24px_rgba(47,103,255,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#2456de] hover:shadow-[0_16px_32px_rgba(47,103,255,0.3)] active:translate-y-0 active:scale-[0.985]';
  const elevatedSecondaryActionButton = 'inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-[700] text-[#2f67ff] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)] active:translate-y-0 active:scale-[0.985]';

  const SkeletonLine = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse rounded-full bg-slate-200/80 ${className}`} />
  );

  const SkeletonTable = ({ rows = 4 }: { rows?: number }) => (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <div className="bg-[linear-gradient(180deg,_#f7f9ff_0%,_#eef3ff_100%)] px-5 py-4">
        <div className="grid grid-cols-6 gap-4">
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="h-3 w-20" />
          <SkeletonLine className="h-3 w-24" />
          <SkeletonLine className="h-3 w-28" />
          <SkeletonLine className="h-3 w-20" />
        </div>
      </div>
      <div className="divide-y divide-slate-100 bg-white">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-6 gap-4 px-5 py-5">
            <SkeletonLine className="h-8 w-20 rounded-[10px]" />
            <div className="space-y-2">
              <SkeletonLine className="h-3 w-4/5" />
              <SkeletonLine className="h-3 w-3/5" />
            </div>
            <SkeletonLine className="h-3 w-16" />
            <SkeletonLine className="h-8 w-28 rounded-[12px]" />
            <SkeletonLine className="h-8 w-28 rounded-[12px]" />
            <SkeletonLine className="h-8 w-28 rounded-[12px]" />
          </div>
        ))}
      </div>
    </div>
  );

  const SkeletonTemplateCard = () => (
    <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <SkeletonLine className="h-4 w-48" />
        <SkeletonLine className="h-9 w-28 rounded-[12px]" />
      </div>
      <div className="space-y-4">
        <div>
          <SkeletonLine className="mb-2 h-3 w-16" />
          <SkeletonLine className="h-12 w-full rounded-[12px]" />
        </div>
        <div>
          <SkeletonLine className="mb-2 h-3 w-20" />
          <div className="space-y-2 rounded-[14px] border border-slate-200 bg-slate-50 p-4">
            <SkeletonLine className="h-3 w-4/5" />
            <SkeletonLine className="h-3 w-11/12" />
            <SkeletonLine className="h-3 w-3/5" />
            <SkeletonLine className="h-3 w-9/12" />
          </div>
        </div>
      </div>
    </div>
  );

  const SkeletonSubjectSection = () => (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <SkeletonLine className="h-10 w-10 rounded-full" />
        <SkeletonLine className="h-5 w-32" />
      </div>
      <SkeletonTable rows={4} />
    </div>
  );

  const SkeletonModeratorsSection = () => (
    <div>
      <SkeletonLine className="mb-4 h-5 w-36" />
      <SkeletonTable rows={4} />
    </div>
  );

  const SkeletonEmailTemplatesSection = () => (
    <div>
      <SkeletonLine className="mb-4 h-5 w-40" />
      <div className="mb-6 space-y-2">
        <SkeletonLine className="h-3 w-full max-w-3xl" />
        <SkeletonLine className="h-3 w-5/6 max-w-3xl" />
      </div>
      <div className="space-y-6">
        <SkeletonTemplateCard />
        <SkeletonTemplateCard />
      </div>
    </div>
  );

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
    } finally {
      setIsLoading(false);
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
      const rowsData = XLSX.utils.sheet_to_json<Record<string, string>>(mainSheet);

      const parsedSubjects: Subject[] = [];
      const moderatorsMap = new Map<string, Moderator>();

      rowsData.forEach((row) => {
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

  const handleUpdateQuestionType = (
    groupIndex: number,
    typeIndex: number,
    field: 'type' | 'min' | 'max',
    value: string,
  ) => {
    const updated = [...examStructure.groups];
    if (field === 'type') {
      updated[groupIndex].questionTypes[typeIndex].type = value as QuestionType['type'];
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
      setEditorValues((current) => ({
        ...current,
        invitationSubject: emailTemplates.invitation?.subject || 'Invitation to Admin Panel - Moderator Access',
        invitationBody: emailTemplates.invitation?.body || defaultInvitationBody,
      }));
    } else if (editingTemplate === 'reminder') {
      setEditorValues((current) => ({
        ...current,
        reminderSubject: emailTemplates.reminder?.subject || 'Reminder: Question Paper Submission Deadline Approaching',
        reminderBody: emailTemplates.reminder?.body || defaultReminderBody,
      }));
    }
  }, [editingTemplate, emailTemplates, defaultInvitationBody, defaultReminderBody]);

  return (
    <div className={pageShell}>
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

      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(47,103,255,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(97,171,255,0.12),_transparent_32%),linear-gradient(180deg,_#f8fbff_0%,_#f5f8fd_48%,_#eef4fb_100%)]" />

      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
        <header className={`${panelShell} flex items-center justify-between px-5 py-4 sm:px-6`}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,_#eef4ff_0%,_#ffffff_100%)] shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
              <Image
                src="/transparent_bg.png"
                alt="PaperKraft"
                width={34}
                height={34}
                className="h-8 w-8 rounded-xl object-cover shadow-[0_10px_18px_rgba(47,103,255,0.18)]"
                priority
              />
            </div>
            <div>
              <h1 className="text-[24px] font-[700] tracking-[-0.03em] text-slate-900">Admin Dashboard</h1>
              <p className="mt-0.5 text-[13px] font-medium text-slate-500">Manage subjects and moderators</p>
            </div>
          </div>
          <div className="flex gap-3">
            <a
              href="https://github.com/santu8597/electron-builder/releases/download/revised/PaperKraft-revised-Setup.1.0.0.exe"
              download
              className={secondaryButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 3v10" strokeLinecap="round" />
                <path d="m6.5 9.5 3.5 3.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17h12" strokeLinecap="round" />
              </svg>
              Get PaperKraft
            </a>
            <button
              onClick={handleLogout}
              className={primaryButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7.5 4.5h-2A1.5 1.5 0 0 0 4 6v8A1.5 1.5 0 0 0 5.5 15.5h2" strokeLinecap="round" />
                <path d="M11 6.5 14.5 10 11 13.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 10H7" strokeLinecap="round" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        <main className="space-y-6 pb-6">
          <section className={`${panelShell} overflow-hidden px-4 py-4 sm:px-5 sm:py-5`}>
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,_#edf3ff_0%,_#ffffff_100%)] text-[#2f67ff] shadow-[0_10px_22px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v10" />
                  <path d="m8.5 6.5 3.5-3.5 3.5 3.5" />
                  <path d="M5 14v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
                </svg>
              </div>
              <h2 className="text-[18px] font-[700] tracking-[-0.02em] text-slate-900">Upload Excel File</h2>
            </div>
            <label className="group flex cursor-pointer items-stretch overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)] active:translate-y-0 active:scale-[0.995]">
              <div className="flex items-center gap-2 border-r border-slate-200 bg-slate-50 px-5 py-4 text-[#2f67ff] transition-all duration-200 ease-out group-hover:bg-slate-100 group-hover:text-[#2456de]">
                <svg className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 3v10" />
                  <path d="m6.5 7.5 3.5-3.5 3.5 3.5" />
                  <path d="M4 15.5A2.5 2.5 0 0 0 6.5 18h7A2.5 2.5 0 0 0 16 15.5" />
                </svg>
                <span className="text-[14px] font-[700] transition-transform duration-200 group-hover:translate-x-0.5">Choose File</span>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between px-4 py-4 text-[14px] text-slate-400 transition-colors duration-200 sm:px-5 group-hover:text-slate-500">
                <span className="truncate">No file chosen</span>
                <svg className="h-[18px] w-[18px] shrink-0 text-slate-400 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#2f67ff]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="m12.5 4.5 3 3a2.1 2.1 0 0 1 0 3l-7 7a2.6 2.6 0 0 1-1.5.8l-3.8.5.5-3.8a2.6 2.6 0 0 1 .8-1.5l7-7a2.1 2.1 0 0 1 3 0Z" strokeLinejoin="round" />
                </svg>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleSaveToDatabase}
              className={primaryButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4.5 3.5h7l4 4V16a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 3.5 16V5A1.5 1.5 0 0 1 5 3.5Z" />
                <path d="M6.5 3.5V8h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Save to Database
            </button>
            <button
              onClick={handleClearDatabase}
              className={secondaryButton}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 5.5V4.25A1.25 1.25 0 0 1 8.25 3h3.5A1.25 1.25 0 0 1 13 4.25V5.5" strokeLinecap="round" />
                <path d="M4.5 5.5h11" strokeLinecap="round" />
                <path d="M7.5 8v6.5M10 8v6.5M12.5 8v6.5" strokeLinecap="round" />
                <path d="M6.25 5.5l.5 9A1.5 1.5 0 0 0 8.24 16h3.52a1.5 1.5 0 0 0 1.49-1.5l.5-9" strokeLinejoin="round" />
              </svg>
              Clear Database
            </button>
            </div>
          </section>

          <section className={sectionShell}>
            <div className="border-b border-slate-200 px-4 pt-3 sm:px-5">
              <nav className="flex flex-wrap gap-2 sm:gap-3">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${tabButton} ${
                        isActive
                          ? 'border-[#2f67ff] text-[#2f67ff]'
                          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      }`}
                    >
                      {renderTabIcon(tab.icon)}
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="px-4 py-5 sm:px-5 sm:py-6">
            {activeTab === 'subjects' && (
              isLoading ? (
                <SkeletonSubjectSection />
              ) : (
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,_#edf3ff_0%,_#ffffff_100%)] text-[#2f67ff] shadow-[0_10px_22px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
                    <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4.5h5v5H4z" />
                      <path d="M11 4.5h5v5h-5z" />
                      <path d="M4 11.5h5v5H4z" />
                      <path d="M11 11.5h5v5h-5z" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-[700] tracking-[-0.02em] text-slate-900">Subjects</h3>
                </div>
                {subjects.length === 0 ? (
                  <p className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center text-[14px] font-medium text-slate-500">No subjects uploaded yet.</p>
                ) : (
                  <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead className="bg-[linear-gradient(180deg,_#f7f9ff_0%,_#eef3ff_100%)]">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Subject Code
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Subject Name
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Department
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Question Bank
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Moderator&apos;s Paper
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Syllabus
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {subjects.map((subject, index) => (
                          <tr key={index} className="border-t border-slate-200 transition hover:bg-slate-50/80">
                            <td className="px-5 py-5 align-top text-[14px] font-[700] text-[#2f67ff]">
                              <span className="inline-flex rounded-[10px] bg-[#f4f7ff] px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.03)]">
                                {subject.code}
                              </span>
                            </td>
                            <td className="px-5 py-5 align-top text-[14px] font-[500] leading-6 text-slate-700">
                              {subject.name}
                            </td>
                            <td className="px-5 py-5 align-top text-[14px] font-[500] text-slate-700">
                              {subject.department}
                            </td>
                            <td className="px-5 py-5 align-top text-[14px]">
                              {subject.questionPaper ? (
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff6e7] px-3 py-1.5 text-[12px] font-[700] text-[#26935f]">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m5.5 10 3 3 6-6" />
                                    </svg>
                                    Uploaded
                                  </span>
                                  <a 
                                    href={subject.questionPaper.pinataUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[14px] font-[700] text-[#2f67ff] hover:underline"
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
                                  <span className={`${elevatedActionButton} disabled:bg-gray-400`}>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    {uploadingSubjectCode === subject.code ? 'Uploading...' : 'Upload Question Bank'}
                                  </span>
                                </label>
                              )}
                            </td>
                            <td className="px-5 py-5 align-top text-[14px]">
                              {subject.is_mod_questionPaperUploaded && subject.mod_questionPaper ? (
                                <a
                                  href={subject.mod_questionPaper.pinataUrl}
                                  download={subject.mod_questionPaper.fileName}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={elevatedActionButton}
                                  title={`Download ${subject.mod_questionPaper.fileName}`}
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download Paper
                                </a>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-[#eef2f7] px-3 py-1.5 text-[12px] font-[700] text-slate-500">
                                  Not Uploaded
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-5 align-top text-[14px]">
                              {subject.syllabus ? (
                                <div className="flex items-center gap-3">
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dff6e7] px-3 py-1.5 text-[12px] font-[700] text-[#26935f]">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="m5.5 10 3 3 6-6" />
                                    </svg>
                                    Uploaded
                                  </span>
                                  <a 
                                    href={subject.syllabus.pinataUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[14px] font-[700] text-[#2f67ff] hover:underline"
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
                                  <span className={elevatedSecondaryActionButton}>
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              )
            )}

            {activeTab === 'moderators' && (
              isLoading ? (
                <SkeletonModeratorsSection />
              ) : (
              <div>
                <h3 className="text-[18px] font-[700] tracking-[-0.02em] text-slate-900 mb-4">Moderators</h3>
                {moderators.length === 0 ? (
                  <p className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center text-[14px] font-medium text-slate-500">No moderators uploaded yet.</p>
                ) : (
                  <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                    <table className="min-w-full border-separate border-spacing-0">
                      <thead className="bg-[linear-gradient(180deg,_#f7f9ff_0%,_#eef3ff_100%)]">
                        <tr>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Name
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Email
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Phone
                          </th>
                          {/* <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                            Password
                          </th> */}
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Assigned Subjects
                          </th>
                          <th className="px-5 py-4 text-left text-[11px] font-[800] uppercase tracking-[0.18em] text-[#3763d7]">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {moderators.map((moderator, index) => (
                          <tr key={index} className="border-t border-slate-200 transition hover:bg-slate-50/80">
                            <td className="px-5 py-5 whitespace-nowrap text-[14px] font-[700] text-slate-900">
                              {moderator.name}
                            </td>
                            <td className="px-5 py-5 whitespace-nowrap text-[14px] text-slate-700">
                              {moderator.email}
                            </td>
                            <td className="px-5 py-5 whitespace-nowrap text-[14px] text-slate-700">
                              {moderator.phone}
                            </td>
                            
                            <td className="px-5 py-5 text-[14px] text-slate-700">
                              <div className="flex flex-wrap gap-1.5">
                                {moderator.assignedSubjects.map((subject, idx) => (
                                  <span key={idx} className="inline-flex items-center rounded-[8px] bg-[#edf3ff] px-2.5 py-1 text-[12px] font-[700] text-[#2f67ff]">
                                    {subject}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-5 py-5 whitespace-nowrap text-[14px]">
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
                                  className={`${elevatedActionButton} disabled:cursor-not-allowed disabled:bg-slate-300`}
                                >
                                  {sendingInvitationEmail === moderator.email ? 'Sending...' : 'Invite'}
                                </button>
                                <button
                                  onClick={() => handleSendReminder(moderator)}
                                      disabled={disableActions || sendingReminderEmail === moderator.email}
                                      title={disableActions ? disabledReason : undefined}
                                  className="inline-flex items-center justify-center rounded-[12px] bg-[linear-gradient(180deg,_#ffad57_0%,_#ef8a21_100%)] px-4 py-2.5 text-[13px] font-[700] text-white shadow-[0_10px_24px_rgba(255,155,61,0.22)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(255,155,61,0.28)] active:translate-y-0 active:scale-[0.985] disabled:cursor-not-allowed disabled:bg-slate-300"
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
              )
            )}

            {activeTab === 'emailTemplates' && (
              isLoading ? (
                <SkeletonEmailTemplatesSection />
              ) : (
              <div>
                <h3 className="text-[18px] font-[700] tracking-[-0.02em] text-slate-900 mb-4">Email Templates</h3>
                <p className="mb-6 max-w-3xl text-[14px] leading-6 text-slate-500">
                  Customize email body templates for invitations and reminders. Use placeholders like{' '}
                  <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-[700] text-slate-700">{'{{moderatorName}}'}</code>,{' '}
                  <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-[700] text-slate-700">{'{{moderatorEmail}}'}</code>,{' '}
                  <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-[700] text-slate-700">{'{{password}}'}</code>, and{' '}
                  <code className="rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-[700] text-slate-700">{'{{assignedSubjects}}'}</code>.
                </p>
                
                <div className="space-y-6">
                  {/* Invitation Template */}
                  <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h4 className="text-[16px] font-[700] tracking-[-0.01em] text-slate-800">Invitation Email Template</h4>
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'invitation' ? null : 'invitation')}
                        className={elevatedActionButton}
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
                          <label className="mb-2 block text-[13px] font-[700] text-slate-600">Subject</label>
                          <input
                            type="text"
                            value={editorValues.invitationSubject}
                            onChange={(e) => setEditorValues({ ...editorValues, invitationSubject: e.target.value })}
                            className="w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] font-[700] text-slate-600">Email Body</label>
                          <RichTextEditor
                            value={editorValues.invitationBody}
                            onChange={(html) => setEditorValues({ ...editorValues, invitationBody: html })}
                          />
                        </div>
                        <button
                          type="submit"
                          className={elevatedActionButton}
                        >
                          Save Template
                        </button>
                      </form>
                    ) : (
                      <div>
                        <div className="mb-3">
                          <p className="text-[13px] font-[700] text-slate-500">Subject:</p>
                          <p className="mt-1 text-[14px] text-slate-800">
                            {emailTemplates.invitation?.subject || 'Invitation to Admin Panel - Moderator Access'}
                          </p>
                        </div>
                        <div>
                          <p className="mb-2 text-[13px] font-[700] text-slate-500">Body Preview:</p>
                          <div className="max-h-64 overflow-y-auto rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-6 text-slate-700">
                              {emailTemplates.invitation?.body || 'No template saved yet. Click "Edit Template" to create one.'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reminder Template */}
                  <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <h4 className="text-[16px] font-[700] tracking-[-0.01em] text-slate-800">Reminder Email Template</h4>
                      <button
                        onClick={() => setEditingTemplate(editingTemplate === 'reminder' ? null : 'reminder')}
                        className={elevatedActionButton}
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
                          <label className="mb-2 block text-[13px] font-[700] text-slate-600">Subject</label>
                          <input
                            type="text"
                            value={editorValues.reminderSubject}
                            onChange={(e) => setEditorValues({ ...editorValues, reminderSubject: e.target.value })}
                            className="w-full rounded-[12px] border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
                            required
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-[13px] font-[700] text-slate-600">Email Body</label>
                          <RichTextEditor
                            value={editorValues.reminderBody}
                            onChange={(html) => setEditorValues({ ...editorValues, reminderBody: html })}
                          />
                        </div>
                        <button
                          type="submit"
                          className={elevatedActionButton}
                        >
                          Save Template
                        </button>
                      </form>
                    ) : (
                      <div>
                        <div className="mb-3">
                          <p className="text-[13px] font-[700] text-slate-500">Subject:</p>
                          <p className="mt-1 text-[14px] text-slate-800">
                            {emailTemplates.reminder?.subject || 'Reminder: Question Paper Submission Deadline Approaching'}
                          </p>
                        </div>
                        <div>
                          <p className="mb-2 text-[13px] font-[700] text-slate-500">Body Preview:</p>
                          <div className="max-h-64 overflow-y-auto rounded-[14px] border border-slate-200 bg-slate-50 p-4">
                            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-6 text-slate-700">
                              {emailTemplates.reminder?.body || 'No template saved yet. Click "Edit Template" to create one.'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )
            )}

            {activeTab === 'examStructure' && (
              <div>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-[18px] font-[700] tracking-[-0.02em] text-slate-900">Exam Structure Configuration</h3>
                    <p className="mt-1 text-[14px] text-slate-500">
                      Group A: MCQ & Fill in the Blanks only | Groups B+: Short & Long Answer only
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleAddGroup}
                      className={elevatedActionButton}
                    >
                      Add Group
                    </button>
                    <button
                      onClick={handleSaveExamStructure}
                      className={elevatedActionButton}
                    >
                      Save Structure
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {examStructure.groups.map((group, groupIndex) => (
                    <div key={groupIndex} className="rounded-[18px] border border-slate-200 bg-slate-50 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:p-6">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={group.name}
                            onChange={(e) => handleUpdateGroupName(groupIndex, e.target.value)}
                            className="mb-2 rounded-[12px] border border-slate-200 bg-white px-3 py-2 text-[16px] font-[700] text-slate-900 outline-none focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
                          />
                          {groupIndex === 0 && (
                            <p className="text-[12px] font-[700] text-[#2f67ff]">
                              Group A: Can only have MCQ and Fill in the Blanks
                            </p>
                          )}
                          {groupIndex > 0 && (
                            <p className="text-[12px] font-[700] text-slate-500">
                              Groups B+: Can only have Short Answer and Long Answer
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveGroup(groupIndex)}
                          className="inline-flex items-center rounded-[12px] bg-[#2f67ff] px-3 py-2.5 text-[13px] font-[700] text-white shadow-[0_10px_24px_rgba(47,103,255,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#2456de] hover:shadow-[0_16px_32px_rgba(47,103,255,0.3)] active:translate-y-0 active:scale-[0.985]"
                        >
                          Remove Group
                        </button>
                      </div>

                      <div className="mb-4 space-y-3">
                        {group.questionTypes.map((qt, typeIndex) => (
                          <div key={typeIndex} className="flex flex-col gap-3 rounded-[14px] border border-slate-200 bg-white p-4 sm:flex-row sm:items-end">
                            <div className="flex-1">
                              <label className="mb-1 block text-[12px] font-[700] text-slate-500">Question Type</label>
                              <select
                                value={qt.type}
                                onChange={(e) => handleUpdateQuestionType(groupIndex, typeIndex, 'type', e.target.value)}
                                className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
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
                              <label className="mb-1 block text-[12px] font-[700] text-slate-500">Min</label>
                              <input
                                type="number"
                                value={qt.min}
                                onChange={(e) => handleUpdateQuestionType(groupIndex, typeIndex, 'min', e.target.value)}
                                className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
                                min="0"
                              />
                            </div>
                            <div className="w-24">
                              <label className="mb-1 block text-[12px] font-[700] text-slate-500">Max</label>
                              <input
                                type="number"
                                value={qt.max}
                                onChange={(e) => handleUpdateQuestionType(groupIndex, typeIndex, 'max', e.target.value)}
                                className="w-full rounded-[12px] border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-slate-900 outline-none focus:border-[#2f67ff] focus:ring-4 focus:ring-[#2f67ff]/10"
                                min="0"
                              />
                            </div>
                            <button
                              onClick={() => handleRemoveQuestionType(groupIndex, typeIndex)}
                              className="inline-flex items-center rounded-[12px] bg-[#2f67ff] px-3 py-2.5 text-[13px] font-[700] text-white shadow-[0_10px_24px_rgba(47,103,255,0.25)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#2456de] hover:shadow-[0_16px_32px_rgba(47,103,255,0.3)] active:translate-y-0 active:scale-[0.985]"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleAddQuestionType(groupIndex)}
                        className={elevatedActionButton}
                      >
                        Add Question Type
                      </button>
                    </div>
                  ))}
                </div>

                {examStructure.groups.length === 0 && (
                  <div className="py-12 text-center text-[14px] font-medium text-slate-500">
                    <p>No groups configured yet. Click &quot;Add Group&quot; to start.</p>
                  </div>
                )}
              </div>
            )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
