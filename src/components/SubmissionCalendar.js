import { useMemo, useState } from 'react';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function SubmissionCalendar({ events }) {
  const [activeCourse, setActiveCourse] = useState('All courses');
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const courses = useMemo(() => {
    const uniqueCourses = Array.from(new Set(events.map((event) => event.course)));
    return ['All courses', ...uniqueCourses.filter((course) => course !== 'All courses')];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (activeCourse === 'All courses') {
      return events;
    }
    return events.filter((event) => event.course === activeCourse || event.course === 'All courses');
  }, [activeCourse, events]);

  const eventsByDay = useMemo(() => {
    return filteredEvents.reduce((accumulator, event) => {
      const key = event.date;
      const list = accumulator[key] || [];
      return {
        ...accumulator,
        [key]: [...list, event]
      };
    }, {});
  }, [filteredEvents]);

  const monthMeta = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayStartOffset = (firstDay.getDay() + 6) % 7;

    const cells = [];

    for (let i = 0; i < mondayStartOffset; i += 1) {
      cells.push({ id: `empty-start-${i}`, isCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateObj = new Date(year, month, day);
      cells.push({
        id: `day-${day}`,
        day,
        dateKey: toLocalDateKey(dateObj),
        isCurrentMonth: true
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ id: `empty-end-${cells.length}`, isCurrentMonth: false });
    }

    return {
      title: monthCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      prevMonth: new Date(year, month - 1, 1),
      nextMonth: new Date(year, month + 1, 1),
      cells
    };
  }, [monthCursor]);

  return (
    <section className="calendar-card" aria-label="Submission Calendar">
      <div className="calendar-head">
        <h3>Calendar</h3>
      </div>

      <div className="calendar-actions">
        <select
          className="calendar-course-select"
          value={activeCourse}
          onChange={(event) => setActiveCourse(event.target.value)}
          aria-label="Filter by course"
        >
          {courses.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
        <button type="button" className="calendar-add-btn">New event</button>
      </div>

      <div className="calendar-month-head">
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setMonthCursor(monthMeta.prevMonth)}
        >
          &lt; {monthMeta.prevMonth.toLocaleDateString('en-US', { month: 'long' })}
        </button>
        <h4>{monthMeta.title}</h4>
        <button
          type="button"
          className="calendar-nav-btn"
          onClick={() => setMonthCursor(monthMeta.nextMonth)}
        >
          {monthMeta.nextMonth.toLocaleDateString('en-US', { month: 'long' })} &gt;
        </button>
      </div>

      <div className="calendar-grid" role="table" aria-label="Monthly event calendar">
        {dayLabels.map((label) => (
          <div key={label} className="calendar-weekday" role="columnheader">
            {label}
          </div>
        ))}

        {monthMeta.cells.map((cell) => {
          if (!cell.isCurrentMonth) {
            return <div key={cell.id} className="calendar-cell empty" role="cell" aria-hidden="true" />;
          }

          const dayEvents = eventsByDay[cell.dateKey] || [];
          const visibleEvents = dayEvents.slice(0, 2);
          const hiddenCount = Math.max(0, dayEvents.length - visibleEvents.length);

          return (
            <div key={cell.id} className="calendar-cell" role="cell">
              <span className="calendar-day-number">{cell.day}</span>
              {visibleEvents.map((event) => (
                <p key={event.id} className={`calendar-event ${event.type}`} title={`${event.title} (${event.course})`}>
                  {event.title}
                </p>
              ))}
              {hiddenCount > 0 ? (
                <p className="calendar-more">{hiddenCount} more</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="calendar-footer-link">Full calendar</div>
    </section>
  );
}

export default SubmissionCalendar;