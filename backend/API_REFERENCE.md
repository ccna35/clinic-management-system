# Backend API Reference

Base URL: http://localhost:5000

## Auth

### POST /api/auth/login

Request body:

```json
{
  "email": "reception@clinic.com",
  "password": "password123"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "token": "<jwt>"
  }
}
```

### GET /api/auth/me

Headers:

```txt
Authorization: Bearer <jwt>
```

---

## Dashboard

### GET /api/dashboard/summary

Headers:

```txt
Authorization: Bearer <jwt>
```

Response:

```json
{
  "success": true,
  "data": {
    "todayAppointments": 0,
    "waitingPatients": 0,
    "completedVisits": 0,
    "cancelledOrNoShows": 0,
    "averageActualWaitMinutes": null,
    "avgWaitSampleSize": 0
  }
}
```

### GET /api/dashboard/today-schedule

Headers:

```txt
Authorization: Bearer <jwt>
```

---

## Patients

### GET /api/patients

Query params:

```txt
page (default 1)
limit (default 10)
search (optional)
status (ACTIVE | INACTIVE)
```

### GET /api/patients/:id

### POST /api/patients

### PATCH /api/patients/:id

### DELETE /api/patients/:id

Delete is soft delete (sets status to INACTIVE).

---

## Doctors

### GET /api/doctors

Query params:

```txt
page (default 1)
limit (default 10)
search (optional)
isActive (true | false)
```

### GET /api/doctors/:id

### POST /api/doctors

### PATCH /api/doctors/:id

### DELETE /api/doctors/:id

Delete is soft delete (sets isActive to false).

---

## Appointments

### GET /api/appointments

Query params:

```txt
page (default 1)
limit (default 10)
date (YYYY-MM-DD)
dateFrom (YYYY-MM-DD)
dateTo (YYYY-MM-DD)
status (SCHEDULED | WAITING | IN_PROGRESS | COMPLETED | CANCELLED | NO_SHOW)
doctorId (uuid)
patientId (uuid)
```

Appointments now include these timing fields in responses:

```txt
checkedInAt (ISO datetime | null)
inProgressAt (ISO datetime | null)
completedAt (ISO datetime | null)
actualWaitMinutes (number | null)
liveWaitMinutes (number | null)
```

### GET /api/appointments/:id

### POST /api/appointments

### PATCH /api/appointments/:id

### PATCH /api/appointments/:id/status

### DELETE /api/appointments/:id

Rules:

- Patient must exist and be ACTIVE.
- Doctor must exist and be active.
- Conflict prevention: doctor cannot have another SCHEDULED or WAITING appointment at the exact same datetime.
- Terminal appointments (COMPLETED, CANCELLED, NO_SHOW) are locked against date rescheduling.
- Status transitions are enforced as:
  - SCHEDULED -> WAITING | CANCELLED | NO_SHOW
  - WAITING -> IN_PROGRESS | CANCELLED | NO_SHOW
  - IN_PROGRESS -> COMPLETED | CANCELLED
  - COMPLETED, CANCELLED, NO_SHOW are terminal states.

---

## Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Human readable error"
}
```
