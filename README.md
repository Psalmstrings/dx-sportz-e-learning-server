# DX FOOTBALL ACADEMY — E-LEARNING BACKEND & LMS PORTAL

Production-ready Football Academy LMS Backend for DX SPORTS (`https://dxsportz.com`).
Completely isolated backend running on port `5001` (or production microservice domain).

---

## Architecture Overview

```text
PROJECT ROOT/
│
├── frontend/                     # SHARED CLIENT SPA (Vite + React 19)
│   ├── src/academy/              # Football Academy LMS Pages & Components
│   └── src/components/           # Football News, Live Scores, Tables, Media
│
├── backendd/                     # EXISTING FOOTBALL API (Port 5000)
│   └── (Untouched, independent)
│
└── e-learning-backend/           # E-LEARNING LMS BACKEND (Port 5001)
    ├── config/db.js              # MongoDB Atlas connection (dx_elearning_academy)
    ├── controllers/              # Auth, Programs, Modules, Lessons, Applications,
    │                             # Enrollments, Progress, Certificates, Admin, Settings
    ├── models/                   # 11 Mongoose Schemas & Indexes
    ├── middleware/               # JWT guard, Role check, Enrollment access check, Multer
    ├── services/                 # EmailService, CertificatePDFService, CronService
    ├── routes/                   # Clean RESTful API Endpoints
    ├── utils/                    # ID Generators (APP-YYYY-NNNNNN, FA-YYYY-NNNNNN)
    ├── scripts/                  # seedAdmin.js (Seeds admin, programs, syllabus, bank settings)
    ├── uploads/                  # Secure receipts/, materials/, certificates/
    ├── server.js                 # Express app, Helmet, CORS, Rate-Limiting, Port 5001
    └── package.json
```

---

## 1. Environment Configuration (`.env`)

```env
PORT=5001
NODE_ENV=development

# Dedicated MongoDB Atlas Database for Academy
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.hdd0tzz.mongodb.net/dx_elearning_academy?appName=Cluster0

# Authentication
JWT_SECRET=your_super_secret_jwt_key_2026
JWT_EXPIRES_IN=7d

# Frontend & Certificate Verification URLs
FRONTEND_URL=http://localhost:3000
CERTIFICATE_BASE_URL=http://localhost:3000/academy/verify-certificate

# Academy Identity
ACADEMY_NAME=DX Football Academy
ACADEMY_EMAIL=academy@dxsportz.com

# Email / SMTP Configuration (Optional - logs to console if omitted)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM="DX Football Academy" <academy@dxsportz.com>

# Bank Payment Details (Also editable via Admin Settings UI)
BANK_NAME=Zenith Bank
ACCOUNT_NAME=DX SPORTS ACADEMY LTD
ACCOUNT_NUMBER=1234567890
PAYMENT_INSTRUCTIONS=Make a direct bank transfer of the program tuition fee to the account details above. After transfer, upload your payment receipt/screenshot and transaction reference number below for instant administrative verification.
```

---

## 2. Installation & Quick Start

```bash
# Navigate to e-learning backend
cd e-learning-backend

# Install dependencies
npm install

# Seed default administrator, initial accredited programs, and modules
node scripts/seedAdmin.js

# Start backend in development mode
npm run dev

# Or in production
npm start
```

Default seeded credentials:
- **Admin**: `admin@dxsport.com` / `admin123`
- **Technical Director**: `academy.admin@dxsportz.com` / `academy123`

---

## 3. Core Business Rules

1. **Material Protection**: Private course lessons & files cannot be downloaded directly via static URLs. They are routed through `/api/lessons/:id/material`, which checks for active, non-expired enrollment.
2. **30-Day Access Period**: When an application is approved, course access is granted for exactly 30 days calculated using server-side time.
3. **No Auto-Certificates**: When a student reaches 100% completion across all required modules, their status transitions to `Ready for Certification`. The academy board administrator must officially review and authorize the diploma before a certificate is generated.
4. **Professional Landscape PDF**: Certificates are rendered dynamically with PDFKit using official DX Sports branding, digital signatures, unique serial numbers (`FA-2026-000001`), and embedded high-density QR verification codes.
5. **Public QR Verification**: Any scout, club, or employer can scan the certificate QR or visit `/verify-certificate/:certificateId` to inspect the valid credential without logging in.

---

## 4. API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register student account
- `POST /api/auth/login` — Login student or admin (returns JWT)
- `POST /api/auth/verify-email` — Verify email token
- `POST /api/auth/forgot-password` — Request password reset
- `POST /api/auth/reset-password` — Complete password reset
- `GET  /api/auth/me` — Current authenticated user profile
- `PUT  /api/auth/profile` — Update coach profile

### Programs & Curriculum (`/api/programs`, `/api/modules`, `/api/lessons`)
- `GET  /api/programs` — Public catalog (Beginner, Intermediate, Professional)
- `GET  /api/programs/:slug` — Full syllabus & modules breakdown
- `GET  /api/lessons/:id` — Protected lesson content (checks active enrollment)
- `GET  /api/lessons/:id/material` — Protected downloadable course notes/PDFs

### Applications & Payments (`/api/applications`)
- `POST /api/applications/apply` — Apply for a program (`APP-YYYY-NNNNNN`)
- `POST /api/applications/:id/upload-receipt` — Upload bank payment evidence
- `GET  /api/applications/my` — Student application history
- `GET  /api/applications/admin/all` — Admin view with filters
- `PATCH /api/applications/admin/:id/approve` — Admin approves & creates 30-day enrollment
- `PATCH /api/applications/admin/:id/reject` — Admin rejects with reason

### Enrollments & Learning (`/api/enrollments`, `/api/progress`)
- `GET  /api/enrollments/my` — Active courses with 30-day countdown
- `GET  /api/enrollments/learn/:programSlug` — Interactive course reader data
- `POST /api/progress/toggle` — Mark lesson complete & calculate percentage
- `PATCH /api/enrollments/admin/:id/extend` — Extend course access (+7, +14, +30 days)

### Certificates (`/api/certificates`)
- `GET  /api/certificates/my` — Student's issued diplomas
- `GET  /api/certificates/verify/:certificateId` — **PUBLIC** QR verification
- `GET  /api/certificates/:id/download` — Download official landscape PDF
- `POST /api/certificates/admin/approve/:enrollmentId` — Authorize & generate certificate
- `POST /api/certificates/admin/:id/regenerate` — Regenerate PDF with updated details
- `POST /api/certificates/admin/:id/resend-email` — Resend diploma with PDF attachment

### Settings & Admin Portal (`/api/settings`, `/api/admin`)
- `GET  /api/settings/public` — Public Zenith Bank details & academy info
- `PUT  /api/settings/admin` — Update bank details & signatories
- `GET  /api/admin/dashboard-stats` — Overview metrics & audit logs
- `GET  /api/admin/students` — Student directory with search

---

## 5. Deployment on Render.com

Deploy as a new independent **Web Service**:
1. Connect Git repository.
2. Root Directory: `e-learning-backend`
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Add Environment Variables from `.env.example`.
