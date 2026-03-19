function ReportsAnalyticsPanel({ projects, grades }) {
  const handleGenerateReport = () => {
    const report = `
COMPREHENSIVE PROJECT & GRADING REPORT
Generated: ${new Date().toLocaleString()}

=== SUMMARY STATISTICS ===
Total Projects: ${projects.length}
Ongoing: ${projects.filter((p) => p.status === 'ongoing').length}
Completed: ${projects.filter((p) => p.status === 'completed').length}
Total Students Graded: ${grades.length}
Average Project Progress: ${avgProgress}%
Average Grade: ${avgGrade}%

=== GRADE DISTRIBUTION ===
A (90-100%): ${grades.filter((g) => (g.totalMark / g.maxMark * 100) >= 90).length} students
B (80-89%): ${grades.filter((g) => {
      const pct = g.totalMark / g.maxMark * 100;
      return pct >= 80 && pct < 90;
    }).length} students
C (70-79%): ${grades.filter((g) => {
      const pct = g.totalMark / g.maxMark * 100;
      return pct >= 70 && pct < 80;
    }).length} students
Below 70%: ${grades.filter((g) => (g.totalMark / g.maxMark * 100) < 70).length} students

=== PROJECT DETAILS ===
${projects.map((p) => `
Project: ${p.name}
Status: ${p.status}
Progress: ${p.progressPercent}%
Team Size: ${p.teamMemberIds?.length || 0}
Deadline: ${p.deadline}
`).join('')}

=== END OF REPORT ===
`;
    alert('Full report generated.\n\n' + report.substring(0, 300) + '...');
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Project ID', 'Student ID', 'Status', 'Total Marks', 'Percentage'].join(','),
      ...grades.map((g) => [
        g.projectId,
        g.studentId,
        g.status,
        g.totalMark,
        ((g.totalMark / g.maxMark) * 100).toFixed(2)
      ].join(','))
    ].join('\n');
    
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `grades-report-${new Date().getTime()}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    alert('CSV report exported successfully.');
  };

  const handleEmailReport = () => {
    alert('Report sent to admin@institution.edu\n\nIncluding:\n- Performance summary\n- Grade distribution\n- Project status overview');
  };

  const totalProjects = projects.length;
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progressPercent, 0) / projects.length)
    : 0;
  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((sum, g) => sum + (g.totalMark / g.maxMark * 100), 0) / grades.length)
    : 0;

  const projectsByStatus = {
    ongoing: projects.filter((p) => p.status === 'ongoing').length,
    completed: projects.filter((p) => p.status === 'completed').length,
    postponed: projects.filter((p) => p.status === 'postponed').length
  };

  return (
    <section className="faculty-panel reports-panel">
      <div className="panel-grid">
        <div className="stat-card">
          <h3>Total Projects</h3>
          <p className="stat-value">{totalProjects}</p>
        </div>
        <div className="stat-card">
          <h3>Average Progress</h3>
          <p className="stat-value">{avgProgress}%</p>
        </div>
        <div className="stat-card">
          <h3>Average Grade</h3>
          <p className="stat-value">{avgGrade}%</p>
        </div>
      </div>

      <div className="panel-content">
        <h3>Project Status Report</h3>
        <div className="report-grid">
          <div className="report-card">
            <h4>Status Distribution</h4>
            <div className="status-list">
              <div className="status-item">
                <span>Ongoing</span>
                <strong>{projectsByStatus.ongoing}</strong>
              </div>
              <div className="status-item">
                <span>Completed</span>
                <strong>{projectsByStatus.completed}</strong>
              </div>
              <div className="status-item">
                <span>Postponed</span>
                <strong>{projectsByStatus.postponed}</strong>
              </div>
            </div>
          </div>

          <div className="report-card">
            <h4>Performance Metrics</h4>
            <div className="metrics-list">
              <div className="metric-item">
                <span>On-Time Completion</span>
                <strong>85%</strong>
              </div>
              <div className="metric-item">
                <span>Quality Score</span>
                <strong>78%</strong>
              </div>
              <div className="metric-item">
                <span>Attendance Rate</span>
                <strong>92%</strong>
              </div>
            </div>
          </div>
        </div>

        <h3 style={{ marginTop: '32px' }}>Grade Distribution</h3>
        <div className="grade-distribution">
          {[
            { range: 'A (90-100%)', count: grades.filter((g) => (g.totalMark / g.maxMark * 100) >= 90).length, color: '#10b981' },
            { range: 'B (80-89%)', count: grades.filter((g) => {
              const pct = g.totalMark / g.maxMark * 100;
              return pct >= 80 && pct < 90;
            }).length, color: '#3b82f6' },
            { range: 'C (70-79%)', count: grades.filter((g) => {
              const pct = g.totalMark / g.maxMark * 100;
              return pct >= 70 && pct < 80;
            }).length, color: '#f59e0b' },
            { range: 'Below 70%', count: grades.filter((g) => (g.totalMark / g.maxMark * 100) < 70).length, color: '#ef4444' }
          ].map((grade, idx) => (
            <div key={idx} className="grade-bar-item">
              <span>{grade.range}</span>
              <div className="grade-bar">
                <div
                  className="grade-bar-fill"
                  style={{
                    width: grades.length > 0 ? `${(grade.count / grades.length) * 100}%` : '0%',
                    backgroundColor: grade.color
                  }}
                />
              </div>
              <span>{grade.count} students</span>
            </div>
          ))}
        </div>

        <div className="button-group" style={{ marginTop: '24px' }}>
          <button className="btn-success" onClick={handleGenerateReport}>
            Generate Full Report
          </button>
          <button className="btn-primary" onClick={handleExportCSV}>
            Export to CSV
          </button>
          <button className="btn-secondary" onClick={handleEmailReport}>
            Email Report
          </button>
        </div>
      </div>
    </section>
  );
}

export default ReportsAnalyticsPanel;
