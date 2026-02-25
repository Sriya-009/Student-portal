import './App.css';
import { useMemo, useState } from 'react';

const initialUsers = [
  {
    id: 1,
    name: 'Admin One',
    loginId: 'ADM001',
    password: 'admin123',
    role: 'teacher'
  },
  {
    id: 2,
    name: 'Admin Two',
    loginId: 'ADM002',
    password: 'admin123',
    role: 'teacher'
  },
  {
    id: 3,
    name: 'Emma Johnson',
    loginId: 'STU001',
    password: 'student123',
    role: 'student'
  },
  {
    id: 4,
    name: 'Liam Chen',
    loginId: 'STU002',
    password: 'student123',
    role: 'student'
  },
  {
    id: 5,
    name: 'Sophia Martinez',
    loginId: 'STU003',
    password: 'student123',
    role: 'student'
  },
  {
    id: 6,
    name: 'Noah Patel',
    loginId: 'STU004',
    password: 'student123',
    role: 'student'
  }
];


const initialStudentRecords = {
  STU001: {
    grade: '10th Grade',
    achievements: [
      {
        id: 1,
        title: 'First Place - State Science Fair',
        description:
          'Won first place in the State Science Fair with a project on renewable energy solutions.',
        date: '2025-11-15',
        level: 'State',
        category: 'Academic Competition',
        result: '1st Place'
      },
      {
        id: 2,
        title: 'Best Painter Award',
        description: 'Received Best Painter Award at the Annual Art Exhibition.',
        date: '2025-09-21',
        level: 'School',
        category: 'Arts',
        result: 'Winner'
      }
    ],
    participations: [
      {
        id: 1,
        title: 'Community Clean-up Drive',
        description: 'Participated in monthly local clean-up and awareness program.',
        date: '2025-12-04',
        category: 'Community Service',
        hours: 45,
        status: 'Active'
      }
    ]
  },
  STU002: {
    grade: '11th Grade',
    achievements: [
      {
        id: 1,
        title: 'National Basketball Championship',
        description: 'Team Captain - Led school basketball team to national finals victory.',
        date: '2025-12-10',
        level: 'National',
        category: 'Sports',
        result: 'Champion'
      },
      {
        id: 2,
        title: 'Student Council President',
        description: 'Elected as Student Council President for the academic year.',
        date: '2025-08-01',
        level: 'School',
        category: 'Leadership',
        result: '-'
      }
    ],
    participations: [
      {
        id: 1,
        title: 'Robotics Club Mentor',
        description: 'Helped juniors with weekly robotics prototyping sessions.',
        date: '2025-08-01',
        category: 'STEM Club',
        hours: 26,
        status: 'Active'
      }
    ]
  },
  STU003: {
    grade: '12th Grade',
    achievements: [
      {
        id: 1,
        title: 'International Music Competition',
        description: 'Silver medalist in Piano Performance at International Youth Competition.',
        date: '2025-10-05',
        level: 'International',
        category: 'Music',
        result: '2nd Place'
      },
      {
        id: 2,
        title: 'Community Service Award',
        description: 'Recognized for 200+ hours of community service work.',
        date: '2025-12-20',
        level: 'District',
        category: 'Community Service',
        result: '-'
      }
    ],
    participations: [
      {
        id: 1,
        title: 'Music Club Mentor',
        description: 'Mentored junior students in vocal and keyboard basics.',
        date: '2025-09-01',
        category: 'Music Club',
        hours: 520,
        status: 'Completed'
      }
    ]
  },
  STU004: {
    grade: '9th Grade',
    achievements: [
      {
        id: 1,
        title: 'Drama Club - Best Actor',
        description: 'Best Actor award for leading role in school production.',
        date: '2026-01-15',
        level: 'School',
        category: 'Drama',
        result: 'Winner'
      }
    ],
    participations: [
      {
        id: 1,
        title: 'Sports Volunteer Program',
        description: 'Helped organize inter-house sports events and logistics.',
        date: '2025-11-01',
        category: 'Sports',
        hours: 414,
        status: 'Active'
      }
    ]
  }
};

const defaultAchievementForm = {
  title: '',
  description: '',
  date: '',
  level: '',
  category: '',
  result: ''
};

const defaultParticipationForm = {
  title: '',
  description: '',
  date: '',
  category: '',
  hours: '',
  status: 'Active'
};

function formatMonthYear(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function App() {
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({
    name: '',
    loginId: '',
    password: '',
    role: 'student'
  });

  const role = currentUser?.role || 'student';
  const [studentRecords, setStudentRecords] = useState(initialStudentRecords);
  const [studentSection, setStudentSection] = useState('achievements');
  const [studentTab, setStudentTab] = useState('achievements');
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [achievementForm, setAchievementForm] = useState(defaultAchievementForm);
  const [participationForm, setParticipationForm] = useState(defaultParticipationForm);
  const [adminSection, setAdminSection] = useState('achievements');
  const [achievementSearch, setAchievementSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [showAdminAchievementForm, setShowAdminAchievementForm] = useState(false);
  const [showAdminStudentForm, setShowAdminStudentForm] = useState(false);
  const [editingAdminAchievement, setEditingAdminAchievement] = useState(null);
  const [editingAdminStudent, setEditingAdminStudent] = useState(null);
  const [reportStudentFilter, setReportStudentFilter] = useState('all');
  const [adminFormError, setAdminFormError] = useState('');
  const [adminAchievementForm, setAdminAchievementForm] = useState({
    studentId: 'STU001',
    title: '',
    description: '',
    category: '',
    level: '',
    date: '',
    result: ''
  });
  const [adminStudentForm, setAdminStudentForm] = useState({
    loginId: '',
    name: '',
    grade: '9th Grade'
  });

  const currentStudentData = useMemo(() => {
    if (!currentUser || role !== 'student') {
      return null;
    }

    return (
      studentRecords[currentUser.loginId] || {
        grade: 'Unassigned Grade',
        achievements: [],
        participations: []
      }
    );
  }, [currentUser, role, studentRecords]);

  const studentAchievements = currentStudentData?.achievements || [];
  const studentParticipations = currentStudentData?.participations || [];
  const activeParticipations = studentParticipations.filter(
    (entry) => entry.status.toLowerCase() === 'active'
  ).length;
  const totalHoursContributed = studentParticipations.reduce(
    (sum, entry) => sum + (Number(entry.hours) || 0),
    0
  );
  const studentEmail = `${currentUser?.name
    ?.toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '.')}@school.edu`;
  const areasOfExcellence = Object.entries(
    studentAchievements.reduce((accumulator, achievement) => {
      const category = achievement.category || 'General';
      return {
        ...accumulator,
        [category]: (accumulator[category] || 0) + 1
      };
    }, {})
  );
  const timelineAchievements = [...studentAchievements].sort(
    (first, second) => new Date(second.date) - new Date(first.date)
  );
  const prestigiousCount = studentAchievements.filter((achievement) =>
    ['national', 'international'].includes((achievement.level || '').toLowerCase())
  ).length;

  const studentUsers = users.filter((user) => user.role === 'student');
  const adminStudents = studentUsers.map((student) => {
    const record = studentRecords[student.loginId] || {
      grade: 'Unassigned Grade',
      achievements: [],
      participations: []
    };

    return {
      ...student,
      grade: record.grade,
      email: `${student.name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .trim()
        .replace(/\s+/g, '.')}@school.edu`,
      achievementCount: record.achievements.length,
      participations: record.participations
    };
  });

  const allAdminAchievements = adminStudents.flatMap((student) => {
    const record = studentRecords[student.loginId] || { achievements: [] };
    return record.achievements.map((achievement) => ({
      ...achievement,
      studentId: student.loginId,
      studentName: student.name
    }));
  });

  const filteredAdminAchievements = allAdminAchievements.filter((achievement) => {
    const query = achievementSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [
      achievement.studentName,
      achievement.studentId,
      achievement.title,
      achievement.category,
      achievement.level,
      achievement.result
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const filteredAdminStudents = adminStudents.filter((student) => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }

    return [student.loginId, student.name, student.email, student.grade]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const reportStudents = reportStudentFilter === 'all'
    ? adminStudents
    : adminStudents.filter((student) => student.loginId === reportStudentFilter);

  const reportAchievements = reportStudents.flatMap((student) => {
    const record = studentRecords[student.loginId] || { achievements: [] };
    return record.achievements;
  });

  const reportParticipations = reportStudents.flatMap((student) => {
    const record = studentRecords[student.loginId] || { participations: [] };
    return record.participations;
  });

  const reportActiveParticipations = reportParticipations.filter(
    (item) => item.status.toLowerCase() === 'active'
  ).length;
  const reportHours = reportParticipations.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  const reportCategoryCounts = reportAchievements.reduce((accumulator, item) => {
    const category = item.category || 'General';
    return {
      ...accumulator,
      [category]: (accumulator[category] || 0) + 1
    };
  }, {});
  const reportLevelCounts = reportAchievements.reduce((accumulator, item) => {
    const level = item.level || 'School';
    return {
      ...accumulator,
      [level]: (accumulator[level] || 0) + 1
    };
  }, {});

  const upsertStudentRecord = (updater) => {
    if (!currentUser || role !== 'student') {
      return;
    }

    setStudentRecords((prevRecords) => {
      const existingRecord =
        prevRecords[currentUser.loginId] ||
        {
          grade: 'Unassigned Grade',
          achievements: [],
          participations: []
        };

      return {
        ...prevRecords,
        [currentUser.loginId]: updater(existingRecord)
      };
    });
  };

  const openStudentCreate = (type) => {
    setStudentTab(type);
    setEditingEntry(null);
    setShowStudentForm(true);

    if (type === 'achievements') {
      setAchievementForm(defaultAchievementForm);
    } else {
      setParticipationForm(defaultParticipationForm);
    }
  };

  const openStudentEdit = (type, entry) => {
    setStudentTab(type);
    setEditingEntry({ type, id: entry.id });
    setShowStudentForm(true);

    if (type === 'achievements') {
      setAchievementForm({
        title: entry.title,
        description: entry.description,
        date: entry.date,
        level: entry.level,
        category: entry.category,
        result: entry.result
      });
    } else {
      setParticipationForm({
        title: entry.title,
        description: entry.description,
        date: entry.date,
        category: entry.category,
        hours: String(entry.hours),
        status: entry.status
      });
    }
  };

  const saveAchievement = (event) => {
    event.preventDefault();
    if (!achievementForm.title.trim() || !achievementForm.date) {
      return;
    }

    upsertStudentRecord((record) => {
      const cleanEntry = {
        id: editingEntry?.type === 'achievements' ? editingEntry.id : Date.now(),
        title: achievementForm.title.trim(),
        description: achievementForm.description.trim(),
        date: achievementForm.date,
        level: achievementForm.level.trim() || 'School',
        category: achievementForm.category.trim() || 'General',
        result: achievementForm.result.trim() || 'Completed'
      };

      const nextAchievements =
        editingEntry?.type === 'achievements'
          ? record.achievements.map((entry) => (entry.id === editingEntry.id ? cleanEntry : entry))
          : [cleanEntry, ...record.achievements];

      return {
        ...record,
        achievements: nextAchievements
      };
    });

    setShowStudentForm(false);
    setEditingEntry(null);
    setAchievementForm(defaultAchievementForm);
  };

  const saveParticipation = (event) => {
    event.preventDefault();
    if (!participationForm.title.trim() || !participationForm.date) {
      return;
    }

    upsertStudentRecord((record) => {
      const cleanEntry = {
        id: editingEntry?.type === 'participations' ? editingEntry.id : Date.now(),
        title: participationForm.title.trim(),
        description: participationForm.description.trim(),
        date: participationForm.date,
        category: participationForm.category.trim() || 'General',
        hours: Number(participationForm.hours) || 0,
        status: participationForm.status
      };

      const nextParticipations =
        editingEntry?.type === 'participations'
          ? record.participations.map((entry) => (entry.id === editingEntry.id ? cleanEntry : entry))
          : [cleanEntry, ...record.participations];

      return {
        ...record,
        participations: nextParticipations
      };
    });

    setShowStudentForm(false);
    setEditingEntry(null);
    setParticipationForm(defaultParticipationForm);
  };

  const deleteStudentEntry = (type, id) => {
    upsertStudentRecord((record) => {
      if (type === 'achievements') {
        return {
          ...record,
          achievements: record.achievements.filter((entry) => entry.id !== id)
        };
      }

      return {
        ...record,
        participations: record.participations.filter((entry) => entry.id !== id)
      };
    });
  };

  const closeStudentForm = () => {
    setShowStudentForm(false);
    setEditingEntry(null);
    setAchievementForm(defaultAchievementForm);
    setParticipationForm(defaultParticipationForm);
  };

  const resetAdminAchievementForm = () => {
    setAdminAchievementForm({
      studentId: studentUsers[0]?.loginId || 'STU001',
      title: '',
      description: '',
      category: '',
      level: '',
      date: '',
      result: ''
    });
    setEditingAdminAchievement(null);
    setAdminFormError('');
  };

  const resetAdminStudentForm = () => {
    setAdminStudentForm({
      loginId: '',
      name: '',
      grade: '9th Grade'
    });
    setEditingAdminStudent(null);
    setAdminFormError('');
  };

  const openCreateAdminAchievement = () => {
    resetAdminAchievementForm();
    setShowAdminAchievementForm(true);
  };

  const openEditAdminAchievement = (achievement) => {
    setAdminAchievementForm({
      studentId: achievement.studentId,
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      level: achievement.level,
      date: achievement.date,
      result: achievement.result
    });
    setEditingAdminAchievement({
      studentId: achievement.studentId,
      id: achievement.id
    });
    setShowAdminAchievementForm(true);
    setAdminFormError('');
  };

  const closeAdminAchievementForm = () => {
    setShowAdminAchievementForm(false);
    resetAdminAchievementForm();
  };

  const saveAdminAchievement = (event) => {
    event.preventDefault();

    if (!adminAchievementForm.studentId || !adminAchievementForm.title.trim() || !adminAchievementForm.date) {
      setAdminFormError('Student, achievement title, and date are required.');
      return;
    }

    setStudentRecords((prevRecords) => {
      const targetRecord = prevRecords[adminAchievementForm.studentId] || {
        grade: 'Unassigned Grade',
        achievements: [],
        participations: []
      };

      const cleanEntry = {
        id: editingAdminAchievement ? editingAdminAchievement.id : Date.now(),
        title: adminAchievementForm.title.trim(),
        description: adminAchievementForm.description.trim(),
        date: adminAchievementForm.date,
        category: adminAchievementForm.category.trim() || 'General',
        level: adminAchievementForm.level.trim() || 'School',
        result: adminAchievementForm.result.trim() || '-'
      };

      const nextAchievements = editingAdminAchievement
        ? targetRecord.achievements.map((achievement) =>
            achievement.id === editingAdminAchievement.id ? cleanEntry : achievement
          )
        : [cleanEntry, ...targetRecord.achievements];

      return {
        ...prevRecords,
        [adminAchievementForm.studentId]: {
          ...targetRecord,
          achievements: nextAchievements
        }
      };
    });

    closeAdminAchievementForm();
  };

  const deleteAdminAchievement = (studentId, achievementId) => {
    setStudentRecords((prevRecords) => {
      const targetRecord = prevRecords[studentId];
      if (!targetRecord) {
        return prevRecords;
      }

      return {
        ...prevRecords,
        [studentId]: {
          ...targetRecord,
          achievements: targetRecord.achievements.filter((achievement) => achievement.id !== achievementId)
        }
      };
    });
  };

  const openCreateAdminStudent = () => {
    resetAdminStudentForm();
    setShowAdminStudentForm(true);
  };

  const openEditAdminStudent = (student) => {
    setAdminStudentForm({
      loginId: student.loginId,
      name: student.name,
      grade: student.grade
    });
    setEditingAdminStudent(student.loginId);
    setShowAdminStudentForm(true);
    setAdminFormError('');
  };

  const closeAdminStudentForm = () => {
    setShowAdminStudentForm(false);
    resetAdminStudentForm();
  };

  const saveAdminStudent = (event) => {
    event.preventDefault();
    const loginId = adminStudentForm.loginId.trim().toUpperCase();

    if (!loginId || !adminStudentForm.name.trim()) {
      setAdminFormError('Roll number and student name are required.');
      return;
    }

    if (editingAdminStudent) {
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.loginId === editingAdminStudent
            ? {
                ...user,
                name: adminStudentForm.name.trim()
              }
            : user
        )
      );

      setStudentRecords((prevRecords) => ({
        ...prevRecords,
        [editingAdminStudent]: {
          ...(prevRecords[editingAdminStudent] || {
            achievements: [],
            participations: []
          }),
          grade: adminStudentForm.grade
        }
      }));
    } else {
      const exists = users.some((user) => user.loginId === loginId);
      if (exists) {
        setAdminFormError('Roll number already exists.');
        return;
      }

      setUsers((prevUsers) => [
        ...prevUsers,
        {
          id: Date.now(),
          name: adminStudentForm.name.trim(),
          loginId,
          password: 'student123',
          role: 'student'
        }
      ]);

      setStudentRecords((prevRecords) => ({
        ...prevRecords,
        [loginId]: {
          grade: adminStudentForm.grade,
          achievements: [],
          participations: []
        }
      }));
    }

    closeAdminStudentForm();
  };

  const deleteAdminStudent = (loginId) => {
    setUsers((prevUsers) => prevUsers.filter((user) => user.loginId !== loginId));
    setStudentRecords((prevRecords) => {
      const { [loginId]: removedRecord, ...remaining } = prevRecords;
      return remaining;
    });
  };

  const handleAuthChange = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const loginId = authForm.loginId.trim().toUpperCase();

    const matchingUser = users.find(
      (user) =>
        user.loginId.toUpperCase() === loginId &&
        user.password === authForm.password &&
        user.role === authForm.role
    );

    if (!matchingUser) {
      setAuthError('Invalid credentials for selected role. Please use the demo credentials.');
      return;
    }

    setCurrentUser(matchingUser);
    setAuthError('');
    setAuthForm({ name: '', loginId: '', password: '', role: 'student' });
  };

  const handleSignUp = (event) => {
    event.preventDefault();
    const name = authForm.name.trim();
    const loginId = authForm.loginId.trim().toUpperCase();
    const password = authForm.password;

    if (!name || !loginId || !password) {
      setAuthError('Please fill all sign up fields.');
      return;
    }

    const loginIdExists = users.some((user) => user.loginId.toUpperCase() === loginId);
    if (loginIdExists) {
      setAuthError('This ID already exists. Please use another roll number/admin ID.');
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      loginId,
      password,
      role: authForm.role
    };

    setUsers((prevUsers) => [...prevUsers, newUser]);
    if (newUser.role === 'student') {
      setStudentRecords((prevRecords) => ({
        ...prevRecords,
        [newUser.loginId]: {
          grade: '9th Grade',
          achievements: [],
          participations: []
        }
      }));
    }
    setCurrentUser(newUser);
    setAuthError('');
    setAuthForm({ name: '', loginId: '', password: '', role: 'student' });
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setAuthError('');
  };

  const logOut = () => {
    setCurrentUser(null);
    setAuthMode('login');
    setAuthError('');
    setAuthForm({ name: '', loginId: '', password: '', role: 'student' });
    setStudentSection('achievements');
    setStudentTab('achievements');
    closeStudentForm();
  };

  if (!currentUser) {
    return (
      <div className="auth-screen">
        <div className="auth-wrap">
          <div className="auth-brand">
            <div className="auth-icon" aria-hidden="true">
              🎓
            </div>
            <h1>Student Achievement Portal</h1>
            <p>Track, Manage & Showcase Extracurricular Excellence</p>
          </div>

          <div className="auth-card">
            <h2>{authMode === 'login' ? 'Sign In' : 'Sign Up'}</h2>
            <p>
              {authMode === 'login'
                ? 'Choose your role to access the portal'
                : 'Create your account to access the portal'}
            </p>

            <div className="auth-role-toggle" role="radiogroup" aria-label="Choose role">
              <button
                type="button"
                className={authForm.role === 'student' ? 'active' : ''}
                onClick={() => handleAuthChange('role', 'student')}
              >
                Student
              </button>
              <button
                type="button"
                className={authForm.role === 'teacher' ? 'active' : ''}
                onClick={() => handleAuthChange('role', 'teacher')}
              >
                Admin
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="stack auth-form" onSubmit={handleLogin}>
                <label htmlFor="loginId">
                  {authForm.role === 'student' ? 'Roll Number' : 'Admin ID'}
                </label>
                <input
                  id="loginId"
                  type="text"
                  placeholder={authForm.role === 'student' ? 'Enter your roll number' : 'Enter your admin ID'}
                  value={authForm.loginId}
                  onChange={(event) => handleAuthChange('loginId', event.target.value)}
                />

                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={authForm.password}
                  onChange={(event) => handleAuthChange('password', event.target.value)}
                />

                {authError && <p className="error-text">{authError}</p>}
                <button type="submit" className="primary-btn dark-btn">
                  Sign In as {authForm.role === 'student' ? 'Student' : 'Admin'}
                </button>
              </form>
            ) : (
              <form className="stack auth-form" onSubmit={handleSignUp}>
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={authForm.name}
                  onChange={(event) => handleAuthChange('name', event.target.value)}
                />

                <label htmlFor="newLoginId">
                  {authForm.role === 'student' ? 'Roll Number' : 'Admin ID'}
                </label>
                <input
                  id="newLoginId"
                  type="text"
                  placeholder={authForm.role === 'student' ? 'Create roll number' : 'Create admin ID'}
                  value={authForm.loginId}
                  onChange={(event) => handleAuthChange('loginId', event.target.value)}
                />

                <label htmlFor="newPassword">Password</label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Create password"
                  value={authForm.password}
                  onChange={(event) => handleAuthChange('password', event.target.value)}
                />

                {authError && <p className="error-text">{authError}</p>}
                <button type="submit" className="primary-btn dark-btn">
                  Create {authForm.role === 'student' ? 'Student' : 'Admin'} Account
                </button>
              </form>
            )}

            <div className="temp-users">
              <h3>Demo Credentials:</h3>
              {authForm.role === 'student' ? (
                <p>
                  <strong>Roll Number:</strong> STU001, STU002, STU003, or STU004 <br />
                  <strong>Password:</strong> student123
                </p>
              ) : (
                <p>
                  <strong>Admin ID:</strong> ADM001 or ADM002 <br />
                  <strong>Password:</strong> admin123
                </p>
              )}
            </div>

            <div className="auth-switch-row">
              {authMode === 'login' ? (
                <p>
                  New user?{' '}
                  <button type="button" className="link-btn" onClick={() => switchAuthMode('signup')}>
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button type="button" className="link-btn" onClick={() => switchAuthMode('login')}>
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'student') {
    return (
      <div className="student-shell">
        <header className="student-topbar">
          <div className="student-profile">
            <div className="student-avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
            <div>
              <h3>{currentUser.name}</h3>
              <p>
                {currentStudentData?.grade || 'Unassigned Grade'} • {currentUser.loginId}
              </p>
            </div>
          </div>
          <button type="button" onClick={logOut} className="logout-btn">
            Logout
          </button>
        </header>

        <div className="student-layout">
          <aside className="student-sidebar">
            <button
              type="button"
              className={studentSection === 'achievements' ? 'active' : ''}
              onClick={() => {
                setStudentSection('achievements');
                setStudentTab('achievements');
              }}
            >
              My Achievements
            </button>
            <button
              type="button"
              className={studentSection === 'showcase' ? 'active' : ''}
              onClick={() => setStudentSection('showcase')}
            >
              Showcase
            </button>
          </aside>

          <main className="student-main">
            {studentSection === 'achievements' ? (
              <>
                <div className="student-main-head">
                  <div>
                    <h1>My Achievements & Participation</h1>
                    <p>Track and add your extracurricular accomplishments</p>
                  </div>
                  <button
                    type="button"
                    className="primary-btn dark-btn"
                    onClick={() => openStudentCreate(studentTab)}
                  >
                    + Add {studentTab === 'achievements' ? 'Achievement' : 'Participation'}
                  </button>
                </div>

                <section className="student-stats">
                  <article>
                    <h4>Total Achievements</h4>
                    <strong>{studentAchievements.length}</strong>
                  </article>
                  <article>
                    <h4>Active Participations</h4>
                    <strong className="green">{activeParticipations}</strong>
                  </article>
                  <article>
                    <h4>Total Hours Contributed</h4>
                    <strong>{totalHoursContributed}</strong>
                  </article>
                </section>

                <div className="student-tabs">
                  <button
                    type="button"
                    className={studentTab === 'achievements' ? 'active' : ''}
                    onClick={() => setStudentTab('achievements')}
                  >
                    My Achievements ({studentAchievements.length})
                  </button>
                  <button
                    type="button"
                    className={studentTab === 'participations' ? 'active' : ''}
                    onClick={() => setStudentTab('participations')}
                  >
                    Participations ({studentParticipations.length})
                  </button>
                </div>

                {showStudentForm && (
                  <section className="student-entry-form">
                    <h3>
                      {editingEntry
                        ? `Edit ${studentTab === 'achievements' ? 'Achievement' : 'Participation'}`
                        : `Add ${studentTab === 'achievements' ? 'Achievement' : 'Participation'}`}
                    </h3>

                    {studentTab === 'achievements' ? (
                      <form className="stack" onSubmit={saveAchievement}>
                        <input
                          type="text"
                          placeholder="Title"
                          value={achievementForm.title}
                          onChange={(event) =>
                            setAchievementForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                        />
                        <input
                          type="text"
                          placeholder="Level (School/State)"
                          value={achievementForm.level}
                          onChange={(event) =>
                            setAchievementForm((prev) => ({ ...prev, level: event.target.value }))
                          }
                        />
                        <input
                          type="text"
                          placeholder="Category"
                          value={achievementForm.category}
                          onChange={(event) =>
                            setAchievementForm((prev) => ({ ...prev, category: event.target.value }))
                          }
                        />
                        <input
                          type="text"
                          placeholder="Result (Winner, 1st Place, etc.)"
                          value={achievementForm.result}
                          onChange={(event) =>
                            setAchievementForm((prev) => ({ ...prev, result: event.target.value }))
                          }
                        />
                        <input
                          type="date"
                          value={achievementForm.date}
                          onChange={(event) =>
                            setAchievementForm((prev) => ({ ...prev, date: event.target.value }))
                          }
                        />
                        <textarea
                          rows="3"
                          placeholder="Description"
                          value={achievementForm.description}
                          onChange={(event) =>
                            setAchievementForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                        />
                        <div className="student-form-actions">
                          <button type="submit" className="primary-btn">
                            {editingEntry ? 'Update' : 'Create'}
                          </button>
                          <button type="button" onClick={closeStudentForm}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form className="stack" onSubmit={saveParticipation}>
                        <input
                          type="text"
                          placeholder="Title"
                          value={participationForm.title}
                          onChange={(event) =>
                            setParticipationForm((prev) => ({ ...prev, title: event.target.value }))
                          }
                        />
                        <input
                          type="text"
                          placeholder="Category"
                          value={participationForm.category}
                          onChange={(event) =>
                            setParticipationForm((prev) => ({ ...prev, category: event.target.value }))
                          }
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="Hours Contributed"
                          value={participationForm.hours}
                          onChange={(event) =>
                            setParticipationForm((prev) => ({ ...prev, hours: event.target.value }))
                          }
                        />
                        <select
                          value={participationForm.status}
                          onChange={(event) =>
                            setParticipationForm((prev) => ({ ...prev, status: event.target.value }))
                          }
                        >
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                        </select>
                        <input
                          type="date"
                          value={participationForm.date}
                          onChange={(event) =>
                            setParticipationForm((prev) => ({ ...prev, date: event.target.value }))
                          }
                        />
                        <textarea
                          rows="3"
                          placeholder="Description"
                          value={participationForm.description}
                          onChange={(event) =>
                            setParticipationForm((prev) => ({ ...prev, description: event.target.value }))
                          }
                        />
                        <div className="student-form-actions">
                          <button type="submit" className="primary-btn">
                            {editingEntry ? 'Update' : 'Create'}
                          </button>
                          <button type="button" onClick={closeStudentForm}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </section>
                )}

                <section className="student-cards">
                  {studentTab === 'achievements' ? (
                    studentAchievements.length > 0 ? (
                      studentAchievements.map((entry) => (
                        <article key={entry.id} className="student-card">
                          <div className="student-card-top">
                            <div>
                              <span className="tag">{entry.level}</span>
                              <span className="tag">{entry.category}</span>
                            </div>
                            <span className="result-tag">{entry.result}</span>
                          </div>
                          <h3>{entry.title}</h3>
                          <p>{entry.description}</p>
                          <small>{entry.date}</small>
                          <div className="student-card-actions">
                            <button type="button" onClick={() => openStudentEdit('achievements', entry)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-btn"
                              onClick={() => deleteStudentEntry('achievements', entry.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="hint">No achievements yet. Add your first one.</p>
                    )
                  ) : studentParticipations.length > 0 ? (
                    studentParticipations.map((entry) => (
                      <article key={entry.id} className="student-card">
                        <div className="student-card-top">
                          <div>
                            <span className="tag">{entry.category}</span>
                            <span className="tag">{entry.status}</span>
                          </div>
                          <span className="result-tag">{entry.hours} hrs</span>
                        </div>
                        <h3>{entry.title}</h3>
                        <p>{entry.description}</p>
                        <small>{entry.date}</small>
                        <div className="student-card-actions">
                          <button type="button" onClick={() => openStudentEdit('participations', entry)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => deleteStudentEntry('participations', entry.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="hint">No participations yet. Add your first one.</p>
                  )}
                </section>
              </>
            ) : (
              <section className="showcase-page">
                <div className="showcase-hero">
                  <div className="showcase-avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h1>{currentUser.name}</h1>
                    <p>
                      {currentStudentData?.grade || 'Unassigned Grade'} • {currentUser.loginId} • {studentEmail}
                    </p>
                  </div>
                </div>

                <section className="showcase-metrics">
                  <article className="showcase-metric">
                    <span>🏆</span>
                    <strong>{studentAchievements.length}</strong>
                    <p>Achievements</p>
                  </article>
                  <article className="showcase-metric">
                    <span>🎖️</span>
                    <strong>{activeParticipations}</strong>
                    <p>Activities</p>
                  </article>
                  <article className="showcase-metric">
                    <span>⏱️</span>
                    <strong>{totalHoursContributed}</strong>
                    <p>Hours</p>
                  </article>
                  <article className="showcase-metric">
                    <span>⭐</span>
                    <strong>{prestigiousCount}</strong>
                    <p>Prestigious</p>
                  </article>
                </section>

                <section className="showcase-card-wrap">
                  <h2>Areas of Excellence</h2>
                  <div className="excellence-grid">
                    {areasOfExcellence.length > 0 ? (
                      areasOfExcellence.map(([category, count]) => (
                        <article key={category} className="excellence-item">
                          <h3>{category}</h3>
                          <p>
                            {count} achievement{count > 1 ? 's' : ''}
                          </p>
                        </article>
                      ))
                    ) : (
                      <p className="hint">No categories yet.</p>
                    )}
                  </div>
                </section>

                <section className="showcase-card-wrap">
                  <h2>Achievement Timeline</h2>
                  <ul className="timeline-list">
                    {timelineAchievements.length > 0 ? (
                      timelineAchievements.map((achievement) => (
                        <li key={achievement.id} className="timeline-item">
                          <span className="timeline-dot" aria-hidden="true" />
                          <div>
                            <h3>{achievement.title}</h3>
                            <p>{achievement.description}</p>
                          </div>
                          <small>{formatMonthYear(achievement.date)}</small>
                        </li>
                      ))
                    ) : (
                      <li className="hint">No timeline entries yet.</li>
                    )}
                  </ul>
                </section>
              </section>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-brand">
          <div className="admin-brand-icon">🏆</div>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage student achievements</p>
          </div>
        </div>
        <button type="button" onClick={logOut} className="logout-btn">
          Logout
        </button>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <button
            type="button"
            className={adminSection === 'achievements' ? 'active' : ''}
            onClick={() => setAdminSection('achievements')}
          >
            Achievements
          </button>
          <button
            type="button"
            className={adminSection === 'students' ? 'active' : ''}
            onClick={() => setAdminSection('students')}
          >
            Students
          </button>
          <button
            type="button"
            className={adminSection === 'reports' ? 'active' : ''}
            onClick={() => setAdminSection('reports')}
          >
            Reports
          </button>
        </aside>

        <main className="admin-main">
          {adminSection === 'achievements' && (
            <>
              <div className="admin-head-row">
                <div>
                  <h2>Achievements Management</h2>
                  <p>Record and manage student achievements</p>
                </div>
                <button type="button" className="primary-btn dark-btn" onClick={openCreateAdminAchievement}>
                  + Add Achievement
                </button>
              </div>

              {showAdminAchievementForm && (
                <section className="admin-form-panel">
                  <h3>{editingAdminAchievement ? 'Edit Achievement' : 'Add Achievement'}</h3>
                  <form className="stack" onSubmit={saveAdminAchievement}>
                    <select
                      value={adminAchievementForm.studentId}
                      onChange={(event) =>
                        setAdminAchievementForm((prev) => ({ ...prev, studentId: event.target.value }))
                      }
                    >
                      {adminStudents.map((student) => (
                        <option key={student.loginId} value={student.loginId}>
                          {student.loginId} - {student.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Achievement title"
                      value={adminAchievementForm.title}
                      onChange={(event) =>
                        setAdminAchievementForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                    />
                    <textarea
                      rows="2"
                      placeholder="Description"
                      value={adminAchievementForm.description}
                      onChange={(event) =>
                        setAdminAchievementForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                    />
                    <div className="admin-form-grid">
                      <input
                        type="text"
                        placeholder="Category"
                        value={adminAchievementForm.category}
                        onChange={(event) =>
                          setAdminAchievementForm((prev) => ({ ...prev, category: event.target.value }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Level"
                        value={adminAchievementForm.level}
                        onChange={(event) =>
                          setAdminAchievementForm((prev) => ({ ...prev, level: event.target.value }))
                        }
                      />
                      <input
                        type="date"
                        value={adminAchievementForm.date}
                        onChange={(event) =>
                          setAdminAchievementForm((prev) => ({ ...prev, date: event.target.value }))
                        }
                      />
                      <input
                        type="text"
                        placeholder="Position / Result"
                        value={adminAchievementForm.result}
                        onChange={(event) =>
                          setAdminAchievementForm((prev) => ({ ...prev, result: event.target.value }))
                        }
                      />
                    </div>
                    {adminFormError && <p className="error-text">{adminFormError}</p>}
                    <div className="student-form-actions">
                      <button type="submit" className="primary-btn">
                        {editingAdminAchievement ? 'Update' : 'Create'}
                      </button>
                      <button type="button" onClick={closeAdminAchievementForm}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="admin-table-card">
                <div className="admin-table-head">
                  <div>
                    <h3>All Achievements</h3>
                    <p>Total: {filteredAdminAchievements.length} achievements</p>
                  </div>
                  <input
                    type="text"
                    className="admin-search"
                    placeholder="Search achievements..."
                    value={achievementSearch}
                    onChange={(event) => setAchievementSearch(event.target.value)}
                  />
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Achievement</th>
                        <th>Category</th>
                        <th>Level</th>
                        <th>Date</th>
                        <th>Position</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdminAchievements.map((achievement) => (
                        <tr key={`${achievement.studentId}-${achievement.id}`}>
                          <td>
                            <strong>{achievement.studentName}</strong>
                            <small>{achievement.studentId}</small>
                          </td>
                          <td>
                            <strong>{achievement.title}</strong>
                            <small>{achievement.description}</small>
                          </td>
                          <td>
                            <span className="tag">{achievement.category}</span>
                          </td>
                          <td>{achievement.level}</td>
                          <td>{achievement.date}</td>
                          <td>{achievement.result}</td>
                          <td>
                            <div className="admin-actions">
                              <button type="button" onClick={() => openEditAdminAchievement(achievement)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger-btn"
                                onClick={() => deleteAdminAchievement(achievement.studentId, achievement.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {adminSection === 'students' && (
            <>
              <div className="admin-head-row">
                <div>
                  <h2>Students Management</h2>
                  <p>Manage student profiles and information</p>
                </div>
                <button type="button" className="primary-btn dark-btn" onClick={openCreateAdminStudent}>
                  + Add Student
                </button>
              </div>

              <section className="admin-table-card">
                <div className="admin-table-head">
                  <div>
                    <h3>All Students</h3>
                    <p>Total: {filteredAdminStudents.length} students</p>
                  </div>
                  <input
                    type="text"
                    className="admin-search"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                  />
                </div>

                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Grade</th>
                        <th>Achievements</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdminStudents.map((student) => (
                        <tr key={student.loginId}>
                          <td>{student.loginId}</td>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>{student.grade}</td>
                          <td>
                            <span className="tag">🏆 {student.achievementCount}</span>
                          </td>
                          <td>
                            <div className="admin-actions">
                              <button type="button" onClick={() => openEditAdminStudent(student)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger-btn"
                                onClick={() => deleteAdminStudent(student.loginId)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {showAdminStudentForm && (
                <div className="admin-modal-overlay" role="presentation" onClick={closeAdminStudentForm}>
                  <section className="admin-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                    <div className="admin-modal-head">
                      <div>
                        <h3>{editingAdminStudent ? 'Edit Student' : 'Add Student'}</h3>
                        <p>
                          {editingAdminStudent
                            ? 'Update student information'
                            : 'Create a new student profile'}
                        </p>
                      </div>
                      <button type="button" className="admin-modal-close" onClick={closeAdminStudentForm}>
                        ×
                      </button>
                    </div>

                    <form className="stack" onSubmit={saveAdminStudent}>
                      <label htmlFor="admin-student-name">Full Name *</label>
                      <input
                        id="admin-student-name"
                        type="text"
                        value={adminStudentForm.name}
                        onChange={(event) =>
                          setAdminStudentForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                      />

                      <label htmlFor="admin-student-email">Email *</label>
                      <input
                        id="admin-student-email"
                        type="text"
                        value={`${adminStudentForm.name
                          .toLowerCase()
                          .replace(/[^a-z\s]/g, '')
                          .trim()
                          .replace(/\s+/g, '.')}@school.edu`}
                        disabled
                      />

                      <label htmlFor="admin-student-roll">Roll Number *</label>
                      <input
                        id="admin-student-roll"
                        type="text"
                        placeholder="STU005"
                        value={adminStudentForm.loginId}
                        disabled={Boolean(editingAdminStudent)}
                        onChange={(event) =>
                          setAdminStudentForm((prev) => ({ ...prev, loginId: event.target.value }))
                        }
                      />

                      <label htmlFor="admin-student-grade">Grade *</label>
                      <select
                        id="admin-student-grade"
                        value={adminStudentForm.grade}
                        onChange={(event) =>
                          setAdminStudentForm((prev) => ({ ...prev, grade: event.target.value }))
                        }
                      >
                        <option value="9th Grade">9th Grade</option>
                        <option value="10th Grade">10th Grade</option>
                        <option value="11th Grade">11th Grade</option>
                        <option value="12th Grade">12th Grade</option>
                      </select>

                      {adminFormError && <p className="error-text">{adminFormError}</p>}

                      <div className="admin-modal-actions">
                        <button type="button" onClick={closeAdminStudentForm}>
                          Cancel
                        </button>
                        <button type="submit" className="primary-btn dark-btn">
                          {editingAdminStudent ? 'Update Student' : 'Create Student'}
                        </button>
                      </div>
                    </form>
                  </section>
                </div>
              )}
            </>
          )}

          {adminSection === 'reports' && (
            <>
              <div className="admin-head-row">
                <div>
                  <h2>Reports & Analytics</h2>
                  <p>View achievement statistics and insights</p>
                </div>
                <select
                  className="admin-filter"
                  value={reportStudentFilter}
                  onChange={(event) => setReportStudentFilter(event.target.value)}
                >
                  <option value="all">All Students</option>
                  {adminStudents.map((student) => (
                    <option key={student.loginId} value={student.loginId}>
                      {student.loginId} - {student.name}
                    </option>
                  ))}
                </select>
              </div>

              <section className="admin-report-stats">
                <article>
                  <h4>Total Students</h4>
                  <strong>{reportStudents.length}</strong>
                  <p>Registered students</p>
                </article>
                <article>
                  <h4>Total Achievements</h4>
                  <strong>{reportAchievements.length}</strong>
                  <p>All achievements</p>
                </article>
                <article>
                  <h4>Active Participations</h4>
                  <strong>{reportActiveParticipations}</strong>
                  <p>Ongoing activities</p>
                </article>
                <article>
                  <h4>Total Hours</h4>
                  <strong>{reportHours}</strong>
                  <p>Participation hours</p>
                </article>
              </section>

              <section className="admin-report-grid">
                <article className="admin-report-card">
                  <h3>Achievements by Category</h3>
                  <p>Distribution across different categories</p>
                  <div className="admin-bars">
                    {Object.entries(reportCategoryCounts).map(([category, count]) => (
                      <div key={category} className="admin-bar-row">
                        <span>{category}</span>
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill"
                            style={{
                              width: `${Math.max(12, (count / Math.max(1, reportAchievements.length)) * 100)}%`
                            }}
                          />
                        </div>
                        <small>{count}</small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="admin-report-card">
                  <h3>Achievements by Level</h3>
                  <p>Competition level distribution</p>
                  <div className="admin-level-list">
                    {Object.entries(reportLevelCounts).map(([level, count]) => (
                      <div key={level} className="admin-level-item">
                        <span>{level}</span>
                        <strong>{Math.round((count / Math.max(1, reportAchievements.length)) * 100)}%</strong>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
