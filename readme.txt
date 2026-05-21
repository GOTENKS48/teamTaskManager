TaskFlow — Team Task Manager
==================================

A full-stack web application for team project management with role-based access control. 
Create projects, assign tasks, and track progress with an intuitive Kanban board.

--------------------------------------------------------------------------------
NOTE REGARDING DEPLOYMENT:
The original assignment specifications requested deployment on Railway. However, 
I was unable to upload this project to Railway because my free trial has expired.
Instead, the project has been fully configured and successfully deployed on Render 
(which handles both the PostgreSQL database and the Node.js/Express backend).
--------------------------------------------------------------------------------

FEATURES
--------
Authentication:
- User signup & login with JWT tokens
- Secure password hashing with bcrypt
- Forgot Password / Reset Password flow with secure tokens

Project Management:
- Create, update, and delete projects
- Invite team members by email
- Per-project role-based access control (Admin / Member)

Task Management:
- Create, assign, and track tasks (Multiple assignees supported)
- Kanban board with 3 columns (To Do -> In Progress -> Done)
- Priority levels (Low / Medium / High)
- Due date tracking with overdue detection
- Admin: Full CRUD on all tasks
- Member: Can only update status on tasks assigned to them

Dashboard:
- Overview stats (Global Tasks/Completion % vs Personal Tasks/Completion %)
- Overdue tasks alert table
- Recent activity feed

TECH STACK
----------
- Backend: Node.js, Express.js
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT + bcrypt
- Frontend: Vanilla HTML/CSS/JS

LOCAL SETUP INSTRUCTIONS
------------------------
1. Install Node.js 18+ and PostgreSQL
2. Clone the repository
3. Run `npm install`
4. Copy `.env.example` to `.env` and set your `DATABASE_URL` and `JWT_SECRET`
5. Run `npx prisma db push` to initialize the database schema
6. Run `npm run dev` to start the server
7. Open http://localhost:3000 in your browser
