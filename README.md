# University Attendance Management App

A complete mobile attendance management system for universities built with React Native, Expo, and Supabase. Features role-based authentication for Faculty and Students, offline sync, QR code attendance, and comprehensive reporting.

## Features

### For Faculty
- ✅ Dashboard with subject overview and statistics
- ✅ Mark attendance manually with date selection
- ✅ Generate QR codes for quick attendance (10-minute validity)
- ✅ View and edit past attendance records
- ✅ Generate PDF and Excel reports
- ✅ Real-time attendance tracking
- ✅ Offline support with auto-sync

### For Students
- ✅ View overall attendance percentage
- ✅ Subject-wise attendance breakdown
- ✅ Scan QR codes to mark attendance
- ✅ Calendar view of attendance history
- ✅ Export personal attendance reports
- ✅ Low attendance warnings

## Tech Stack

### Frontend
- **Framework**: React Native 0.81.4 with Expo SDK 54
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context API
- **Local Storage**: AsyncStorage for offline data
- **Camera**: expo-camera + expo-barcode-scanner for QR codes
- **Fonts**: Google Fonts (Poppins family)

### Backend & Database
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with Row Level Security
- **Real-time**: Supabase Realtime subscriptions
- **Storage**: Supabase Storage

### Additional Libraries
- date-fns - Date handling
- react-hook-form - Form management
- @react-native-community/netinfo - Network detection
- expo-linear-gradient - UI gradients
- react-native-svg - SVG rendering

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Expo CLI (`npm install -g expo-cli`)
- Supabase account (free tier available)
- Android Studio or Xcode for testing (or use Expo Go)

### 1. Clone and Install

```bash
cd attendance-app
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database

1. Open your Supabase project's SQL Editor
2. Copy the contents of `scripts/database-schema.sql`
3. Paste and run the script in the SQL Editor
4. This will create all tables, indexes, RLS policies, and functions

### 4. Create Test Users

Since registration is admin-only, create test users through Supabase:

#### Create Faculty User
1. Go to Authentication > Users in Supabase dashboard
2. Click "Add user" → Create user manually
3. Set email and password (e.g., `faculty@test.com` / `test123`)
4. Note the user ID from the created user
5. Run in SQL Editor:

```sql
-- Insert into users table
INSERT INTO users (id, email, full_name, role, password_hash)
VALUES (
  'paste-user-id-here',
  'faculty@test.com',
  'Dr. John Smith',
  'faculty',
  'hash-from-auth'  -- This is handled by Supabase Auth
);

-- Insert into faculty table
INSERT INTO faculty (id, employee_id, department, phone)
VALUES (
  'paste-same-user-id',
  'FAC001',
  'Computer Science',
  '1234567890'
);

-- Create a test subject
INSERT INTO subjects (subject_code, subject_name, faculty_id, semester, department, schedule)
VALUES (
  'CS101',
  'Introduction to Programming',
  'paste-faculty-id',
  1,
  'Computer Science',
  'MWF 10:00 AM'
);
```

#### Create Student User
1. Follow same steps for creating student
2. Use email like `student@test.com`
3. Run in SQL Editor:

```sql
-- Insert into users table
INSERT INTO users (id, email, full_name, role, password_hash)
VALUES (
  'paste-student-user-id',
  'student@test.com',
  'Alice Johnson',
  'student',
  'hash-from-auth'
);

-- Insert into students table
INSERT INTO students (id, roll_number, enrollment_year, semester, department, phone)
VALUES (
  'paste-same-user-id',
  'CS2024001',
  2024,
  1,
  'Computer Science',
  '0987654321'
);

-- Enroll student in subject
INSERT INTO enrollments (student_id, subject_id)
VALUES (
  'paste-student-id',
  'paste-subject-id'  -- Get from subjects table
);
```

### 5. Run the App

```bash
# Start Expo development server
npx expo start

# Run on Android
npx expo start --android

# Run on iOS
npx expo start --ios

# Run in Expo Go (scan QR code with phone)
```

## Project Structure

```
attendance-app/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout with auth provider
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx
│   │   └── forgot-password.tsx
│   ├── (faculty)/                # Faculty screens
│   │   └── (tabs)/
│   │       ├── index.tsx         # Dashboard
│   │       ├── mark-attendance.tsx
│   │       ├── qr-code.tsx
│   │       └── profile.tsx
│   └── (student)/                # Student screens
│       └── (tabs)/
│           ├── index.tsx         # Dashboard
│           ├── subjects.tsx
│           ├── scan-qr.tsx
│           └── profile.tsx
├── components/                   # Reusable components
│   ├── common/                   # Button, Card, Input, etc.
│   ├── dashboard/                # StatCard, SubjectCard, ProgressCircle
│   └── attendance/               # Attendance-specific components
├── contexts/                     # React contexts
│   ├── AuthContext.tsx           # Authentication state
│   └── OfflineContext.tsx        # Offline sync state
├── services/                     # Business logic
│   ├── authService.ts
│   ├── attendanceService.ts
│   ├── subjectService.ts
│   └── qrService.ts
├── lib/                          # Utilities
│   ├── supabase.ts               # Supabase client
│   ├── constants.ts              # App constants
│   └── utils.ts                  # Helper functions
├── styles/                       # Global styles
│   └── theme.ts                  # Colors, typography, spacing
├── types/                        # TypeScript types
│   ├── database.ts               # Supabase table types
│   └── models.ts                 # App models
└── scripts/                      # Utility scripts
    └── database-schema.sql       # Database setup
```

## Design System

### Colors
- **Primary**: #4A90E2 (Professional Blue)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Amber)
- **Error**: #EF4444 (Red)

### Typography
- **Font Family**: Poppins (400, 500, 600, 700)
- **Headers**: Bold, 28px
- **Body**: Regular, 14px
- **Captions**: Regular, 11px

## Key Features Implementation

### 1. Authentication Flow
- Role-based navigation (Faculty vs Student)
- Supabase Auth with Row Level Security
- Automatic token refresh
- Secure session management

### 2. Offline Sync
- Queue operations in AsyncStorage when offline
- Auto-sync when connection restored
- Conflict resolution (server data takes precedence)
- Visual sync status indicators

### 3. QR Code Attendance
- Faculty generates time-limited QR codes (10 minutes)
- Students scan to mark attendance
- Late marking after timeout
- Real-time scan updates
- Duplicate scan prevention

### 4. Attendance Calculation
- Configurable "count late as present" per subject
- Overall and subject-wise percentages
- Color-coded indicators (>80% green, 60-80% orange, <60% red)

## Database Schema

The app uses 7 main tables:
- `users` - User accounts with roles
- `faculty` - Faculty-specific data
- `students` - Student-specific data
- `subjects` - Courses/subjects
- `enrollments` - Student-subject mapping
- `attendance_records` - Attendance data
- `qr_sessions` - Temporary QR tokens

See `scripts/database-schema.sql` for complete schema with indexes, RLS policies, and functions.

## Environment Variables

Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Testing

### Test Login Credentials
After creating test users:
- Faculty: `faculty@test.com` / `test123`
- Student: `student@test.com` / `test123`

### Test Flows
1. **Faculty marks attendance**:
   - Login as faculty → View dashboard → See assigned subjects
   - Navigate to Mark Attendance → Select subject and date
   - Mark students present/absent → Save

2. **Student views attendance**:
   - Login as student → View dashboard → See attendance percentage
   - Tap on subject → View detailed attendance history

3. **QR Code attendance**:
   - Faculty generates QR → Student scans → Attendance marked automatically

## Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
npx expo install --check
```

**2. Supabase connection issues**
- Check `.env` file has correct credentials
- Verify Supabase project is active
- Check RLS policies are enabled

**3. Authentication errors**
- Ensure users table has matching auth.users entries
- Verify RLS policies allow access
- Check role field is set correctly

**4. Build errors**
```bash
# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install
```

## Building for Production

### Android APK
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure build
eas build:configure

# Build APK
eas build --platform android --profile preview

# Build for Google Play
eas build --platform android --profile production
```

### iOS IPA
```bash
eas build --platform ios --profile production
```

## Future Enhancements

- [ ] Mark Attendance screen with student selection
- [ ] QR Code generation with countdown timer
- [ ] QR Scanner with camera permissions
- [ ] Subject detail screens with attendance history
- [ ] PDF and Excel report generation
- [ ] Push notifications for low attendance
- [ ] Calendar view for students
- [ ] Biometric authentication
- [ ] Multi-language support

## License

MIT License - feel free to use for educational purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase documentation
3. Check Expo documentation
4. Open an issue in the repository

## Credits

Built with:
- React Native & Expo
- Supabase
- React Native Paper
- Expo Router

---

**Note**: This app is designed for educational institutions. Ensure you comply with data privacy regulations when deploying to production.
