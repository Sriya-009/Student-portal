export const students = [
  {
    id: 'STU001',
    rollNumber: 'STU001',
    name: 'Emma Johnson',
    email: 'emma.johnson@school.edu',
    grade: '10th Grade',
    initials: 'E'
  },
  {
    id: 'STU002',
    rollNumber: 'STU002',
    name: 'Liam Chen',
    email: 'liam.chen@school.edu',
    grade: '11th Grade',
    initials: 'L'
  },
  {
    id: 'STU003',
    rollNumber: 'STU003',
    name: 'Sophia Martinez',
    email: 'sophia.martinez@school.edu',
    grade: '12th Grade',
    initials: 'S'
  },
  {
    id: 'STU004',
    rollNumber: 'STU004',
    name: 'Noah Patel',
    email: 'noah.patel@school.edu',
    grade: '9th Grade',
    initials: 'N'
  }
];

export const bTechProjects = [
  {
    id: 'BTECH-PRJ-001',
    name: 'AI-Based Attendance System',
    description: 'Face recognition attendance system using OpenCV and ML.',
    ownerId: 'STU001',
    projectLeadId: 'STU001',
    mentorId: null,
    teamMemberIds: ['STU001', 'STU002'],
    teamMembers: [
      { id: 'STU001', name: 'Emma Johnson', role: 'Lead Developer' },
      { id: 'STU002', name: 'Liam Chen', role: 'ML Engineer' }
    ],
    status: 'ongoing',
    progressPercent: 65,
    createdDate: '2026-01-15',
    deadline: '2026-05-30',
    technologies: ['Python', 'OpenCV', 'TensorFlow']
  },
  {
    id: 'BTECH-PRJ-002',
    name: 'Smart Home Automation',
    description: 'IoT-based home automation system with mobile app control.',
    ownerId: 'STU002',
    projectLeadId: 'STU002',
    mentorId: null,
    teamMemberIds: ['STU002', 'STU003'],
    teamMembers: [
      { id: 'STU002', name: 'Liam Chen', role: 'Lead Developer' },
      { id: 'STU003', name: 'Sophia Martinez', role: 'Frontend Developer' }
    ],
    status: 'ongoing',
    progressPercent: 45,
    createdDate: '2026-02-01',
    deadline: '2026-06-15',
    technologies: ['IoT', 'Arduino', 'React']
  },
  {
    id: 'BTECH-PRJ-003',
    name: 'E-Learning Platform',
    description: 'Web-based e-learning platform with video streaming and quizzes.',
    ownerId: 'STU003',
    projectLeadId: 'STU003',
    mentorId: null,
    teamMemberIds: ['STU003', 'STU004', 'STU001'],
    teamMembers: [
      { id: 'STU003', name: 'Sophia Martinez', role: 'Project Manager' },
      { id: 'STU004', name: 'Noah Patel', role: 'Backend Developer' },
      { id: 'STU001', name: 'Emma Johnson', role: 'Database Architect' }
    ],
    status: 'ongoing',
    progressPercent: 30,
    createdDate: '2026-02-15',
    deadline: '2026-07-30',
    technologies: ['Node.js', 'React', 'MongoDB']
  },
  {
    id: 'BTECH-PRJ-004',
    name: 'Weather Prediction App',
    description: 'Machine learning model for weather forecasting with mobile app.',
    ownerId: 'STU004',
    projectLeadId: 'STU004',
    mentorId: null,
    teamMemberIds: ['STU004'],
    teamMembers: [
      { id: 'STU004', name: 'Noah Patel', role: 'Solo Developer' }
    ],
    status: 'ongoing',
    progressPercent: 20,
    createdDate: '2026-03-01',
    deadline: '2026-08-15',
    technologies: ['Python', 'Scikit-learn', 'Flutter']
  }
];

export const projectChats = [
  {
    id: 'CHAT-PRJ-001-MSG-001',
    projectId: 'BTECH-PRJ-001',
    senderId: 'STU001',
    senderName: 'Emma Johnson',
    message: 'Dataset preprocessed. Ready for training phase.',
    timestamp: '2026-03-19T10:30:00Z'
  },
  {
    id: 'CHAT-PRJ-001-MSG-002',
    projectId: 'BTECH-PRJ-001',
    senderId: 'STU002',
    senderName: 'Liam Chen',
    message: 'Great! I am setting up the model architecture.',
    timestamp: '2026-03-19T10:35:00Z'
  },
  {
    id: 'CHAT-PRJ-002-MSG-001',
    projectId: 'BTECH-PRJ-002',
    senderId: 'STU002',
    senderName: 'Liam Chen',
    message: 'Mobile app UI screens completed',
    timestamp: '2026-03-18T15:20:00Z'
  }
];

export const projectTasks = [
  {
    id: 'TSK-001',
    projectId: 'BTECH-PRJ-001',
    title: 'Dataset Collection & Preprocessing',
    description: 'Collect facial images and preprocess them for model training',
    assignedToId: 'STU001',
    assignedToName: 'Emma Johnson',
    createdByLeadId: 'STU001',
    deadline: '2026-04-15',
    status: 'in_progress',
    contributionPercent: 40,
    createdDate: '2026-03-15'
  },
  {
    id: 'TSK-002',
    projectId: 'BTECH-PRJ-001',
    title: 'Model Training & Optimization',
    description: 'Train ML model using TensorFlow and optimize accuracy',
    assignedToId: 'STU002',
    assignedToName: 'Liam Chen',
    createdByLeadId: 'STU001',
    deadline: '2026-04-30',
    status: 'pending',
    contributionPercent: 0,
    createdDate: '2026-03-15'
  },
  {
    id: 'TSK-003',
    projectId: 'BTECH-PRJ-001',
    title: 'API Integration',
    description: 'Create REST API for attendance marking',
    assignedToId: 'STU001',
    assignedToName: 'Emma Johnson',
    createdByLeadId: 'STU001',
    deadline: '2026-05-15',
    status: 'pending',
    contributionPercent: 0,
    createdDate: '2026-03-18'
  },
  {
    id: 'TSK-004',
    projectId: 'BTECH-PRJ-002',
    title: 'Hardware Setup & Configuration',
    description: 'Set up Arduino and IoT devices for home automation',
    assignedToId: 'STU002',
    assignedToName: 'Liam Chen',
    createdByLeadId: 'STU002',
    deadline: '2026-04-20',
    status: 'in_progress',
    contributionPercent: 30,
    createdDate: '2026-03-10'
  },
  {
    id: 'TSK-005',
    projectId: 'BTECH-PRJ-002',
    title: 'Mobile App UI/UX Design',
    description: 'Design user-friendly interface for mobile control app',
    assignedToId: 'STU003',
    assignedToName: 'Sophia Martinez',
    createdByLeadId: 'STU002',
    deadline: '2026-04-25',
    status: 'in_progress',
    contributionPercent: 50,
    createdDate: '2026-03-10'
  }
];

export const achievements = [];

export const studentCredentials = [
  { rollNumber: 'STU001', password: 'student123' },
  { rollNumber: 'STU002', password: 'student123' },
  { rollNumber: 'STU003', password: 'student123' },
  { rollNumber: 'STU004', password: 'student123' }
];

export const submissionEvents = [
  {
    id: 'SUB-001',
    title: 'ALM-6 on CO-3 is due',
    date: '2026-03-06',
    course: 'All courses',
    type: 'deadline'
  },
  {
    id: 'SUB-002',
    title: 'Quiz 1 opens',
    date: '2026-03-07',
    course: 'CO3',
    type: 'quiz'
  },
  {
    id: 'SUB-003',
    title: 'Quiz 2 opens',
    date: '2026-03-07',
    course: 'CO3',
    type: 'quiz'
  },
  {
    id: 'SUB-004',
    title: 'Skill in Sem Exam - Round 1',
    date: '2026-03-12',
    course: 'Skill Lab',
    type: 'exam'
  },
  {
    id: 'SUB-005',
    title: 'Home Assignment Submission',
    date: '2026-03-14',
    course: 'Dynamic Programming',
    type: 'assignment'
  },
  {
    id: 'SUB-006',
    title: 'ALMs is due',
    date: '2026-03-15',
    course: 'All courses',
    type: 'deadline'
  },
  {
    id: 'SUB-007',
    title: 'Quiz 1 closes',
    date: '2026-03-15',
    course: 'CO3',
    type: 'quiz'
  },
  {
    id: 'SUB-008',
    title: 'CO3 Quiz closes',
    date: '2026-03-15',
    course: 'CO3',
    type: 'quiz'
  },
  {
    id: 'SUB-009',
    title: 'Skill Experiment 0 submission',
    date: '2026-03-22',
    course: 'Skill Lab',
    type: 'assignment'
  },
  {
    id: 'SUB-010',
    title: 'Skill Experiment 1 submission',
    date: '2026-03-22',
    course: 'Skill Lab',
    type: 'assignment'
  },
  {
    id: 'SUB-011',
    title: 'CO3 Home Assignment',
    date: '2026-03-25',
    course: 'CO3',
    type: 'assignment'
  },
  {
    id: 'SUB-012',
    title: 'ALMs is due',
    date: '2026-03-29',
    course: 'All courses',
    type: 'deadline'
  },
  {
    id: 'SUB-013',
    title: 'Home Assignment upload',
    date: '2026-03-30',
    course: 'All courses',
    type: 'assignment'
  },
  {
    id: 'SUB-014',
    title: 'Dynamic Programming HA-3 due',
    date: '2026-03-31',
    course: 'Dynamic Programming',
    type: 'assignment'
  }
];
