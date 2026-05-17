# Clinic Management MVP Plan (Execution Tracker)

## Current Focus

Backend complete, frontend implementation in progress using React + Vite + TypeScript.

Current status: Frontend work started.

---

## Scope

### In Scope (MVP)

- Auth: login + me
- Patients: list, get by id, create, update, soft delete
- Doctors: list, get by id, create, update, soft delete
- Appointments: list with filters, get by id, create, update, update status, cancel
- Dashboard summary: today stats + today schedule

### Out of Scope (Now)

- Patient/doctor portals
- Payments and prescriptions
- Complex RBAC and multi-tenancy
- Real-time updates
- Advanced reporting

---

## Backend Architecture

```txt
backend/
  prisma/
    schema.prisma
    seed.ts

  src/
    app.ts
    server.ts

    config/
      env.ts

    db/
      prisma.ts

    middleware/
      auth.middleware.ts
      error.middleware.ts
      validate.middleware.ts

    utils/
      ApiError.ts
      asyncHandler.ts
      jwt.ts
      password.ts

    modules/
      auth/
      patients/
      doctors/
      appointments/
      dashboard/
```

---

## API Contract (MVP)

### Auth

- POST /api/auth/login
- GET /api/auth/me

### Patients

- GET /api/patients
- GET /api/patients/:id
- POST /api/patients
- PATCH /api/patients/:id
- DELETE /api/patients/:id (soft delete)

### Doctors

- GET /api/doctors
- GET /api/doctors/:id
- POST /api/doctors
- PATCH /api/doctors/:id
- DELETE /api/doctors/:id (soft delete)

### Appointments

- GET /api/appointments
- GET /api/appointments/:id
- POST /api/appointments
- PATCH /api/appointments/:id
- PATCH /api/appointments/:id/status
- DELETE /api/appointments/:id

Filters:

- ?date=YYYY-MM-DD
- ?status=SCHEDULED|WAITING|COMPLETED|CANCELLED|NO_SHOW
- ?doctorId=
- ?patientId=

### Dashboard

- GET /api/dashboard/summary
- GET /api/dashboard/today-schedule

---

## Implementation Rules

- Controllers: request/response only.
- Services: business logic only.
- Validation: Zod for body, params, query.
- Error handling: one global middleware.
- Response shape:

```json
{
  "success": true,
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "message": "Human readable error"
}
```

---

## Milestones

### M1: Backend Foundation

- [x] Plan revised into executable backend-first tracker
- [x] Initialize backend package + TypeScript config
- [x] Add Express app bootstrap
- [x] Add env loader + Prisma client singleton
- [x] Add shared error handling + validation middleware

### M2: Data Layer

- [x] Add Prisma schema (User, Doctor, Patient, Appointment)
- [x] Run initial migration
- [x] Add seed script with realistic demo data

### M3: Auth Module

- [x] Login endpoint with bcrypt + JWT
- [x] Me endpoint via auth middleware

### M4: Core CRUD Modules

- [x] Patients module
- [x] Doctors module
- [x] Appointments module (+ conflict check per doctor/time)

### M5: Dashboard

- [x] Summary endpoint
- [x] Today schedule endpoint

### M6: Frontend Foundation

- [x] Initialize frontend app (Vite + React + TypeScript)
- [x] Add app providers and router
- [x] Add auth flow (login + token persistence)
- [x] Add protected layout and navigation

### M7: Frontend Core Pages

- [x] Dashboard page wired to backend summary and today schedule
- [x] Patients page with list and create form
- [x] Doctors page with list
- [x] Appointments page with list and filters

---

## Immediate Next Steps (In Progress)

1. Add mutations for doctor and appointment creation.
2. Add status update actions on appointments table.
3. Improve UX with loaders, toasts, and empty states.
4. Prepare frontend deployment environment variables.
