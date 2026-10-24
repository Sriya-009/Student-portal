const unsupportedAnswer = 'Sorry, I can only answer questions about the available Student Portal topics. Please choose one of the suggested questions.';

const topics = [
  {
    question: 'How can I view feedback?',
    answer: 'Open the project workspace on your dashboard and choose the feedback or corrections option for the selected project.',
    keywords: ['feedback', 'comments', 'mentor feedback']
  },
  {
    question: 'How do I check project updates?',
    answer: 'Open your dashboard to review projects and use the project workspace to view tasks, files, progress, and submission status.',
    keywords: ['project update', 'project updates', 'project progress', 'project status']
  },
  {
    answer: 'Open your dashboard, select the project, and choose the file-handling or files option in the project workspace to view uploaded project files.',
    keywords: ['project file', 'project files', 'access files', 'view files', 'uploaded files', 'file handling']
  },
  {
    answer: 'Open the relevant project in your dashboard and use its submission option. If the submission step or deadline is unclear, contact your faculty before submitting.',
    keywords: ['submit my files', 'submit files', 'submit project work', 'submit project', 'final project', 'submission']
  },
  {
    question: 'How can I view assignments?',
    answer: 'Students can view project tasks and assignments from the project workspace. Faculty can create and manage assignments from Assign Tasks.',
    keywords: ['assignment', 'assignments', 'view assignment', 'access assignment', 'task', 'tasks']
  },
  {
    question: 'How do I check my attendance?',
    answer: 'Attendance tracking is not currently available as a Student Portal page or API feature. Please contact your faculty for attendance information.',
    keywords: ['attendance', 'absent', 'presence']
  },
  {
    question: 'How can I view my grades?',
    answer: 'Students can check project grades from the feedback and grades option in the project workspace. Faculty manage grading from Feedback & Evaluation.',
    keywords: ['grade', 'grades', 'marks', 'score']
  },
  {
    question: 'How do I update my profile?',
    answer: 'Use your role-specific Profile page to edit profile details and manage a profile photo. Students use Student Profile, faculty use Faculty Profile, and admins use Admin Profile.',
    keywords: ['profile', 'update profile', 'edit profile', 'photo', 'personal details']
  },
  {
    question: 'How do I logout?',
    answer: 'Click the Logout button on the right side of the top navigation bar, next to your profile and role.',
    keywords: ['logout', 'log out', 'sign out', 'logout button', 'signout']
  },
  {
    question: 'How can I contact faculty?',
    answer: 'Use the portal communication or faculty coordination features to contact faculty. The portal does not let the assistant send messages for you.',
    keywords: ['contact faculty', 'message faculty', 'faculty', 'mentor', 'teacher']
  },
  {
    question: 'What should I do if I cannot log in?',
    answer: 'Check your identifier and password, then try the Login page again. If needed, use the password-reset option. Contact an administrator if your account is inactive or delivery services are unavailable.',
    keywords: ['cannot log in', 'cant log in', 'can not log in', 'unable to log in', 'login', 'log in', 'password']
  }
];

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function getPredefinedChatAnswer(message) {
  const normalized = normalizeText(message);
  if (!normalized) {
    return unsupportedAnswer;
  }

  const topic = topics.find(({ keywords }) => keywords.some((keyword) => normalized.includes(normalizeText(keyword))));
  return topic ? topic.answer : unsupportedAnswer;
}

export { topics, unsupportedAnswer };
