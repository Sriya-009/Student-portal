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

export const achievements = [
  {
    id: 'ACH-001',
    studentRoll: 'STU001',
    title: 'First Place - State Science Fair',
    description: 'Won first place in the State Science Fair with a project on renewable energy solutions.',
    category: 'Academic Competition',
    level: 'State',
    date: '2025-11-15',
    position: '1st Place',
    type: 'achievement',
    participationHours: 20
  },
  {
    id: 'ACH-002',
    studentRoll: 'STU001',
    title: 'Best Painter Award',
    description: 'Received Best Painter Award at the Annual Art Exhibition.',
    category: 'Arts',
    level: 'School',
    date: '2025-09-20',
    position: 'Winner',
    type: 'achievement',
    participationHours: 10
  },
  {
    id: 'ACH-003',
    studentRoll: 'STU002',
    title: 'National Basketball Championship',
    description: 'Team Captain - Led school basketball team to national finals victory.',
    category: 'Sports',
    level: 'National',
    date: '2025-12-10',
    position: 'Champion',
    type: 'activity',
    participationHours: 280
  },
  {
    id: 'ACH-004',
    studentRoll: 'STU002',
    title: 'Student Council President',
    description: 'Elected as Student Council President for the academic year.',
    category: 'Leadership',
    level: 'School',
    date: '2025-08-01',
    position: '-',
    type: 'activity',
    participationHours: 180
  },
  {
    id: 'ACH-005',
    studentRoll: 'STU003',
    title: 'International Music Competition',
    description: 'Silver medalist in Piano Performance at International Youth Music Fest.',
    category: 'Music',
    level: 'International',
    date: '2025-10-05',
    position: '2nd Place',
    type: 'achievement',
    participationHours: 210
  },
  {
    id: 'ACH-006',
    studentRoll: 'STU003',
    title: 'Community Service Award',
    description: 'Recognized for 200+ hours of community service and mentoring.',
    category: 'Community Service',
    level: 'District',
    date: '2025-12-20',
    position: '-',
    type: 'activity',
    participationHours: 200
  },
  {
    id: 'ACH-007',
    studentRoll: 'STU004',
    title: 'Drama Club - Best Actor',
    description: 'Best Actor award for leading role in school production.',
    category: 'Drama',
    level: 'School',
    date: '2026-01-15',
    position: 'Winner',
    type: 'achievement',
    participationHours: 105
  }
];

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
