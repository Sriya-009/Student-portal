import { useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Card from '../components/Card';
import '../styles/dashboard.css';

const links = [
  { to: '/student', label: 'Overview' },
  { to: '/progress', label: 'Progress' }
];

const assignments = [];

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthDays(referenceDate) {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDayOfMonth; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= totalDaysInMonth; day += 1) {
    cells.push(day);
  }

  return cells;
}

function StudentDashboard() {
  const [mode, setMode] = useState('overview');
  const [activeMonth, setActiveMonth] = useState(new Date(2026, 2, 1));

  const monthLabel = activeMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const monthDays = useMemo(() => getMonthDays(activeMonth), [activeMonth]);

  const dueMap = useMemo(() => {
    return assignments.reduce((accumulator, assignment) => {
      const date = new Date(assignment.dueDate);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return {
        ...accumulator,
        [key]: [...(accumulator[key] || []), assignment]
      };
    }, {});
  }, []);

  const visibleDueAssignments = assignments.filter((assignment) => {
    const date = new Date(assignment.dueDate);
    return (
      date.getFullYear() === activeMonth.getFullYear() &&
      date.getMonth() === activeMonth.getMonth()
    );
  });

  const goToPreviousMonth = () => {
    setActiveMonth(
      (previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setActiveMonth(
      (previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1)
    );
  };

  return (
    <div>
      <Navbar />
      <div className="dashboard-layout">
        <Sidebar links={links} />
        <main className="dashboard-content">
          <div className="dashboard-section">
            <Card title="Student Dashboard">
              <p>Review your schedule, track due dates, and stay organized.</p>
            </Card>

            <section className="summary-grid" aria-label="Student Overview">
              <article className="summary-card">
                <p className="summary-label">Upcoming Deadlines</p>
                <p className="summary-value">{visibleDueAssignments.length}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Current Month</p>
                <p className="summary-value">{activeMonth.toLocaleDateString('en-US', { month: 'short' })}</p>
              </article>
              <article className="summary-card">
                <p className="summary-label">Status</p>
                <p className="summary-value">On Track</p>
              </article>
            </section>

            <Card title="Schedule View">
              <div className="mode-switch">
                <button
                  type="button"
                  className={`btn ${mode === 'overview' ? '' : 'secondary-btn'}`}
                  onClick={() => setMode('overview')}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={`btn ${mode === 'calendar' ? '' : 'secondary-btn'}`}
                  onClick={() => setMode('calendar')}
                >
                  Calendar Mode
                </button>
              </div>

              {mode === 'overview' ? (
                <div className="panel-grid">
                  <article className="panel">
                    <h4>Planning Guidance</h4>
                    <ul>
                      <li>Review deadlines at the beginning of each week.</li>
                      <li>Prioritize tasks with nearest submission dates.</li>
                      <li>Track pending work in calendar mode.</li>
                    </ul>
                  </article>
                  <article className="panel">
                    <h4>Current Status</h4>
                    <ul>
                      <li>No scheduled assignments are currently listed.</li>
                      <li>Add assignments to begin deadline tracking.</li>
                      <li>Use monthly navigation for forward planning.</li>
                    </ul>
                  </article>
                </div>
              ) : (
                <div className="calendar-mode">
                  <div className="calendar-header">
                    <button type="button" className="btn secondary-btn" onClick={goToPreviousMonth}>
                      Previous
                    </button>
                    <strong>{monthLabel}</strong>
                    <button type="button" className="btn secondary-btn" onClick={goToNextMonth}>
                      Next
                    </button>
                  </div>

                  <div className="weekday-grid">
                    {weekdayLabels.map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>

                  <div className="calendar-grid">
                    {monthDays.map((day, index) => {
                      if (!day) {
                        return <div key={`empty-${index}`} className="calendar-cell empty-cell" />;
                      }

                      const dueKey = `${activeMonth.getFullYear()}-${activeMonth.getMonth()}-${day}`;
                      const dayDueItems = dueMap[dueKey] || [];

                      return (
                        <div key={dueKey} className="calendar-cell">
                          <span className="day-number">{day}</span>
                          {dayDueItems.length > 0 ? (
                            <span className="due-dot" title={`${dayDueItems.length} due`}>
                              {dayDueItems.length} due
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="due-list">
                    <h4>Due Assignments</h4>
                    {visibleDueAssignments.length === 0 ? (
                      <p>No scheduled assignments for this month.</p>
                    ) : (
                      <ul>
                        {visibleDueAssignments.map((assignment) => (
                          <li key={assignment.id}>
                            <strong>{assignment.title}</strong> - {assignment.dueDate}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default StudentDashboard;
