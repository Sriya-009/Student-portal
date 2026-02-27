import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import '../styles/dashboard.css';

const links = [
  { to: '/teacher', label: 'Overview' },
  { to: '/assign-tasks', label: 'Assign Tasks' },
  { to: '/upload-files', label: 'Upload Files' },
  { to: '/progress', label: 'Progress' }
];

function TeacherDashboard() {
  return (
    <div>
      <Navbar />
      <div className="dashboard-layout">
        <Sidebar links={links} />
        <main className="dashboard-content">
          <div className="dashboard-section">
            <Card title="Teacher Dashboard">
              <p>Create assignments, share resources, and monitor learner performance.</p>
            </Card>

            <section className="summary-grid" aria-label="Teaching Overview">
              <article className="summary-card">
                <p className="summary-label">Assigned Classes</p>
                <p className="summary-value">0</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Active Coursework</p>
                <p className="summary-value">0</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Pending Evaluations</p>
                <p className="summary-value">0</p>
              </article>
            </section>

            <section className="panel-grid" aria-label="Teaching Actions">
              <article className="panel">
                <h4>Instructional Focus</h4>
                <ul>
                  <li>Publish coursework with detailed criteria.</li>
                  <li>Track submission quality and turnaround time.</li>
                  <li>Provide timely and actionable feedback.</li>
                </ul>
              </article>
              <article className="panel">
                <h4>Communication</h4>
                <ul>
                  <li>Share weekly learning goals with students.</li>
                  <li>Flag overdue submissions for follow-up.</li>
                  <li>Maintain consistent grading standards.</li>
                </ul>
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default TeacherDashboard;
