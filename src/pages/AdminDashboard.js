import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { achievements as baseAchievements, students as baseStudents } from '../data/portalData';
import '../styles/dashboard.css';

const reportColors = ['#1d4ed8', '#7c3aed', '#f59e0b', '#ef4444', '#10b981', '#14b8a6', '#f97316'];

function AdminDashboard() {
  const [activeView, setActiveView] = useState('achievements');
  const [achievements, setAchievements] = useState(baseAchievements);
  const [students, setStudents] = useState(baseStudents);
  const [searchAchievements, setSearchAchievements] = useState('');
  const [searchStudents, setSearchStudents] = useState('');
  const [selectedStudentFilter, setSelectedStudentFilter] = useState('All Students');
  const [editingStudent, setEditingStudent] = useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const achievementRows = achievements.filter((item) => {
    const student = students.find((entry) => entry.rollNumber === item.studentRoll);
    const searchText = `${student?.name || ''} ${item.title} ${item.category}`.toLowerCase();
    return searchText.includes(searchAchievements.toLowerCase());
  });

  const studentRows = students.filter((item) => {
    const searchable = `${item.rollNumber} ${item.name} ${item.email} ${item.grade}`.toLowerCase();
    return searchable.includes(searchStudents.toLowerCase());
  });

  const achievementsByCategory = useMemo(() => {
    return achievements.reduce((accumulator, item) => {
      return {
        ...accumulator,
        [item.category]: (accumulator[item.category] || 0) + 1
      };
    }, {});
  }, [achievements]);

  const achievementsByLevel = useMemo(() => {
    return achievements.reduce((accumulator, item) => {
      return {
        ...accumulator,
        [item.level]: (accumulator[item.level] || 0) + 1
      };
    }, {});
  }, [achievements]);

  const filteredForReport = selectedStudentFilter === 'All Students'
    ? achievements
    : achievements.filter((item) => item.studentRoll === selectedStudentFilter);

  const activeParticipations = filteredForReport.filter((item) => item.type === 'activity').length;
  const totalHours = filteredForReport.reduce((sum, item) => sum + item.participationHours, 0);

  const handleDeleteAchievement = (id) => {
    setAchievements((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteStudent = (rollNumber) => {
    setStudents((prev) => prev.filter((item) => item.rollNumber !== rollNumber));
    setAchievements((prev) => prev.filter((item) => item.studentRoll !== rollNumber));
  };

  const handleUpdateStudent = (event) => {
    event.preventDefault();
    setStudents((prev) => prev.map((item) => (item.rollNumber === editingStudent.rollNumber ? editingStudent : item)));
    setEditingStudent(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell">
      <header className="portal-topbar admin-topbar">
        <div className="topbar-user">
          <span className="icon-badge">🏆</span>
          <div>
            <p className="topbar-name">Admin Dashboard</p>
            <p className="topbar-meta">Manage student achievements</p>
          </div>
        </div>
        <button type="button" className="outline-btn" onClick={handleLogout}>Logout</button>
      </header>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <button type="button" className={`sidebar-action ${activeView === 'achievements' ? 'active' : ''}`} onClick={() => setActiveView('achievements')}>Achievements</button>
          <button type="button" className={`sidebar-action ${activeView === 'students' ? 'active' : ''}`} onClick={() => setActiveView('students')}>Students</button>
          <button type="button" className={`sidebar-action ${activeView === 'reports' ? 'active' : ''}`} onClick={() => setActiveView('reports')}>Reports</button>
        </aside>

        <main className="portal-main">
          {activeView === 'achievements' ? (
            <>
              <section className="page-head page-head-row">
                <div>
                  <h1>Achievements Management</h1>
                  <p>Record and manage student achievements</p>
                </div>
                <button type="button" className="primary-dark-btn">+ Add Achievement</button>
              </section>

              <section className="table-card">
                <div className="table-head">
                  <div>
                    <h3>All Achievements</h3>
                    <p>Total: {achievementRows.length} achievements</p>
                  </div>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="Search achievements..."
                    value={searchAchievements}
                    onChange={(event) => setSearchAchievements(event.target.value)}
                  />
                </div>

                <table>
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
                    {achievementRows.map((item) => {
                      const student = students.find((entry) => entry.rollNumber === item.studentRoll);
                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{student?.name || 'Unknown Student'}</strong>
                            <div className="muted-line">{item.studentRoll}</div>
                          </td>
                          <td>
                            <strong>{item.title}</strong>
                            <div className="muted-line">{item.description}</div>
                          </td>
                          <td><span className="pill info">{item.category}</span></td>
                          <td>{item.level}</td>
                          <td>{new Date(item.date).toLocaleDateString('en-US')}</td>
                          <td>{item.position}</td>
                          <td>
                            <div className="action-row">
                              <button type="button" className="icon-btn">✎</button>
                              <button type="button" className="icon-btn danger" onClick={() => handleDeleteAchievement(item.id)}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </>
          ) : null}

          {activeView === 'students' ? (
            <>
              <section className="page-head page-head-row">
                <div>
                  <h1>Students Management</h1>
                  <p>Manage student profiles and information</p>
                </div>
                <button type="button" className="primary-dark-btn">+ Add Student</button>
              </section>

              <section className="table-card">
                <div className="table-head">
                  <div>
                    <h3>All Students</h3>
                    <p>Total: {studentRows.length} students</p>
                  </div>
                  <input
                    type="text"
                    className="table-search"
                    placeholder="Search students..."
                    value={searchStudents}
                    onChange={(event) => setSearchStudents(event.target.value)}
                  />
                </div>

                <table>
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
                    {studentRows.map((student) => {
                      const count = achievements.filter((item) => item.studentRoll === student.rollNumber).length;
                      return (
                        <tr key={student.rollNumber}>
                          <td>{student.rollNumber}</td>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>{student.grade}</td>
                          <td><span className="pill muted">🏆 {count}</span></td>
                          <td>
                            <div className="action-row">
                              <button type="button" className="icon-btn" onClick={() => setEditingStudent(student)}>✎</button>
                              <button type="button" className="icon-btn danger" onClick={() => handleDeleteStudent(student.rollNumber)}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </>
          ) : null}

          {activeView === 'reports' ? (
            <>
              <section className="page-head page-head-row">
                <div>
                  <h1>Reports &amp; Analytics</h1>
                  <p>View achievement statistics and insights</p>
                </div>
                <select
                  className="table-search select-filter"
                  value={selectedStudentFilter}
                  onChange={(event) => setSelectedStudentFilter(event.target.value)}
                >
                  <option>All Students</option>
                  {students.map((student) => (
                    <option key={student.rollNumber} value={student.rollNumber}>{student.name}</option>
                  ))}
                </select>
              </section>

              <section className="stats-grid four-cols">
                <article className="stat-card"><h4>Total Students</h4><strong className="value-primary">{students.length}</strong><p>Registered students</p></article>
                <article className="stat-card"><h4>Total Achievements</h4><strong className="value-primary">{filteredForReport.length}</strong><p>All achievements</p></article>
                <article className="stat-card"><h4>Active Participations</h4><strong className="value-primary">{activeParticipations}</strong><p>Ongoing activities</p></article>
                <article className="stat-card"><h4>Total Hours</h4><strong className="value-primary">{totalHours}</strong><p>Participation hours</p></article>
              </section>

              <section className="chart-grid">
                <article className="chart-card">
                  <h3>Achievements by Category</h3>
                  <p>Distribution across different categories</p>
                  <div className="bars-wrap">
                    {Object.entries(achievementsByCategory).map(([label, value]) => (
                      <div key={label} className="bar-item">
                        <div className="bar-fill" style={{ blockSize: Math.max(25, value * 35) }} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="chart-card">
                  <h3>Achievements by Level</h3>
                  <p>Competition level distribution</p>
                  <div className="pie-list">
                    {Object.entries(achievementsByLevel).map(([label, value], index) => {
                      const percentage = Math.round((value / achievements.length) * 100);
                      return (
                        <div key={label}>
                          <span className="swatch" style={{ background: reportColors[index % reportColors.length] }} />
                          {label} ({percentage}%)
                        </div>
                      );
                    })}
                  </div>
                </article>
              </section>
            </>
          ) : null}
        </main>
      </div>

      {editingStudent ? (
        <div className="modal-overlay">
          <form className="modal-card" onSubmit={handleUpdateStudent}>
            <div className="modal-head">
              <div>
                <h3>Edit Student</h3>
                <p>Update student information</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditingStudent(null)}>✕</button>
            </div>

            <label htmlFor="fullName">Full Name *</label>
            <input
              id="fullName"
              type="text"
              value={editingStudent.name}
              onChange={(event) => setEditingStudent((prev) => ({ ...prev, name: event.target.value }))}
              required
            />

            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={editingStudent.email}
              onChange={(event) => setEditingStudent((prev) => ({ ...prev, email: event.target.value }))}
              required
            />

            <label htmlFor="rollNumber">Roll Number *</label>
            <input id="rollNumber" type="text" value={editingStudent.rollNumber} disabled />

            <label htmlFor="grade">Grade *</label>
            <input
              id="grade"
              type="text"
              value={editingStudent.grade}
              onChange={(event) => setEditingStudent((prev) => ({ ...prev, grade: event.target.value }))}
              required
            />

            <div className="modal-actions">
              <button type="button" className="outline-btn" onClick={() => setEditingStudent(null)}>Cancel</button>
              <button type="submit" className="primary-dark-btn">Update Student</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboard;
