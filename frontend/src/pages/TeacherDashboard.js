import Navbar from '../components/shared/Navbar';
import Sidebar from '../components/shared/Sidebar';
import Card from '../components/shared/Card';
import SubmissionCalendar from '../components/shared/SubmissionCalendar';
import '../styles/dashboard.css';

const submissionEvents = [];

const links = [
  { to: '/faculty', label: 'Faculty Home' },
  { to: '/assign-tasks', label: 'Assign Tasks' },
  { to: '/upload-files', label: 'Upload Files' },
  { to: '/progress', label: 'Progress' }
];

function FacultyDashboard() {
  return (
    <div>
      <Navbar />
      <div className="dashboard-layout">
        <Sidebar links={links} />
        <main className="dashboard-content">
          <div className="dashboard-section">
            <Card title="Faculty Dashboard">
              <p>Manage student submissions, publish due dates, and control the shared calendar.</p>
            </Card>

            <section className="summary-grid" aria-label="Teaching Overview">
              <article className="summary-card">
                <p className="summary-label">Scheduled Submission Events</p>
                <p className="summary-value">{submissionEvents.length}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Open Assignment Windows</p>
                <p className="summary-value">{submissionEvents.filter((item) => item.type === 'assignment').length}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Quiz and Exam Deadlines</p>
                <p className="summary-value">{submissionEvents.filter((item) => item.type === 'quiz' || item.type === 'exam').length}</p>
              </article>
            </section>

            <section className="panel-grid" aria-label="Teaching Actions">
              <article className="panel">
                <h4>Faculty Responsibilities</h4>
                <ul>
                  <li>Create submission events and define due dates.</li>
                  <li>Publish assignment, quiz, and exam windows.</li>
                  <li>Keep students informed using the shared calendar.</li>
                </ul>
              </article>
              <article className="panel">
                <h4>Admin Coordination</h4>
                <ul>
                  <li>Request date extensions only when required.</li>
                  <li>Share impact notes before extending deadlines.</li>
                  <li>Review revised due dates with students.</li>
                </ul>
              </article>
            </section>

            <SubmissionCalendar
              title="Faculty Submission Calendar"
              events={submissionEvents}
              canCreateEvents
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default FacultyDashboard;
