# Current Architecture - QR-ATT (Before Migration)

> **Purpose:** This document captures the complete state of the application before any Supabase migration. It is the known-good baseline for comparing old and new code during each migration step.

---

## 1. Application Overview

**QR-ATT** is a React Native mobile application for recording school event attendance by scanning QR codes.

**Core workflow:**

1. A teacher creates an event with a title, code, start time, and end time.
2. The app generates a QR code containing the event details.
3. A student scans the QR code with the phone camera.
4. The app validates the QR payload and records attendance in local SQLite.
5. The student views attendance history.

**Current limitations:**

- Single hardcoded user: `STUDENT-2026-001`
- No authentication or login
- Data is stored locally on one device
- No cloud sync or multi-device support
- No teacher/student role distinction
- No Row Level Security
- No backend server

---

## 2. Current Technology Stack

| Category | Package |
|---|---|
| Framework | Expo SDK 57 |
| UI | React 19.2.3 |
| Mobile | React Native 0.86.3 |
| Language | TypeScript 6.0.3 |
| Routing | Expo Router 57 |
| Camera | expo-camera |
| Database | expo-sqlite |
| QR generation | react-native-qrcode-svg |
| QR support | react-native-svg |
| Date picker | @react-native-community/datetimepicker |
| Supabase client | @supabase/supabase-js |
| Animations | react-native-reanimated |
| Web | react-native-web |

**Build tooling:**

- EAS preview profile builds an installable APK.
- EAS production profile builds an Android App Bundle.
- Android package: `com.anonymous.QRTT_APP`

---

## 3. Current File Structure

```text
QRTT_APP/
├── src/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── +not-found.tsx
│   │   └── (tabs)/
│   │       ├── _layout.tsx
│   │       ├── index.tsx
│   │       ├── teachers.tsx
│   │       ├── history.tsx
│   │       ├── about.tsx
│   │       └── scan.tsx
│   ├── components/
│   │   ├── AppButton.tsx
│   │   └── ScanScreen.tsx
│   ├── constants/
│   │   ├── colors.ts
│   │   └── student.ts
│   └── lib/
│       ├── database.ts
│       └── supabase.ts
├── assets/
├── docs/
├── app.json
├── eas.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── .env
├── .env.example
└── .gitignore
```

---

## 4. Navigation Structure

The root layout contains one stack with the grouped tab layout:

```text
Stack
└── Screen "(tabs)" [headerShown: false]
```

The current tab implementation has Home, Teachers, About, and History. Home and Teachers provide the student scanner and teacher QR generator respectively. The app also contains the reusable `scan.tsx` route.

All tabs are currently accessible without authentication or role checks.

---

## 5. Current Data and Identity Model

The current student identity is hardcoded in `src/constants/student.ts`:

```ts
export const STUDENT_ID = 'STUDENT-2026-001';
```

There is no login, registration, session management, profile, or role authorization. Supabase client configuration exists in `src/lib/supabase.ts`, but the attendance workflow still uses local SQLite in `src/lib/database.ts`.

---

## 6. Current Database Architecture

**Engine:** expo-sqlite

**Database:** `qrtt.db`

The local database creates these tables:

```sql
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  student_id TEXT NOT NULL,
  scanned_at TEXT NOT NULL,
  UNIQUE(event_id, student_id)
);
```

The database layer currently exports:

- `createEvent(event)` to save or replace teacher events.
- `registerAttendance(rawPayload, studentId)` to validate the QR, enforce the event time window, prevent duplicates, and save attendance.
- `getAttendanceHistory(studentId)` to query attendance and join event titles.

---

## 7. QR Payload Contract

Teacher-generated codes use this versioned flat payload:

```json
{
  "v": 1,
  "event": "EVT-2026-0001",
  "title": "Founders Day Assembly",
  "start": "2026-09-03T09:00:00",
  "end": "2026-09-03T11:00:00"
}
```

The scanner validates the version and event fields, checks the start/end time window, then records attendance. Duplicate attendance is rejected by the local database constraint.

---

## 8. Current Supabase Setup

The project has the Supabase JavaScript client installed and a gitignored `.env` containing the public project URL and publishable key. The safe template is `.env.example`.

The Supabase CLI is installed locally as a dev dependency and is run with `npx supabase`. The project has been initialized with `supabase/config.toml` and linked to the remote project.

Supabase is not yet the source of truth for attendance. The migration should happen in later phases only after the schema, authentication, profiles, and Row Level Security policies are designed.

Never place a `sb_secret_...` key in the Expo app.

---

## 9. EAS Build Configuration

`eas.json` contains three profiles:

- `development`: internal development client.
- `preview`: internal Android APK for device testing.
- `production`: Android App Bundle for Google Play submission.

The Android package ID is `com.anonymous.QRTT_APP`. Native plugins currently include Expo Camera, Expo SQLite, and the native date/time picker.

---

## 10. Security and Authorization Baseline

There is currently no authentication or authorization:

- No login or registration
- No user accounts
- No sessions or tokens
- No student, teacher, or admin roles
- No access-control rules
- No Row Level Security

The local app is therefore a single-user prototype. This is acceptable for the baseline but must be replaced before multi-user cloud data is introduced.

---

## 11. Migration Replacements

| Current | Future replacement | Reason |
|---|---|---|
| expo-sqlite | Supabase PostgreSQL | Cloud persistence |
| local database module | Supabase service modules | Centralized data access |
| hardcoded STUDENT_ID | Supabase Auth user ID | Multi-user support |
| local-only data | Cloud-synced data | Multi-device support |
| unrestricted tabs | Auth and role guards | Authorization |

Future service modules may include:

```text
src/lib/
├── supabase.ts
├── auth.ts
├── profiles.ts
├── events.ts
└── attendance.ts
```

---

## 12. Target PostgreSQL Schema

The planned cloud schema is:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  student_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  course TEXT,
  year_level TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  start TIMESTAMPTZ NOT NULL,
  end TIMESTAMPTZ NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) NOT NULL,
  event_id UUID REFERENCES events(id) NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, event_id)
);
```

This schema must be reviewed and protected with Row Level Security before production use.

---

## 13. Migration Roadmap

| Phase | Goal |
|---|---|
| 0 | Baseline architecture and build configuration |
| 1 | Supabase project and environment setup |
| 2 | Authentication |
| 3 | PostgreSQL schema |
| 4 | User profiles |
| 5 | Row Level Security |
| 6 | Cloud events |
| 7 | QR generation with cloud events |
| 8 | Cloud attendance |
| 9 | Cloud attendance history |
| 10 | Teacher role and route protection |
| 11 | Profile screen |
| 12 | Error handling and offline behavior |
| 13 | Tests and final cleanup |
| 14 | Remove SQLite after migration is verified |

---

## 14. Baseline Testing Checklist

Before starting the next migration phase, verify:

- [ ] App starts without errors.
- [ ] EAS preview configuration resolves to an APK.
- [ ] Home scanner requests camera permission.
- [ ] Teacher event form creates a QR code.
- [ ] The QR code is scannable.
- [ ] Attendance is recorded locally.
- [ ] Duplicate scans are rejected.
- [ ] History lists attendance records.
- [ ] Unknown routes show the not-found screen.
- [ ] Supabase client configuration is present but does not expose a secret key.

---

*This is the Phase 0 baseline. No Supabase data migration or authentication is performed by this document.*
