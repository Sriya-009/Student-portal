import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SubmissionCalendar from '../components/SubmissionCalendar';
import { achievements, students, submissionEvents } from '../data/portalData';
import '../styles/dashboard.css';

function StudentDashboard() {
  const [activeView, setActiveView] = useState('achievements');
  const [activeListTab, setActiveListTab] = useState('achievements');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const currentStudent = useMemo(() => {
    if (user?.rollNumber) {
      const byRoll = students.find((student) => student.rollNumber === user.rollNumber);
      if (byRoll) return byRoll;
    }
    return students[0];
  }, [user]);

  const myRecords = achievements.filter((item) => item.studentRoll === currentStudent.rollNumber);
  const myAchievementRecords = myRecords.filter((item) => item.type === 'achievement');
  const myActivityRecords = myRecords.filter((item) => item.type === 'activity');
  const totalHours = myRecords.reduce((total, item) => total + item.participationHours, 0);

  const categoryMap = myRecords.reduce((accumulator, item) => {
    return {
      ...accumulator,
      [item.category]: (accumulator[item.category] || 0) + 1
    };
  }, {});

  const timeline = [...myRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-shell student-shell">
      <header className="portal-topbar">
        <div className="topbar-user">
          <span className="topbar-avatar">{currentStudent.initials}</span>
          <div>
            <p className="topbar-name">{currentStudent.name}</p>
            <p className="topbar-meta">{currentStudent.grade} • {currentStudent.rollNumber}</p>
          </div>
        </div>
        <button type="button" className="outline-btn" onClick={handleLogout}>Logout</button>
      </header>

      <div className="portal-layout">
        <aside className="portal-sidebar">
          <button
            type="button"
            className={`sidebar-action ${activeView === 'achievements' ? 'active' : ''}`}
            onClick={() => setActiveView('achievements')}
          >
            My Achievements
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'showcase' ? 'active' : ''}`}
            onClick={() => setActiveView('showcase')}
          >
            Showcase
          </button>
          <button
            type="button"
            className={`sidebar-action ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            Submission Calendar
          </button>
        </aside>

        <main className="portal-main">
          {activeView === 'achievements' ? (
            <>
              <section className="page-head page-head-row">
                <div>
                  <h1>My Achievements &amp; Participation</h1>
                  <p>Track and add your extracurricular accomplishments</p>
                </div>
                <button type="button" className="primary-dark-btn">+ Add Achievement</button>
              </section>

              <section className="stats-grid three-cols">
                <article className="stat-card"><h4>Total Achievements</h4><strong className="value-primary">{myAchievementRecords.length}</strong></article>
                <article className="stat-card"><h4>Active Participations</h4><strong className="value-success">{myActivityRecords.length}</strong></article>
                <article className="stat-card"><h4>Total Hours Contributed</h4><strong className="value-primary">{totalHours}</strong></article>
              </section>

              <div className="segmented-tabs">
                <button
                  type="button"
                  className={activeListTab === 'achievements' ? 'active' : ''}
                  onClick={() => setActiveListTab('achievements')}
                >
                  My Achievements ({myAchievementRecords.length})
                </button>
                <button
                  type="button"
                  className={activeListTab === 'participations' ? 'active' : ''}
                  onClick={() => setActiveListTab('participations')}
                >
                  Participations ({myActivityRecords.length})
                </button>
              </div>

              <section className="record-list">
                {(activeListTab === 'achievements' ? myAchievementRecords : myActivityRecords).map((item) => (
                  <article key={item.id} className="record-card">
                    <div className="record-head">
                      <div className="tag-row">
                        <span className="dot" />
                        <span className="pill muted">{item.level}</span>
                        <span className="pill info">{item.category}</span>
                      </div>
                      <span className="pill badge">{item.position}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="record-foot">
                      <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <button type="button" className="danger-ghost">Delete</button>
                    </div>
                  </article>
                ))}
              </section>
            </>
          ) : activeView === 'showcase' ? (
            <>
              <section className="showcase-hero">
                <div className="showcase-avatar">{currentStudent.initials}</div>
                <div>
                  <h2>{currentStudent.name}</h2>
                  <p>{currentStudent.grade} • {currentStudent.rollNumber} • {currentStudent.email}</p>
                </div>
              </section>

              <section className="stats-grid four-cols">
                <article className="stat-card centered"><h4>Achievements</h4><strong className="value-primary">{myAchievementRecords.length}</strong></article>
                <article className="stat-card centered"><h4>Activities</h4><strong className="value-primary">{myActivityRecords.length}</strong></article>
                <article className="stat-card centered"><h4>Hours</h4><strong className="value-primary">{totalHours}</strong></article>
                <article className="stat-card centered"><h4>Prestigious</h4><strong className="value-primary">0</strong></article>
              </section>

              <section className="showcase-card">
                <h3>Areas of Excellence</h3>
                <div className="chip-grid">
                  {Object.entries(categoryMap).map(([name, count]) => (
                    <div key={name} className="big-chip">
                      <strong>{name}</strong>
                      <span>{count} achievement</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="showcase-card">
                <h3>Achievement Timeline</h3>
                <ul className="timeline-list">
                  {timeline.map((item) => (
                    <li key={item.id}>
                      <div className="timeline-dot" />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.category}</p>
                      </div>
                      <span>{new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <>
              <section className="page-head">
                <h1>Event Submission Calendar</h1>
                <p>Track due dates, quizzes, and assignment uploads in one monthly view</p>
              </section>

              <SubmissionCalendar events={submissionEvents} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;
