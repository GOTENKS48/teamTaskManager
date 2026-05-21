# 📋 TaskFlow — Team Task Manager

A full-stack web application for team project management with role-based access control. Create projects, assign tasks, and track progress with an intuitive Kanban board.

> **Live Demo:** [https://teamtaskmanager-ubgr.onrender.com/](https://teamtaskmanager-ubgr.onrender.com/)

---

## 🚀 Features

### Authentication
- User signup & login with JWT tokens
- Secure password hashing with bcrypt
- Protected routes with token verification

### Project Management
- Create, update, and delete projects
- Invite team members by email
- Per-project role-based access control (Admin / Member)

### Task Management
- Create, assign, and track tasks
- Kanban board with 3 columns (To Do → In Progress → Done)
- Priority levels (Low / Medium / High)
- Due date tracking with overdue detection
- **Admin:** Full CRUD on all tasks
- **Member:** Can only update status on tasks assigned to them

### Dashboard
- Overview stats (projects, tasks, completion %)
- Overdue tasks alert table
- Recent activity feed
- Quick navigation to projects

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Frontend | Vanilla HTML/CSS/JS |
| Deployment | Render |

---

## 📁 Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema (4 models, 3 enums)
├── public/
│   ├── css/style.css           # Dark theme design system
│   ├── js/
│   │   ├── api.js              # Fetch wrapper with JWT
│   │   ├── auth.js             # Login/signup logic
│   │   ├── dashboard.js        # Dashboard rendering
│   │   ├── project.js          # Kanban board & task CRUD
│   │   └── utils.js            # Toasts, date formatting, helpers
│   ├── index.html              # Auth page
│   ├── dashboard.html          # Dashboard
│   └── project.html            # Project detail + Kanban board
├── src/
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   ├── projectRole.js      # RBAC enforcement
│   │   └── errorHandler.js     # Centralized error handling
│   ├── routes/
│   │   ├── auth.js             # Signup, login, me
│   │   ├── projects.js         # Project CRUD
│   │   ├── members.js          # Team member management
│   │   ├── tasks.js            # Task CRUD + status updates
│   │   └── dashboard.js        # Aggregated stats
│   ├── validators/             # express-validator chains
│   ├── utils/apiResponse.js    # Consistent response format
│   ├── config.js               # Environment config
│   └── index.js                # Express entry point
├── .env.example
├── Procfile                    # Railway deployment
└── package.json
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user profile |

### Projects
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/api/projects` | ✅ | Any |
| GET | `/api/projects` | ✅ | Any |
| GET | `/api/projects/:id` | ✅ | Member |
| PUT | `/api/projects/:id` | ✅ | Admin |
| DELETE | `/api/projects/:id` | ✅ | Admin |

### Members
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/api/projects/:id/members` | ✅ | Admin |
| GET | `/api/projects/:id/members` | ✅ | Member |
| PUT | `/api/projects/:id/members/:userId` | ✅ | Admin |
| DELETE | `/api/projects/:id/members/:userId` | ✅ | Admin |

### Tasks
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| POST | `/api/projects/:id/tasks` | ✅ | Admin |
| GET | `/api/projects/:id/tasks` | ✅ | Member |
| PUT | `/api/projects/:id/tasks/:taskId` | ✅ | Admin* |
| DELETE | `/api/projects/:id/tasks/:taskId` | ✅ | Admin |

> *Members can update task **status** only for tasks assigned to them.

### Dashboard
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/dashboard` | ✅ |

---

## 🛠️ Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL (or use SQLite for local dev)

### Steps

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd team-task-manager

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your database URL and JWT secret

# 4. Run migrations
npx prisma migrate dev

# 5. Generate Prisma client
npx prisma generate

# 6. Start dev server
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 🚢 Render Deployment

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → **Dashboard** → **New PostgreSQL** to create a database instance.
3. Copy the internal database URL provided by Render.
4. Go to **New Web Service** → **Build and deploy from a Git repository**.
5. Connect your GitHub repository.
6. Configure the following build/start commands:
   - **Build Command:** `npm install && npx prisma generate && npx prisma db push --accept-data-loss`
   - **Start Command:** `npm start`
7. Add the following **Environment Variables**:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `JWT_SECRET` — a strong random secret
8. Deploy — Render will automatically build the app and run the database migrations on startup.

---

## 🎨 Design

- **Dark theme** with glassmorphism effects
- **Inter** font from Google Fonts
- Responsive layout (mobile-friendly)
- Smooth animations and transitions
- Toast notifications for user feedback
- Kanban board with task cards
- Color-coded priority and status badges

---

## 👥 Role-Based Access Control

| Action | Admin | Member |
|--------|-------|--------|
| Create project | ✅ | ✅ |
| Edit/delete project | ✅ | ❌ |
| Add/remove members | ✅ | ❌ |
| Create tasks | ✅ | ❌ |
| Edit/delete tasks | ✅ | ❌ |
| Update own task status | ✅ | ✅ |
| View tasks & board | ✅ | ✅ |

---

## 📄 License

ISC
