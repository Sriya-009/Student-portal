export const students = [
  {
    id: 'STU001',
    rollNumber: 'STU001',
    registrationNo: 'REG-CS-2022-001',
    name: 'Emma Johnson',
    email: 'emma.johnson@school.edu',
    department: 'Computer Science',
    grade: '10th Grade',
    semester: '6',
    section: 'A',
    batchYear: '2022',
    dateOfBirth: '2004-08-11',
    guardianName: 'Michael Johnson',
    guardianPhone: '+1-555-1101',
    address: '221B Lakeview Avenue, Austin, TX',
    isActive: true,
    updatedAt: '2026-03-19',
    initials: 'E',
    phoneNumber: '+1-555-0101'
  },
  {
    id: 'STU002',
    rollNumber: 'STU002',
    registrationNo: 'REG-EC-2022-014',
    name: 'Liam Chen',
    email: 'liam.chen@school.edu',
    department: 'Electronics',
    grade: '11th Grade',
    semester: '6',
    section: 'B',
    batchYear: '2022',
    dateOfBirth: '2004-02-19',
    guardianName: 'Angela Chen',
    guardianPhone: '+1-555-1102',
    address: '45 River Street, San Jose, CA',
    isActive: true,
    updatedAt: '2026-03-18',
    initials: 'L',
    phoneNumber: '+1-555-0102'
  },
  {
    id: 'STU003',
    rollNumber: 'STU003',
    registrationNo: 'REG-CS-2022-029',
    name: 'Sophia Martinez',
    email: 'sophia.martinez@school.edu',
    department: 'Computer Science',
    grade: '12th Grade',
    semester: '8',
    section: 'A',
    batchYear: '2022',
    dateOfBirth: '2003-11-05',
    guardianName: 'Carlos Martinez',
    guardianPhone: '+1-555-1103',
    address: '809 Elm Road, Denver, CO',
    isActive: true,
    updatedAt: '2026-03-17',
    initials: 'S',
    phoneNumber: '+1-555-0103'
  },
  {
    id: 'STU004',
    rollNumber: 'STU004',
    registrationNo: 'REG-IT-2022-042',
    name: 'Noah Patel',
    email: 'noah.patel@school.edu',
    department: 'Information Technology',
    grade: '9th Grade',
    semester: '4',
    section: 'C',
    batchYear: '2023',
    dateOfBirth: '2005-03-27',
    guardianName: 'Rita Patel',
    guardianPhone: '+1-555-1104',
    address: '17 Pine Court, Dallas, TX',
    isActive: true,
    updatedAt: '2026-03-16',
    initials: 'N',
    phoneNumber: '+1-555-0104'
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

export const projectFiles = [
  {
    id: 'FILE-001',
    projectId: 'BTECH-PRJ-001',
    fileName: 'Dataset_Preprocessing.zip',
    fileSize: 2048576,
    fileType: 'archive',
    mimeType: 'application/zip',
    uploadedBy: 'STU001',
    uploadedByName: 'Emma Johnson',
    uploadedDate: '2026-03-15',
    version: 1,
    description: 'Cleaned facial dataset with 5000 images',
    downloadCount: 2,
    isSubmitted: false
  },
  {
    id: 'FILE-002',
    projectId: 'BTECH-PRJ-001',
    fileName: 'Model_Training_Report.pdf',
    fileSize: 1024000,
    fileType: 'document',
    mimeType: 'application/pdf',
    uploadedBy: 'STU001',
    uploadedByName: 'Emma Johnson',
    uploadedDate: '2026-03-18',
    version: 2,
    description: 'Initial training results and accuracy metrics',
    downloadCount: 1,
    isSubmitted: false
  },
  {
    id: 'FILE-003',
    projectId: 'BTECH-PRJ-001',
    fileName: 'Attendance_System_Code.zip',
    fileSize: 512000,
    fileType: 'code',
    mimeType: 'application/zip',
    uploadedBy: 'STU002',
    uploadedByName: 'Liam Chen',
    uploadedDate: '2026-03-19',
    version: 1,
    description: 'Source code with OpenCV integration',
    downloadCount: 0,
    isSubmitted: false
  },
  {
    id: 'FILE-004',
    projectId: 'BTECH-PRJ-002',
    fileName: 'IoT_Architecture_Diagram.pptx',
    fileSize: 3145728,
    fileType: 'presentation',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    uploadedBy: 'STU002',
    uploadedByName: 'Liam Chen',
    uploadedDate: '2026-03-14',
    version: 1,
    description: 'System architecture and component overview',
    downloadCount: 1,
    isSubmitted: false
  },
  {
    id: 'FILE-005',
    projectId: 'BTECH-PRJ-002',
    fileName: 'Arduino_Code_v1.zip',
    fileSize: 256000,
    fileType: 'code',
    mimeType: 'application/zip',
    uploadedBy: 'STU002',
    uploadedByName: 'Liam Chen',
    uploadedDate: '2026-03-17',
    version: 1,
    description: 'Arduino firmware for IoT devices',
    downloadCount: 2,
    isSubmitted: false
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
    id: 'NOTIF-001',
    title: 'CO3 Assignment - Part A',
    description: 'Submit the CO3 assignment part A',
    dueDate: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    course: 'CO3',
    type: 'assignment'
  },
  {
    id: 'NOTIF-002',
    title: 'Database Project Submission',
    description: 'Final submission for database project',
    dueDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    course: 'Database Systems',
    type: 'deadline'
  },
  {
    id: 'NOTIF-003',
    title: 'Skill Lab Experiment Report',
    description: 'Submit experiment report',
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    course: 'Skill Lab',
    type: 'submission'
  }
];

// Faculty Data
export const mentors = [
  {
    id: 'MENTOR-001',
    identifier: 'FAC001',
    employeeId: 'FAC-CSE-001',
    name: 'Dr. Amelia Foster',
    email: 'amelia.foster@institute.edu',
    department: 'Computer Science',
    initials: 'AF',
    phoneNumber: '+1-555-0201',
    specialization: 'Machine Learning',
    designation: 'Associate Professor',
    qualification: 'PhD in Computer Science',
    officeLocation: 'CSE Block, Room 302',
    officeHours: 'Mon-Wed 10:00-12:00',
    joiningDate: '2020-07-12',
    bio: 'Researcher in computer vision and explainable AI.',
    isActive: true,
    updatedAt: '2026-03-19',
    assignedProjects: ['BTECH-PRJ-001', 'BTECH-PRJ-002'],
    assignedStudents: ['STU001', 'STU002']
  },
  {
    id: 'MENTOR-002',
    identifier: 'FAC002',
    employeeId: 'FAC-CSE-002',
    name: 'Prof. James Mitchell',
    email: 'james.mitchell@institute.edu',
    department: 'Computer Science',
    initials: 'JM',
    phoneNumber: '+1-555-0202',
    specialization: 'Web Development',
    designation: 'Professor',
    qualification: 'PhD in Software Engineering',
    officeLocation: 'CSE Block, Room 211',
    officeHours: 'Tue-Thu 14:00-16:00',
    joiningDate: '2018-01-08',
    bio: 'Focuses on scalable web systems and cloud-native architectures.',
    isActive: true,
    updatedAt: '2026-03-17',
    assignedProjects: ['BTECH-PRJ-003'],
    assignedStudents: ['STU003', 'STU004']
  },
  {
    id: 'MENTOR-003',
    identifier: 'FAC003',
    employeeId: 'FAC-ECE-001',
    name: 'Dr. Rachel Chen',
    email: 'rachel.chen@institute.edu',
    department: 'Electronics',
    initials: 'RC',
    phoneNumber: '+1-555-0203',
    specialization: 'IoT & Embedded Systems',
    designation: 'Assistant Professor',
    qualification: 'PhD in Embedded Systems',
    officeLocation: 'ECE Block, Room 118',
    officeHours: 'Mon-Fri 09:00-10:00',
    joiningDate: '2021-06-20',
    bio: 'Builds intelligent embedded platforms for real-world automation.',
    isActive: true,
    updatedAt: '2026-03-20',
    assignedProjects: ['BTECH-PRJ-004'],
    assignedStudents: ['STU002']
  }
];

export const admins = [
  {
    id: 'ADM001',
    identifier: 'ADM001',
    employeeId: 'ADMIN-001',
    name: 'System Administrator',
    email: 'admin@institute.edu',
    role: 'admin',
    department: 'Administration',
    phoneNumber: '+1-555-0301',
    accessLevel: 'Super Admin',
    permissions: ['users.manage', 'system.monitor', 'reports.view', 'security.audit'],
    emergencyContact: '+1-555-9999',
    twoFactorEnabled: true,
    isActive: true,
    createdAt: '2025-11-05',
    updatedAt: '2026-03-20',
    initials: 'SA'
  }
];

export const projectProposals = [
  {
    id: 'PROPOSAL-001',
    projectId: 'BTECH-PRJ-001',
    studentId: 'STU001',
    title: 'AI-Based Attendance System',
    description: 'Face recognition attendance system using OpenCV and ML.',
    suggestedBy: 'STU001',
    status: 'approved',
    submittedDate: '2026-01-15',
    approvedDate: '2026-01-20',
    feedbackFromFaculty: 'Excellent proposal. Good scope and feasibility.',
    assignedMentor: 'MENTOR-001'
  },
  {
    id: 'PROPOSAL-002',
    projectId: 'BTECH-PRJ-002',
    studentId: 'STU002',
    title: 'Smart Home Automation',
    description: 'IoT-based home automation system with mobile app control.',
    suggestedBy: 'STU002',
    status: 'approved',
    submittedDate: '2026-02-01',
    approvedDate: '2026-02-05',
    feedbackFromFaculty: 'Good project. Consider database optimization.',
    assignedMentor: 'MENTOR-001'
  },
  {
    id: 'PROPOSAL-003',
    projectId: null,
    studentId: 'STU004',
    title: 'Blockchain-Based Supply Chain',
    description: 'Using blockchain for transparent supply chain management.',
    suggestedBy: 'STU004',
    status: 'pending',
    submittedDate: '2026-03-15',
    approvedDate: null,
    feedbackFromFaculty: null,
    assignedMentor: null
  }
];

export const projectGrades = [
  {
    id: 'GRADE-001',
    projectId: 'BTECH-PRJ-001',
    studentId: 'STU001',
    proposalMark: 18,
    progressMark: 0,
    implementationMark: 0,
    finalSubmissionMark: 0,
    totalMark: 18,
    maxMark: 100,
    status: 'in-progress',
    evaluatedBy: 'MENTOR-001',
    evaluationDate: '2026-03-15',
    comments: 'Good progress so far. Keep up the momentum.'
  },
  {
    id: 'GRADE-002',
    projectId: 'BTECH-PRJ-002',
    studentId: 'STU002',
    proposalMark: 19,
    progressMark: 16,
    implementationMark: 0,
    finalSubmissionMark: 0,
    totalMark: 35,
    maxMark: 100,
    status: 'in-progress',
    evaluatedBy: 'MENTOR-001',
    evaluationDate: '2026-03-15',
    comments: 'Strong implementation so far.'
  },
  {
    id: 'GRADE-003',
    projectId: 'BTECH-PRJ-003',
    studentId: 'STU003',
    proposalMark: 17,
    progressMark: 15,
    implementationMark: 0,
    finalSubmissionMark: 0,
    totalMark: 32,
    maxMark: 100,
    status: 'in-progress',
    evaluatedBy: 'MENTOR-002',
    evaluationDate: '2026-03-15',
    comments: 'Excellent teamwork demonstrated.'
  }
];

export const facultyCredentials = [
  { facultyId: 'MENTOR-001', password: 'faculty123' },
  { facultyId: 'MENTOR-002', password: 'faculty123' },
  { facultyId: 'MENTOR-003', password: 'faculty123' }
];

export const profileUpdateRequests = [
  {
    id: 'UPD-001',
    userId: 'STU001',
    userType: 'student',
    currentData: { name: 'Emma Johnson', email: 'emma.johnson@school.edu', phoneNumber: '+1-555-0101' },
    proposedData: { name: 'Emma Johnson', email: 'emma.j@school.edu', phoneNumber: '+1-555-0105' },
    status: 'pending',
    reason: 'Updated email and phone number',
    requestedDate: '2026-03-18',
    reviewedDate: null,
    reviewedBy: null,
    adminComment: ''
  }
];
