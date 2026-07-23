# DriveTest Booking Kiosk

A full-stack driving-test appointment system built with Node.js, Express, EJS, and MongoDB Atlas. It provides role-aware workflows for drivers, examiners, and administrators from account creation through test results.

## Features

### Driver

- Create an account and securely sign in.
- Change a password or recover an account with a one-time recovery code.
- Enter and update personal, licence, and vehicle information.
- See profile-completion progress and test eligibility guidance.
- View appointment dates and available time slots.
- Book G2 and G driving tests.
- Cancel or reschedule a pending appointment.
- Keep profile updates separate from appointment booking.
- View appointment history, examiner comments, and pass/fail results.
- Book a G test after qualifying for G2.

### Examiner

- Access an examiner-only dashboard.
- View pending G2 or G appointments in searchable, sortable tables.
- Review driver and vehicle details.
- Add examination comments.
- Record pass or fail results once while preserving assessment history.

### Administrator

- Access admin-only pages.
- Create and review grouped appointment slots from 9:00 AM to 2:00 PM.
- Prevent duplicate slots for the same date and time.
- See available, booked, completed, passed, and failed totals.
- Review driver test results.
- Generate licence-issue requests for successful drivers.

## Technology Stack

- Node.js
- Express.js
- EJS
- MongoDB Atlas
- Mongoose
- Express Session with MongoDB session storage
- Helmet, login rate limiting, and CSRF protection
- Node.js `crypto` with scrypt password hashing and AES-256-GCM licence encryption
- Node.js built-in test runner
- Bootstrap

## Assignment Progression

| Stage | Development completed |
| --- | --- |
| Assignment 1 | Express routing, EJS layouts, dashboard, login, G2, and G pages |
| Assignment 2 | MongoDB model, driver data creation, retrieval, and vehicle updates |
| Assignment 3 | MVC structure, registration, authentication, sessions, role protection, and licence encryption |
| Assignment 4 | Admin appointment creation, duplicate prevention, and driver booking |
| Group Project | Examiner workflow, filtering, comments, pass/fail results, driver result display, and admin reporting |

## Prerequisites

- Node.js 18 or newer
- npm
- A MongoDB Atlas cluster

## Installation

1. Clone the repository and open the project folder:

   ```powershell
   cd DriveTest
   ```

2. Install dependencies:

   ```powershell
   npm install
   ```

3. Copy `.env.example` to `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Configure `.env`:

   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-address>/driving_test?retryWrites=true&w=majority
   SESSION_SECRET=<long-random-secret>
   LICENSE_ENCRYPTION_KEY=<different-long-random-secret>
   PORT=4000
   ```

5. In MongoDB Atlas, add your current IP address under **Network Access** and ensure the database user has read/write permission.

6. Start the application:

   ```powershell
   npm start
   ```

7. Open [http://localhost:4000](http://localhost:4000).

Do not change `LICENSE_ENCRYPTION_KEY` after licence data has been saved, or existing encrypted licence numbers cannot be decrypted.

## Available Commands

```powershell
npm start     # Start the application
npm run dev   # Start with automatic restarts
npm test      # Run the automated test suite
```

## Tests

The automated checks cover:

- Authentication, role authorization, account recovery, and password changes
- Password hashing, licence encryption, secure headers, rate limiting, and CSRF protection
- Driver validation, profile updates, booking conflicts, cancellation, and rescheduling
- Examiner result handling and administrator dashboard totals
- Appointment dates, responsive tables, navigation, forms, and all EJS views

Run the checks with:

```powershell
npm test
```

## Project Structure

```text
DriveTest/
|-- controllers/    Request handlers and application workflows
|-- middleware/     Authentication and role authorization
|-- models/         Mongoose schemas
|-- public/         CSS, JavaScript, and images
|-- test/           Built-in Node.js tests
|-- utils/          Password hashing and licence encryption
|-- views/          EJS pages and shared layouts
|-- .env.example    Environment-variable template
|-- package.json    Dependencies and npm commands
|-- server.js       Express application entry point
`-- README.md
```

## MongoDB Collections

Mongoose creates these collections as application data is saved:

- `useraccounts`
- `appointments`
- `bookedtimeslots`
- `sessions`

## Security

- Passwords are salted and hashed with Node.js scrypt.
- Licence numbers are encrypted with AES-256-GCM.
- Sessions are stored in MongoDB so authenticated sessions survive server restarts.
- Session cookies are HTTP-only and use `SameSite=Lax`.
- Login attempts are rate-limited and responses include Helmet security headers.
- State-changing requests require a session-bound CSRF token.
- Password changes require the current password; one-time recovery codes support account recovery without storing email addresses.
- Driver, examiner, and administrator routes use role-based middleware.
- Public registration always creates a driver account; staff roles must be provisioned directly by a database administrator.
- `.env` and `node_modules` are excluded from Git.

## Troubleshooting

### Port 4000 is already in use

Stop the existing Node process or change `PORT` in `.env` to another port such as `4001`.

### MongoDB Atlas does not connect

- Confirm the Atlas URI and database credentials.
- Add your current IP address to Atlas Network Access.
- Verify the Atlas cluster is running.
- URL-encode special characters in the database password.
