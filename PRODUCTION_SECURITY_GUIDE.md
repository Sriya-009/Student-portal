# Production-Ready Authentication & Features Guide

## Overview
This guide documents the production-ready security features, dashboard statistics, and file upload capabilities added to the Student Portal backend.

---

## 1. PRODUCTION-READY SECURITY

### Bcrypt Password Hashing
- **Salt Rounds**: 10 (configurable via `BCRYPT_SALT_ROUNDS`)
- **Automatic Migration**: Legacy passwords are upgraded to bcrypt on first login
- **Detection**: System automatically detects blowfish hash format ($2a, $2b, $2y)

```javascript
// Password hashing example
const passwordHash = await bcrypt.hash(password, 10);

// Verification
const isValid = await bcrypt.compare(inputPassword, hash);
```

### JWT (JSON Web Tokens)
- **Token Type**: `access` token with 1-hour expiration
- **Secret**: Configured via `JWT_SECRET` environment variable
- **Claims**: 
  - `sub`: user identifier
  - `role`: user role (student/faculty/admin)
  - `email`: user email
  - `type`: token type for validation

```javascript
// Token structure
{
  sub: "STU001",
  role: "student",
  email: "student@example.com",
  type: "access",
  iat: 1234567890,
  exp: 1234571490
}
```

### Security Headers
- **Helmet.js Integration**: Adds security headers to all responses
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security
  - Content-Security-Policy

### Rate Limiting
- **Login Rate Limiting**: 10 attempts per 15 minutes
- **API Rate Limiting**: 100 requests per 60 seconds
- **Error Message**: "Too many requests/login attempts, please try again later."

```javascript
// Login endpoint has rate limiting
POST /api/auth/login
```

### Password Strength Validation
New password validation function enforces strong passwords:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

```javascript
// Usage in password reset
const errors = validatePasswordStrength(password);
if (errors.length > 0) {
  // Return validation errors to user
}
```

---

## 2. DASHBOARD STATISTICS ENDPOINT

### GET /api/stats/dashboard
Returns aggregate statistics for admin dashboards.

**Response**:
```json
{
  "ok": true,
  "stats": {
    "totalUsers": 150,
    "students": 120,
    "faculty": 25,
    "admins": 5
  }
}
```

**Usage**:
```javascript
// Frontend
const response = await fetch('http://54.144.255.74:5000/api/stats/dashboard');
const data = await response.json();
console.log(`Total Students: ${data.stats.students}`);
console.log(`Total Faculty: ${data.stats.faculty}`);
```

---

## 3. FILE UPLOAD - PROFILE PHOTOS

### Configuration
- **Storage Directory**: `backend/uploads/profile-photos/`
- **File Size Limit**: 5MB
- **Allowed Formats**: JPEG, PNG, GIF, WebP
- **Naming**: Timestamp + random string to prevent collisions

### Endpoints

#### 3.1 Upload Profile Photo
**POST /api/upload/profile-photo/:identifier**

**Headers**:
```
Content-Type: multipart/form-data
```

**Body**:
- `profilePhoto` (file, required): Image file

**Response**:
```json
{
  "ok": true,
  "message": "Profile photo uploaded successfully",
  "photoUrl": "/uploads/profile-photos/1710950400000-abc123.jpg"
}
```

**Example - cURL**:
```bash
curl -X POST \
  "http://54.144.255.74:5000/api/upload/profile-photo/STU001" \
  -F "profilePhoto=@/path/to/photo.jpg"
```

**Example - JavaScript**:
```javascript
const formData = new FormData();
formData.append('profilePhoto', fileInput.files[0]);

const response = await fetch(
  'http://54.144.255.74:5000/api/upload/profile-photo/STU001',
  {
    method: 'POST',
    body: formData
  }
);
const data = await response.json();
console.log(data.photoUrl); // Access the uploaded photo URL
```

#### 3.2 Get Profile Photo URL
**GET /api/profile-photo/:identifier**

**Response**:
```json
{
  "ok": true,
  "photoUrl": "/uploads/profile-photos/1710950400000-abc123.jpg"
}
```

**Example**:
```javascript
const response = await fetch(
  'http://54.144.255.74:5000/api/profile-photo/STU001'
);
const data = await response.json();
// Use in img src: <img src={data.photoUrl} />
```

#### 3.3 Delete Profile Photo
**DELETE /api/profile-photo/:identifier**

**Response**:
```json
{
  "ok": true,
  "message": "Profile photo deleted successfully"
}
```

**Example**:
```javascript
const response = await fetch(
  'http://54.144.255.74:5000/api/profile-photo/STU001',
  { method: 'DELETE' }
);
```

### Database Integration
- **Column**: `photo_url` (VARCHAR 255, NULL)
- **Auto Updates**: `updated_at` timestamp updated on photo changes
- **Safe Deletion**: Files are deleted from disk when removed from database

---

## 4. ENVIRONMENT VARIABLES

Add these to `.env`:

```env
# Security
JWT_SECRET=your-secret-key-here-min-32-chars
BCRYPT_SALT_ROUNDS=10

# File Uploads
UPLOAD_MAX_SIZE=5242880  # 5MB in bytes
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp

# Rate Limiting
LOGIN_RATE_LIMIT_WINDOW=900000  # 15 minutes in ms
LOGIN_RATE_LIMIT_MAX=10
API_RATE_LIMIT_WINDOW=60000  # 1 minute in ms
API_RATE_LIMIT_MAX=100
```

---

## 5. DATABASE SCHEMA UPDATE

Run the updated `init.sql` in MySQL Workbench:

```sql
-- New column added to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255) NULL;
```

---

## 6. BEST PRACTICES

### Security
✅ **DO**:
- Store JWT_SECRET in environment variables (never in code)
- Use HTTPS in production
- Validate file types server-side
- Implement CORS for production domains
- Rotate JWT secrets periodically
- Monitor failed login attempts

❌ **DON'T**:
- Expose error details to clients
- Store passwords in plain text
- Allow arbitrary file uploads
- Use default JWT secrets
- Disable rate limiting

### File Management
✅ **DO**:
- Validate file size before upload
- Check MIME type and extension
- Use unique filenames (timestamps + random)
- Create backups of uploads directory
- Monitor disk space for uploads

❌ **DON'T**:
- Use original uploaded filenames
- Allow executable file types
- Store uploads in web root
- Delete files without validation
- Skip file size limits

---

## 7. TROUBLESHOOTING

### "Too many login attempts"
- **Cause**: Rate limiter triggered (10 attempts/15 min)
- **Solution**: Wait 15 minutes or check failed login logs

### "Invalid file type"
- **Cause**: Uploaded file is not JPEG, PNG, GIF, or WebP
- **Solution**: Convert image to supported format

### "File too large"
- **Cause**: File exceeds 5MB limit
- **Solution**: Reduce image file size

### "Token verification failed"
- **Cause**: JWT_SECRET mismatch or token expired
- **Solution**: 
  - Verify JWT_SECRET matches between frontend/backend
  - Refresh token (login again)
  - Check system time sync

---

## 8. PERFORMANCE NOTES

- Bcrypt hashing: ~100-150ms per password operation (10 salt rounds)
- File upload processing: ~50-200ms depending on file size
- Dashboard stats query: ~10-20ms for typical dataset
- Rate limiter overhead: <1ms per request

---

**Last Updated**: March 2026
**Version**: 1.0.0
