# Student Project Manager

This project is organized in a clean, beginner-friendly way so each part has a clear purpose.

## Folder Structure

```text
student-project-manager/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── assets/
│   │   ├── logo.png
│   │   └── cover.png
│   ├── components/
│   │   ├── Sidebar.js
│   │   ├── Navbar.js
│   │   ├── Card.js
│   │   └── PrivateRoute.js
│   ├── pages/
│   │   ├── Login.js
│   │   ├── Signup.js
│   │   ├── AdminDashboard.js
│   │   ├── TeacherDashboard.js
│   │   ├── StudentDashboard.js
│   │   ├── AssignTasks.js
│   │   ├── UploadFiles.js
│   │   └── Progress.js
│   ├── context/
│   │   └── AuthContext.js
│   ├── services/
│   │   └── authService.js
│   ├── styles/
│   │   ├── dashboard.css
│   │   └── auth.css
│   ├── App.js
│   ├── index.js
│   └── routes.js
├── package.json
└── README.md
```

## Demo Login Accounts

- Admin: `admin@school.com` / `admin123`
- Teacher: `teacher@school.com` / `teacher123`
- Student: `student@school.com` / `student123`

## Available Scripts

- `npm start` - Runs app in development mode
- `npm test` - Runs tests
- `npm run build` - Creates production build

## MySQL Workbench Connection Setup

1. Install dependencies:
`npm install`

2. Create `.env` from `.env.example` and set your MySQL credentials.

3. In MySQL Workbench, run:
`server/sql/init.sql`

4. Start backend API server:
`npm run server`

5. Start frontend in another terminal:
`npm start`

6. Verify backend + database health:
`http://localhost:5000/api/health`

When admin creates a new user, the project now also attempts to persist that user in MySQL via the backend API.
