import { useEffect, useMemo, useState } from 'react';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function SubmissionCalendar({
  events,
  title = 'Calendar',
  canCreateEvents = false,
  canExtendDeadlines = false
}) {
  const [calendarEvents, setCalendarEvents] = useState(events);
  const [activeCourse, setActiveCourse] = useState('All courses');
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    course: 'All courses',
    type: 'assignment',
    date: toLocalDateKey(new Date())
  });

  useEffect(() => {
    setCalendarEvents(events);
  }, [events]);

  const courses = useMemo(() => {
    const uniqueCourses = Array.from(new Set(calendarEvents.map((event) => event.course)));
    return ['All courses', ...uniqueCourses.filter((course) => course !== 'All courses')];
  }, [calendarEvents]);

  const filteredEvents = useMemo(() => {
    if (activeCourse === 'All courses') {
      return calendarEvents;
    }
    return calendarEvents.filter((event) => event.course === activeCourse || event.course === 'All courses');
  }, [activeCourse, calendarEvents]);

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

  const handleCreateEvent = (event) => {
    event.preventDefault();
    if (!newEvent.title.trim()) {
      return;
    }

    setCalendarEvents((previousEvents) => [
      ...previousEvents,
      {
        id: `SUB-${previousEvents.length + 1}-${Date.now()}`,
        title: newEvent.title.trim(),
        course: newEvent.course,
        type: newEvent.type,
        date: newEvent.date
      }
    ]);

    setIsCreateOpen(false);
    setNewEvent({
      title: '',
      course: activeCourse === 'All courses' ? 'All courses' : activeCourse,
      type: 'assignment',
      date: toLocalDateKey(monthCursor)
    });
  };

  const handleExtendEvent = (eventId, days = 1) => {
    setCalendarEvents((previousEvents) => previousEvents.map((event) => {
      if (event.id !== eventId) {
        return event;
      }

      const nextDate = fromDateKey(event.date);
      nextDate.setDate(nextDate.getDate() + days);

      return {
        ...event,
        date: toLocalDateKey(nextDate)
      };
    }));
  };

  return (
    <section className="calendar-card" aria-label="Submission Calendar">
      <div className="calendar-head">
        <h3>{title}</h3>
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
        {canCreateEvents ? (
          <button type="button" className="calendar-add-btn" onClick={() => setIsCreateOpen((prev) => !prev)}>
            {isCreateOpen ? 'Close' : 'New event'}
          </button>
        ) : null}
      </div>

      {canCreateEvents && isCreateOpen ? (
        <form className="calendar-create-form" onSubmit={handleCreateEvent}>
          <input
            type="text"
            placeholder="Event title"
            value={newEvent.title}
            onChange={(event) => setNewEvent((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <select
            value={newEvent.course}
            onChange={(event) => setNewEvent((prev) => ({ ...prev, course: event.target.value }))}
          >
            {courses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
          <select
            value={newEvent.type}
            onChange={(event) => setNewEvent((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value="assignment">Assignment</option>
            <option value="quiz">Quiz</option>
            <option value="exam">Exam</option>
            <option value="deadline">Deadline</option>
          </select>
          <input
            type="date"
            value={newEvent.date}
            onChange={(event) => setNewEvent((prev) => ({ ...prev, date: event.target.value }))}
          />
          <button type="submit" className="calendar-add-btn">Save</button>
        </form>
      ) : null}

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
                <div key={event.id} className="calendar-event-row">
                  <p className={`calendar-event ${event.type}`} title={`${event.title} (${event.course})`}>
                    {event.title}
                  </p>
                  {canExtendDeadlines ? (
                    <button
                      type="button"
                      className="calendar-extend-btn"
                      onClick={() => handleExtendEvent(event.id, 1)}
                    >
                      Extend +1 day
                    </button>
                  ) : null}
                </div>
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