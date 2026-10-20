# Store Rating Application

A full-stack store rating platform built with **React + Vite** (frontend) and
**Express + MySQL** (backend), featuring JWT authentication, bcrypt password
hashing, role-based authorization and responsive CSS.

## Features

| Role | Capabilities |
| --- | --- |
| **USER** | Sign up, log in, browse and search stores, submit or update a 1-5 rating, review their own rating history |
| **OWNER** | Everything a user can do, plus create and delete their own stores and view the reviews left on them |
| **ADMIN** | Dashboard totals, full user management (search, filter, sort, paginate, create, change role, delete), and oversight of every store |

## Tech stack

- **Backend** — Node.js 18+, Express 4, MySQL 8 (via `mysql2`), `jsonwebtoken`,
  `bcryptjs`, `express-validator`
- **Frontend** — React 18, Vite 5, React Router 6, plain responsive CSS

## Project structure

```
store-rating-app/
├── backend/
│   ├── config/db.js            # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   ├── optionalAuth.js     # JWT verification that never blocks
│   │   ├── verifyRoles.js      # Role guard
│   │   ├── validate.js         # express-validator result checker
│   │   └── errorHandler.js     # Centralised error handling
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── stores.routes.js
│   │   ├── ratings.routes.js
│   │   ├── admin.routes.js
│   │   └── owner.routes.js
│   ├── utils/                  # AppError, asyncHandler, validateBody
│   ├── schema.sql              # Database schema
│   ├── seedAdmin.js            # Creates the DB, applies the schema, seeds an admin
│   └── server.js
└── frontend/
    ├── src/
    │   ├── api.js              # Fetch wrapper + endpoint helpers
    │   ├── context/AuthContext.jsx
    │   ├── components/         # Navbar, StarRating, StoreCard, Pagination, Modal…
    │   ├── pages/              # Home, Login, Signup, StoreList, StoreDetail,
    │   │                       # MyRatings, OwnerDashboard, AdminDashboard
    │   └── styles/global.css   # Responsive stylesheet
    └── vite.config.js          # Dev server + /api proxy
```

## Getting started

### 1. MySQL

Either use an existing MySQL server, or start one with Docker:

```bash
docker run -d --name store-rating-mysql \
  -e MYSQL_ROOT_PASSWORD=rootpass -e MYSQL_DATABASE=store_rating \
  -p 3306:3306 mysql:8.0
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env      # then edit the values
npm run seed              # creates the DB, applies schema.sql, seeds an admin
npm run dev               # http://localhost:5000
```

`.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=rootpass
DB_NAME=store_rating
JWT_SECRET=store-rating-dev-secret-change-me
JWT_EXPIRES_IN=7d
PORT=5000
```

The seeded administrator is `admin@example.com` / `Admin@123` (configurable via
`ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME`).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxies `/api` to `http://localhost:5000`, so no CORS configuration is
needed in development.

## API reference

### Public

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/signup` | Register (role is always `USER`) |
| `POST` | `/api/auth/login` | Log in, returns a JWT |
| `GET` | `/api/stores` | List stores — `search`, `sortBy`, `sortOrder`, `page`, `limit` |
| `GET` | `/api/stores/:id` | Store details with average rating |

### Authenticated

| Method | Endpoint | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/api/auth/me` | any | Current user profile |
| `PUT` | `/api/auth/password` | any | Change password (requires current password) |
| `POST` | `/api/stores` | ADMIN, OWNER | Create a store |
| `PUT` | `/api/stores/:id` | ADMIN, OWNER | Update a store |
| `DELETE` | `/api/stores/:id` | ADMIN, OWNER | Delete a store |
| `POST` | `/api/stores/:id/ratings` | any | Submit or update a rating (1-5) |
| `GET` | `/api/stores/:id/ratings` | any | List the reviews on a store |

### Owner

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/owner/dashboard` | Store count, total ratings, average rating |
| `GET` | `/api/owner/stores` | Stores owned by the signed-in owner |
| `GET` | `/api/owner/stores/:id/ratings` | Reviews on one of the owner's stores |

### Admin

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/admin/dashboard` | Platform totals and users-by-role |
| `GET` | `/api/admin/users` | List users — `search`, `role`, `sortBy`, `sortOrder`, `page`, `limit` |
| `GET` | `/api/admin/users/:id` | A single user (never includes `password_hash`) |
| `POST` | `/api/admin/users` | Create a user with any role |
| `PUT` | `/api/admin/users/:id` | Update a user, including their role |
| `DELETE` | `/api/admin/users/:id` | Delete a user |
| `GET` | `/api/admin/stores` | List all stores with owner and rating data |

## Notes

- Passwords are hashed with bcrypt (10 rounds) and never returned by any endpoint.
- Passwords must be 8-16 characters with at least one uppercase letter and one symbol.
- One rating per user per store, enforced by a `UNIQUE(user_id, store_id)` constraint
  and an `ON DUPLICATE KEY UPDATE` upsert.
- The backend uses **CommonJS** consistently. The frontend uses **ES modules**,
  which is the Vite default.