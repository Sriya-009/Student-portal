require('dotenv').config();

const appConfig = require('./config/appConfig');
const { assertApprovedDatabaseTarget } = require('./config/databasePreflight');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getPool: baseGetPool, testConnection, withTransaction } = require('./db');
const { requestChatCompletion } = require('./chatService');
const { createChatRouter } = require('./routes/chatRoutes');
const { createProjectRouter } = require('./routes/projectRoutes');
const { createProjectFileRouter } = require('./routes/projectFileRoutes');
const { createAdminRouter } = require('./routes/adminRoutes');
const { createProfileRouter } = require('./routes/profileRoutes');
const { createAuthRouter } = require('./routes/authRoutes');
const { createProfilePhotoRouters } = require('./routes/profilePhotoRoutes');
const { sendServerError } = require('./utils/httpResponse');
const { createErrorHandlers } = require('./middleware/errorHandlers');
const { createAuthMiddleware, isAccountActive } = require('./middleware/auth');
const {
  findRoleTableUser,
  syncUserIntoRoleTables,
  updateRoleTablePassword
} = require('./services/roleTableSync');

let databasePoolProvider = baseGetPool;

function getPool() {
  return databasePoolProvider();
}

function setDatabasePoolProvider(provider) {
  const previousProvider = databasePoolProvider;
  databasePoolProvider = provider;
  return () => { databasePoolProvider = previousProvider; };
}

let projectFilePoolProvider = getPool;

function getProjectFilePool() {
  return projectFilePoolProvider();
}

function setProjectFilePoolProvider(provider) {
  const previousProvider = projectFilePoolProvider;
  projectFilePoolProvider = provider;
  return () => { projectFilePoolProvider = previousProvider; };
}

let authIdentityProvider = async (identifier) => {
  const user = await findUserByIdentifierOrEmail(getPool(), identifier);
  return user
    ? { identifier: user.identifier, role: user.role, is_active: user.is_active }
    : null;
};

function setAuthIdentityProvider(provider) {
  const previousProvider = authIdentityProvider;
  authIdentityProvider = provider;
  return () => { authIdentityProvider = previousProvider; };
}

const { authenticateRequest, requireRoles, isSelfOrAdmin } = createAuthMiddleware({
  verifyToken: verifyAuthToken,
  loadIdentity: (identifier) => authIdentityProvider(identifier)
});

const app = express();
// Render places the app behind one reverse proxy; trust only that hop for client IPs.
app.set('trust proxy', 1);
const PORT = appConfig.port;
function getHost(env = process.env) {
  return env.HOST || '0.0.0.0';
}
const JWT_SECRET = appConfig.jwtSecret;
const JWT_EXPIRES_IN = appConfig.jwtExpiresIn;
const BCRYPT_SALT_ROUNDS = appConfig.bcryptSaltRounds;
const DEFAULT_ADMIN_IDENTIFIER = appConfig.defaultAdminIdentifier;
const DEFAULT_ADMIN_PASSWORD = appConfig.defaultAdminPassword;
const OTP_SESSION_TTL_MS = appConfig.otpSessionTtlMs;
const MAX_OTP_ATTEMPTS = appConfig.maxOtpAttempts;
const otpSessions = new Map();
const lastIssuedOtpByUser = new Map();
const passwordResetTokens = new Map();
const PHOTO_URL_TTL_SECONDS = 5 * 60;
const USER_SELECT_FIELDS = [
  'id',
  'identifier',
  'name',
  'email',
  'password',
  'role',
  'department',
  'phone',
  'registration_no',
  'semester',
  'section',
  'batch_year',
  'date_of_birth',
  'guardian_name',
  'guardian_phone',
  'address',
  'employee_id',
  'designation',
  'specialization',
  'qualification',
  'office_location',
  'office_hours',
  'joining_date',
  'bio',
  'access_level',
  'permissions_json',
  'emergency_contact',
  'two_factor_enabled',
  'is_active',
  'must_reset_password',
  'assigned_faculty_identifier',
  'photo_url',
  'created_at',
  'updated_at'
].join(', ');
const PROFILE_FIELD_MAP = {
  name: 'name',
  email: 'email',
  department: 'department',
  phoneNumber: 'phone',
  registrationNo: 'registration_no',
  semester: 'semester',
  section: 'section',
  batchYear: 'batch_year',
  dateOfBirth: 'date_of_birth',
  guardianName: 'guardian_name',
  guardianPhone: 'guardian_phone',
  address: 'address',
  employeeId: 'employee_id',
  designation: 'designation',
  specialization: 'specialization',
  qualification: 'qualification',
  officeLocation: 'office_location',
  officeHours: 'office_hours',
  joiningDate: 'joining_date',
  bio: 'bio',
  accessLevel: 'access_level',
  permissions: 'permissions_json',
  emergencyContact: 'emergency_contact',
  twoFactorEnabled: 'two_factor_enabled',
  isActive: 'is_active'
};

// ========== SECURITY MIDDLEWARE ==========
app.use(helmet());

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const sensitiveAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many chat requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// ========== FILE UPLOAD CONFIG ==========
const uploadsDir = path.join(__dirname, 'uploads', 'profile-photos');
const projectFilesDir = path.join(__dirname, 'uploads', 'project-files');
const projectFilesContentDir = path.join(__dirname, 'uploads', 'project-file-contents-v1');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(projectFilesDir)) {
  fs.mkdirSync(projectFilesDir, { recursive: true });
}
if (!fs.existsSync(projectFilesContentDir)) {
  fs.mkdirSync(projectFilesContentDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
  }
};

const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const projectFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, projectFilesContentDir),
    filename: (_req, _file, cb) => cb(null, `upload-${crypto.randomBytes(16).toString('hex')}.tmp`)
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }
});

const PROJECT_FILE_MIME_TYPES = {
  '.doc': ['application/msword', 'application/octet-stream'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
  '.pdf': ['application/pdf', 'application/octet-stream'],
  '.txt': ['text/plain', 'application/octet-stream'],
  '.ppt': ['application/vnd.ms-powerpoint', 'application/octet-stream'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
  '.zip': ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
  '.rar': ['application/vnd.rar', 'application/x-rar-compressed', 'application/octet-stream'],
  '.7z': ['application/x-7z-compressed', 'application/octet-stream'],
  '.csv': ['text/csv', 'application/vnd.ms-excel', 'application/octet-stream'],
  '.js': ['application/javascript', 'text/javascript', 'text/plain', 'application/octet-stream'],
  '.py': ['text/x-python', 'text/plain', 'application/octet-stream'],
  '.java': ['text/x-java-source', 'text/plain', 'application/octet-stream'],
  '.cpp': ['text/x-c++src', 'text/plain', 'application/octet-stream'],
  '.c': ['text/x-csrc', 'text/plain', 'application/octet-stream'],
  '.html': ['text/html', 'application/octet-stream'],
  '.css': ['text/css', 'text/plain', 'application/octet-stream']
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hasValidCompoundFileStructure(bytes, requiredStreamName) {
  const compoundSignature = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (bytes.length < 512 || !bytes.subarray(0, 8).equals(compoundSignature)) {
    return false;
  }

  const majorVersion = bytes.readUInt16LE(26);
  const sectorShift = bytes.readUInt16LE(30);
  const sectorSize = 2 ** sectorShift;
  const validVersion = (majorVersion === 3 && sectorShift === 9)
    || (majorVersion === 4 && sectorShift === 12);
  if (!validVersion || bytes.readUInt16LE(28) !== 0xfffe || bytes.readUInt16LE(32) !== 6
    || (majorVersion === 3 && bytes.readUInt32LE(40) !== 0)
    || bytes.readUInt32LE(56) !== 4096 || bytes.length < sectorSize * 2) {
    return false;
  }

  const numberOfSectors = Math.floor(bytes.length / sectorSize) - 1;
  const fatSectorCount = bytes.readUInt32LE(44);
  const firstDirectorySector = bytes.readUInt32LE(48);
  const firstMiniFatSector = bytes.readUInt32LE(60);
  const miniFatSectorCount = bytes.readUInt32LE(64);
  const firstDifatSector = bytes.readUInt32LE(68);
  const difatSectorCount = bytes.readUInt32LE(72);
  const endOfChain = 0xfffffffe;
  const freeSector = 0xffffffff;
  if (!fatSectorCount || fatSectorCount > numberOfSectors || firstDirectorySector >= numberOfSectors
    || (miniFatSectorCount && firstMiniFatSector >= numberOfSectors)
    || (!miniFatSectorCount && ![endOfChain, freeSector].includes(firstMiniFatSector))
    || (difatSectorCount && firstDifatSector >= numberOfSectors)
    || (!difatSectorCount && ![endOfChain, freeSector].includes(firstDifatSector))) {
    return false;
  }

  const fatSectorIds = [];
  for (let offset = 76; offset < 512; offset += 4) {
    const sectorId = bytes.readUInt32LE(offset);
    if (sectorId !== freeSector) fatSectorIds.push(sectorId);
  }
  let difatSectorId = firstDifatSector;
  for (let sectorIndex = 0; sectorIndex < difatSectorCount; sectorIndex += 1) {
    if (difatSectorId >= numberOfSectors) return false;
    const sectorOffset = (difatSectorId + 1) * sectorSize;
    for (let offset = 0; offset < sectorSize - 4; offset += 4) {
      const sectorId = bytes.readUInt32LE(sectorOffset + offset);
      if (sectorId !== freeSector) fatSectorIds.push(sectorId);
    }
    difatSectorId = bytes.readUInt32LE(sectorOffset + sectorSize - 4);
  }
  if ((difatSectorCount && ![endOfChain, freeSector].includes(difatSectorId))
    || fatSectorIds.length !== fatSectorCount
    || new Set(fatSectorIds).size !== fatSectorIds.length
    || fatSectorIds.some((sectorId) => sectorId >= numberOfSectors)) {
    return false;
  }

  const fat = [];
  for (const sectorId of fatSectorIds) {
    const sectorOffset = (sectorId + 1) * sectorSize;
    for (let offset = 0; offset < sectorSize; offset += 4) {
      fat.push(bytes.readUInt32LE(sectorOffset + offset));
    }
  }

  const directorySectors = [];
  let directorySectorId = firstDirectorySector;
  while (directorySectorId !== endOfChain) {
    if (directorySectorId >= numberOfSectors || directorySectors.length >= numberOfSectors) return false;
    directorySectors.push(directorySectorId);
    directorySectorId = fat[directorySectorId];
  }
  if (!directorySectors.length) return false;

  const directory = Buffer.concat(directorySectors.map((sectorId) => {
    const sectorOffset = (sectorId + 1) * sectorSize;
    return bytes.subarray(sectorOffset, sectorOffset + sectorSize);
  }));
  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const objectType = directory.readUInt8(offset + 66);
    const nameLength = directory.readUInt16LE(offset + 64);
    if (objectType !== 2 || nameLength < 2 || nameLength > 64 || nameLength % 2 !== 0) continue;
    const streamName = directory.subarray(offset, offset + nameLength - 2).toString('utf16le');
    if (streamName === requiredStreamName) return true;
  }
  return false;
}

function hasValidSevenZipStructure(bytes) {
  const signature = Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
  if (bytes.length < 32 || !bytes.subarray(0, 6).equals(signature)) {
    return false;
  }
  const nextHeaderOffset = bytes.readBigUInt64LE(12);
  const nextHeaderSize = bytes.readBigUInt64LE(20);
  if (nextHeaderOffset > BigInt(Number.MAX_SAFE_INTEGER) || nextHeaderSize === 0n
    || nextHeaderSize > BigInt(Number.MAX_SAFE_INTEGER)) {
    return false;
  }
  const nextHeaderStart = 32 + Number(nextHeaderOffset);
  const nextHeaderEnd = nextHeaderStart + Number(nextHeaderSize);
  return crc32(bytes.subarray(12, 32)) === bytes.readUInt32LE(8)
    && nextHeaderEnd <= bytes.length
    && crc32(bytes.subarray(nextHeaderStart, nextHeaderEnd)) === bytes.readUInt32LE(28);
}

function hasValidPdfStructure(bytes) {
  if (!/^%PDF-(?:1\.[0-7]|2\.0)/.test(bytes.subarray(0, 16).toString('ascii'))
    || !bytes.subarray(-2048).toString('latin1').includes('%%EOF')) {
    return false;
  }
  const content = bytes.toString('latin1');
  const startXref = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(content);
  if (!startXref || !/\bendobj\b/.test(content)) {
    return false;
  }
  const xrefOffset = Number(startXref[1]);
  if (!Number.isSafeInteger(xrefOffset) || xrefOffset < 0 || xrefOffset >= bytes.length) {
    return false;
  }
  const xrefContent = bytes.subarray(xrefOffset).toString('latin1').trimStart();
  return xrefContent.startsWith('xref')
    ? /\btrailer\b/.test(content)
    : /^\d+\s+\d+\s+obj\b/.test(xrefContent) && /\/Type\s*\/XRef\b/.test(xrefContent);
}

function readRar5Integer(bytes, startOffset) {
  let value = 0n;
  let shift = 0n;
  let offset = startOffset;
  while (offset < bytes.length && shift < 56n) {
    const byte = bytes[offset];
    value |= BigInt(byte & 0x7f) << shift;
    offset += 1;
    if ((byte & 0x80) === 0) {
      return value <= BigInt(Number.MAX_SAFE_INTEGER)
        ? { value: Number(value), nextOffset: offset }
        : null;
    }
    shift += 7n;
  }
  return null;
}

function hasValidRarStructure(bytes) {
  const rar4Signature = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00]);
  const rar5Signature = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
  if (bytes.subarray(0, rar4Signature.length).equals(rar4Signature)) {
    if (bytes.length < 20 || bytes.readUInt8(9) !== 0x73) return false;
    const headerSize = bytes.readUInt16LE(12);
    return headerSize >= 7
      && 7 + headerSize <= bytes.length
      && (crc32(bytes.subarray(9, 7 + headerSize)) & 0xffff) === bytes.readUInt16LE(7);
  }
  if (!bytes.subarray(0, rar5Signature.length).equals(rar5Signature) || bytes.length < 15) {
    return false;
  }
  const headerSize = readRar5Integer(bytes, 12);
  if (!headerSize || headerSize.value < 2) return false;
  const headerEnd = headerSize.nextOffset + headerSize.value;
  const headerType = readRar5Integer(bytes, headerSize.nextOffset);
  return headerEnd <= bytes.length
    && headerType?.value === 1
    && crc32(bytes.subarray(12, headerEnd)) === bytes.readUInt32LE(8);
}

const PROJECT_FILE_SIGNATURES = {
  '.pdf': hasValidPdfStructure,
  '.doc': (bytes) => hasValidCompoundFileStructure(bytes, 'WordDocument'),
  '.ppt': (bytes) => hasValidCompoundFileStructure(bytes, 'PowerPoint Document'),
  '.xls': (bytes) => hasValidCompoundFileStructure(bytes, 'Workbook')
    || hasValidCompoundFileStructure(bytes, 'Book'),
  '.docx': (bytes) => hasValidZipStructure(bytes, ['[Content_Types].xml', 'word/document.xml']),
  '.pptx': (bytes) => hasValidZipStructure(bytes, ['[Content_Types].xml', 'ppt/presentation.xml']),
  '.xlsx': (bytes) => hasValidZipStructure(bytes, ['[Content_Types].xml', 'xl/workbook.xml']),
  '.zip': (bytes) => hasValidZipStructure(bytes),
  '.rar': hasValidRarStructure,
  '.7z': hasValidSevenZipStructure
};

function hasValidZipStructure(bytes, requiredEntries = []) {
  const minimumEndRecordLength = 22;
  const maximumCommentLength = 0xffff;
  const searchStart = Math.max(0, bytes.length - minimumEndRecordLength - maximumCommentLength);
  let endRecordOffset = -1;
  for (let offset = bytes.length - minimumEndRecordLength; offset >= searchStart; offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      endRecordOffset = offset;
      break;
    }
  }
  if (endRecordOffset < 0 || endRecordOffset + minimumEndRecordLength > bytes.length) {
    return false;
  }

  const diskNumber = bytes.readUInt16LE(endRecordOffset + 4);
  const centralDirectoryDisk = bytes.readUInt16LE(endRecordOffset + 6);
  const entriesOnDisk = bytes.readUInt16LE(endRecordOffset + 8);
  const entryCount = bytes.readUInt16LE(endRecordOffset + 10);
  const centralDirectorySize = bytes.readUInt32LE(endRecordOffset + 12);
  const centralDirectoryOffset = bytes.readUInt32LE(endRecordOffset + 16);
  const commentLength = bytes.readUInt16LE(endRecordOffset + 20);
  if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount
    || entryCount === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff
    || endRecordOffset + minimumEndRecordLength + commentLength !== bytes.length
    || centralDirectoryOffset + centralDirectorySize !== endRecordOffset) {
    return false;
  }

  const entries = new Set();
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > endRecordOffset || bytes.readUInt32LE(offset) !== 0x02014b50) {
      return false;
    }
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const uncompressedSize = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const entryCommentLength = bytes.readUInt16LE(offset + 32);
    const localHeaderOffset = bytes.readUInt32LE(offset + 42);
    const endOffset = offset + 46 + nameLength + extraLength + entryCommentLength;
    if (!nameLength || endOffset > endRecordOffset || compressedSize === 0xffffffff
      || uncompressedSize === 0xffffffff || localHeaderOffset + 30 > centralDirectoryOffset
      || bytes.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      return false;
    }

    const entryName = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    const localNameLength = bytes.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localHeaderOffset + 28);
    const localNameStart = localHeaderOffset + 30;
    const localDataStart = localNameStart + localNameLength + localExtraLength;
    const localEntryName = bytes.subarray(localNameStart, localNameStart + localNameLength).toString('utf8');
    if (localEntryName !== entryName
      || bytes.readUInt16LE(localHeaderOffset + 6) !== bytes.readUInt16LE(offset + 8)
      || bytes.readUInt16LE(localHeaderOffset + 8) !== bytes.readUInt16LE(offset + 10)
      || localDataStart + compressedSize > centralDirectoryOffset) {
      return false;
    }
    if (!entryName || entryName.startsWith('/') || entryName.startsWith('\\')
      || entryName.split(/[\\/]/).includes('..')) {
      return false;
    }
    entries.add(entryName);
    offset = endOffset;
  }

  return offset === endRecordOffset
    && requiredEntries.every((entryName) => entries.has(entryName));
}

function isValidProjectFile(file) {
  if (!file?.path || !file.originalname || !file.size) {
    return false;
  }

  const extension = path.extname(file.originalname).toLowerCase();
  const allowedMimeTypes = PROJECT_FILE_MIME_TYPES[extension];
  if (!allowedMimeTypes) {
    return false;
  }

  const mimeType = String(file.mimetype || '').toLowerCase();
  if (mimeType && !allowedMimeTypes.includes(mimeType)) {
    return false;
  }

  const bytes = fs.readFileSync(file.path);
  const signatureCheck = PROJECT_FILE_SIGNATURES[extension];
  if (signatureCheck) {
    return signatureCheck(bytes);
  }

  // A supported binary format must not be accepted under a text/source extension.
  const knownBinarySignatures = [
    Buffer.from('%PDF-'),
    Buffer.from('PK\x03\x04', 'binary'),
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
    Buffer.from('Rar!\x1a\x07', 'binary'),
    Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from([0xff, 0xd8, 0xff]),
    Buffer.from('GIF87a'),
    Buffer.from('GIF89a'),
    Buffer.from('RIFF')
  ];
  if (knownBinarySignatures.some((signature) => bytes.subarray(0, signature.length).equals(signature))) {
    return false;
  }

  // Source and text files must be valid UTF-8 without embedded NUL bytes.
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch (_error) {
    return false;
  }
}

function getProjectFileStorageName(projectId, fileId) {
  return crypto.createHash('sha256')
    .update(`${String(projectId)}\u0000${String(fileId)}`)
    .digest('hex');
}

function getPendingProjectFilePrefix(projectId, fileId) {
  return `pending-${getProjectFileStorageName(projectId, fileId)}-`;
}

function getProjectFileContentPath(contentKey) {
  if (!/^[a-f0-9]{64}$/.test(String(contentKey || ''))) {
    return null;
  }
  return path.join(projectFilesContentDir, `content-${contentKey}`);
}

function getProjectFileTransactionMarkerPath(contentKey) {
  if (!/^[a-f0-9]{64}$/.test(String(contentKey || ''))) {
    return null;
  }
  return path.join(projectFilesContentDir, `transaction-${contentKey}.journal`);
}

function listPendingProjectFiles(projectId, fileId) {
  const prefix = getPendingProjectFilePrefix(projectId, fileId);
  return fs.readdirSync(projectFilesContentDir)
    .filter((filename) => filename.startsWith(prefix) && filename.endsWith('.stage'))
    .map((filename) => {
      const fullPath = path.join(projectFilesContentDir, filename);
      const contentKey = filename.slice(prefix.length, -'.stage'.length);
      return /^[a-f0-9]{64}$/.test(contentKey)
        ? { path: fullPath, contentKey, modifiedAt: fs.statSync(fullPath).mtimeMs }
        : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.modifiedAt - left.modifiedAt);
}

async function recoverProjectFileContent() {
  const pool = getProjectFilePool();
  const [rows] = await pool.query('SELECT content_key FROM project_files WHERE content_key IS NOT NULL');
  const committedKeys = new Set(rows.map((row) => String(row.content_key || '')).filter((key) => /^[a-f0-9]{64}$/.test(key)));
  const staleBefore = Date.now() - (24 * 60 * 60 * 1000);

  for (const filename of fs.readdirSync(projectFilesContentDir)) {
    const fullPath = path.join(projectFilesContentDir, filename);
    const modifiedAt = fs.statSync(fullPath).mtimeMs;
    const stagedContent = /^pending-[a-f0-9]{64}-[a-f0-9]{64}\.stage$/.test(filename);
    const multipartTemp = /^upload-[a-f0-9]{32}\.tmp$/.test(filename);
    const transactionMarker = /^transaction-([a-f0-9]{64})\.journal$/.exec(filename);
    if ((stagedContent || multipartTemp) && modifiedAt < staleBefore) {
      safeUnlink(fullPath);
    } else if (transactionMarker) {
      // A different live server process may own a recently-created marker.
      // Reconcile only markers old enough to be considered abandoned.
      if (modifiedAt >= staleBefore) continue;
      const key = transactionMarker[1];
      if (committedKeys.has(key)) {
        safeUnlink(fullPath);
      } else {
        safeUnlink(getProjectFileContentPath(key));
        safeUnlink(fullPath);
      }
    }
  }
}

async function stageProjectFile(uploadPath, projectId, fileId) {
  const contentKey = crypto.randomBytes(32).toString('hex');
  const pendingPath = path.join(
    projectFilesContentDir,
    `${getPendingProjectFilePrefix(projectId, fileId)}${contentKey}.stage`
  );
  await fs.promises.rename(uploadPath, pendingPath);
  return { path: pendingPath, contentKey };
}

async function promotePendingProjectFile(pendingFile) {
  const contentPath = getProjectFileContentPath(pendingFile.contentKey);
  if (!contentPath) {
    throw new Error('Invalid staged project file key.');
  }
  await fs.promises.rename(pendingFile.path, contentPath);
  return contentPath;
}

function getLegacyProjectFilePath(fileId) {
  const identifier = String(fileId || '');
  if (!identifier || identifier.length > 80 || identifier === '.' || identifier === '..'
    || /[\\/\u0000]/.test(identifier) || path.basename(identifier) !== identifier) {
    return null;
  }
  return path.join(projectFilesDir, identifier);
}

function resolveProjectFilePath(projectId, fileId, contentKey = null) {
  const versionedContentPath = getProjectFileContentPath(contentKey);
  if (versionedContentPath && fs.existsSync(versionedContentPath)) {
    return versionedContentPath;
  }
  const scopedFilePath = path.join(projectFilesDir, getProjectFileStorageName(projectId, fileId));
  if (fs.existsSync(scopedFilePath)) {
    return scopedFilePath;
  }
  const legacyFilePath = getLegacyProjectFilePath(fileId);
  return legacyFilePath && fs.existsSync(legacyFilePath) ? legacyFilePath : null;
}

function safeUnlink(filePath) {
  if (!filePath) {
    return;
  }
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Failed to remove file ${path.basename(filePath)}:`, error.message);
  }
}

function hasValidImageSignature(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isGif = header.subarray(0, 6).toString('ascii') === 'GIF87a'
    || header.subarray(0, 6).toString('ascii') === 'GIF89a';
  const isWebp = header.subarray(0, 4).toString('ascii') === 'RIFF'
    && header.subarray(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isGif || isWebp;
}

function createPhotoUrl(photoPath) {
  if (!JWT_SECRET) {
    return null;
  }
  const filename = path.basename(String(photoPath || ''));
  if (!filename) {
    return null;
  }
  const expires = Math.floor(Date.now() / 1000) + PHOTO_URL_TTL_SECONDS;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${filename}:${expires}`)
    .digest('hex');
  return `/uploads/profile-photos/${encodeURIComponent(filename)}?expires=${expires}&signature=${signature}`;
}

function isValidPhotoSignature(filename, expires, signature) {
  if (!JWT_SECRET) {
    return false;
  }
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${filename}:${expiresAt}`)
    .digest('hex');
  return typeof signature === 'string'
    && signature.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const allowedOrigins = String(process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins,
  credentials: false
}));
app.use(express.json());
app.use(apiRateLimiter);
app.get('/uploads/profile-photos/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!isValidPhotoSignature(filename, req.query.expires, req.query.signature)) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired photo URL.' });
  }
  return res.sendFile(path.join(uploadsDir, filename));
});
app.use('/api', authenticateRequest);

app.use('/api/chat', createChatRouter({
  requireRoles,
  chatRateLimiter,
  requestChatCompletion
}));

function maskPhone(phoneNumber) {
  const digits = (phoneNumber || '').replace(/\D/g, '');
  if (!digits) {
    return '*** *** ****';
  }
  return `*** *** ${digits.slice(-4)}`;
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function issueUniqueOtp(userKey, previousOtp = '') {
  let otpCode = generateOtpCode();
  const lastIssued = lastIssuedOtpByUser.get(userKey);

  while (otpCode === previousOtp || otpCode === lastIssued) {
    otpCode = generateOtpCode();
  }

  lastIssuedOtpByUser.set(userKey, otpCode);
  return otpCode;
}

function createAuthToken(user) {
  return jwt.sign(
    {
      sub: user.identifier,
      role: user.role,
      email: user.email,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: 'HS256' }
  );
}

function verifyAuthToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (!decoded || typeof decoded !== 'object'
      || decoded.type !== 'access'
      || typeof decoded.sub !== 'string' || !decoded.sub.trim()
      || typeof decoded.role !== 'string' || !decoded.role.trim() || decoded.role.length > 30
      || !Number.isFinite(decoded.iat)
      || !Number.isFinite(decoded.exp)) {
      throw new Error('Invalid access token claims');
    }
    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

function validatePasswordStrength(password) {
  const errors = [];
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/\d/.test(password)) {
    errors.push('Password must contain number');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character (!@#$%^&*)');
  }
  return errors;
}

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

async function verifyPasswordAndMigrate(pool, user, plainPassword) {
  const storedPassword = String(user.password || '');

  if (isBcryptHash(storedPassword)) {
    return bcrypt.compare(String(plainPassword), storedPassword);
  }

  // Legacy role-table accounts have no users.id row to migrate. Never issue
  // an UPDATE against a missing/unknown user ID or replace their stored hash.
  if (user.accountSource === 'role_table'
    || !Number.isInteger(Number(user.id)) || Number(user.id) <= 0) {
    return false;
  }

  // Reject unsupported legacy credentials without mutating account state.
  // A failed password attempt must never lock out an account or replace a
  // legacy hash. Password changes belong to an authenticated reset workflow.
  return false;
}

async function deliverWebhookMessage({ url, apiKey, event, recipient, code, expiresAt }) {
  let providerUrl;
  try {
    providerUrl = new URL(String(url || ''));
  } catch (_error) {
    console.error(`Webhook delivery unavailable for ${event || 'unknown event'}: provider URL is missing or invalid.`);
    return false;
  }

  if (!['http:', 'https:'].includes(providerUrl.protocol)
    || !String(apiKey || '').trim()
    || !String(event || '').trim()
    || !String(recipient || '').trim()
    || !String(code || '').trim()
    || !Number.isFinite(Number(expiresAt))) {
    console.error(`Webhook delivery unavailable for ${event || 'unknown event'}: provider configuration is incomplete.`);
    return false;
  }

  try {
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ event, recipient, code, expiresAt }),
      signal: AbortSignal.timeout(10000)
    });
    return response.ok;
  } catch (error) {
    console.error(`Webhook delivery failed for ${event}:`, error.message);
    return false;
  }
}

async function deliverOtp(user, otpCode, expiresAt) {
  if (String(process.env.OTP_DELIVERY || '').toLowerCase() !== 'webhook') {
    return false;
  }
  return deliverWebhookMessage({
    url: process.env.OTP_PROVIDER_URL,
    apiKey: process.env.OTP_PROVIDER_API_KEY,
    event: 'student-portal.otp',
    recipient: user.phone || user.email,
    code: otpCode,
    expiresAt
  });
}

async function deliverPasswordReset(user, resetToken, expiresAt) {
  if (String(process.env.RESET_TOKEN_DELIVERY || '').toLowerCase() !== 'webhook') {
    return false;
  }
  return deliverWebhookMessage({
    url: process.env.RESET_PROVIDER_URL,
    apiKey: process.env.RESET_PROVIDER_API_KEY,
    event: 'student-portal.password-reset',
    recipient: user.email,
    code: resetToken,
    expiresAt
  });
}

function takePasswordResetToken(resetToken) {
  const normalizedToken = String(resetToken || '').trim();
  const tokenRecord = passwordResetTokens.get(normalizedToken);
  passwordResetTokens.delete(normalizedToken);
  if (!tokenRecord || Date.now() > tokenRecord.expiresAt) {
    return null;
  }
  return tokenRecord;
}

async function findUserByIdentifierOrEmail(pool, identifier) {
  const normalized = String(identifier || '').trim().toLowerCase();
  const [rows] = await pool.query(
    `SELECT ${USER_SELECT_FIELDS}
     FROM users
     WHERE LOWER(identifier) = ? OR LOWER(email) = ?
     LIMIT 1`,
    [normalized, normalized]
  );
  const user = rows[0] || null;
  if (!user) {
    return findRoleTableUser(pool, normalized);
  }

  // Some older installations kept the usable password hash only in the
  // role-specific table. Reuse it in memory for authentication; do not write
  // it back or replace any stored account data.
  if (!String(user.password || '').trim() && user.role) {
    const roleUser = await findRoleTableUser(pool, normalized, user.role);
    if (roleUser && String(roleUser.identifier).toLowerCase() === String(user.identifier).toLowerCase()
      && String(roleUser.email || '').toLowerCase() === String(user.email || '').toLowerCase()
      && String(roleUser.password || '').trim()) {
      return { ...user, password: roleUser.password };
    }
  }

  return user;
}

function parseJsonArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

async function canAccessProject(pool, req, projectId) {
  if (String(req.auth?.role).toLowerCase() === 'admin') {
    return true;
  }

  const [rows] = await pool.query(
    `SELECT p.owner_identifier, s.assigned_faculty_identifier
     FROM projects p
     LEFT JOIN users s ON s.identifier = p.owner_identifier
     WHERE p.id = ? LIMIT 1`,
    [projectId]
  );
  const project = rows[0];
  if (!project) {
    return false;
  }

  const actor = String(req.auth?.sub || '').toLowerCase();
  return String(project.owner_identifier || '').toLowerCase() === actor
    || String(project.assigned_faculty_identifier || '').toLowerCase() === actor;
}

function validateProjectUploadIdentifiers(req, res, next) {
  const projectId = String(req.params.projectId || '').trim();
  const fileId = String(req.params.fileId || '').trim();
  if (!projectId || projectId.length > 60 || !fileId || fileId.length > 80 || /[\\/\u0000-\u001f]/.test(fileId)) {
    return res.status(400).json({ ok: false, error: 'projectId and fileId must be valid.' });
  }
  return next();
}

function createProjectAccessMiddleware(poolProvider = getPool) {
  return async (req, res, next) => {
    try {
      if (!await canAccessProject(poolProvider(), req, req.params.projectId)) {
        return res.status(403).json({ ok: false, error: 'You are not authorized to access this project.' });
      }
      return next();
    } catch (error) {
      return sendServerError(res, error);
    }
  };
}

const authorizeProjectUpload = createProjectAccessMiddleware(getProjectFilePool);

function toDbPatchValue(inputKey, value) {
  if (value === undefined) {
    return undefined;
  }

  if (inputKey === 'permissions') {
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  if (inputKey === 'twoFactorEnabled' || inputKey === 'isActive') {
    return value ? 1 : 0;
  }

  const normalized = String(value || '').trim();
  return normalized || null;
}

function toSafeUser(user) {
  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || null,
    phoneNumber: user.phone || null,
    registrationNo: user.registration_no || null,
    semester: user.semester || null,
    section: user.section || null,
    batchYear: user.batch_year || null,
    dateOfBirth: user.date_of_birth || null,
    guardianName: user.guardian_name || null,
    guardianPhone: user.guardian_phone || null,
    address: user.address || null,
    employeeId: user.employee_id || null,
    designation: user.designation || null,
    specialization: user.specialization || null,
    qualification: user.qualification || null,
    officeLocation: user.office_location || null,
    officeHours: user.office_hours || null,
    joiningDate: user.joining_date || null,
    bio: user.bio || null,
    accessLevel: user.access_level || null,
    permissions: parseJsonArray(user.permissions_json),
    emergencyContact: user.emergency_contact || null,
    twoFactorEnabled: Boolean(user.two_factor_enabled),
    isActive: user.is_active === undefined ? true : Boolean(user.is_active),
    requiresPasswordReset: Boolean(user.must_reset_password),
    assignedFacultyIdentifier: user.assigned_faculty_identifier || null,
    photoUrl: createPhotoUrl(user.photo_url),
    createdAt: user.created_at || null,
    updatedAt: user.updated_at || null
  };
}

function toSafeProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description || '',
    department: project.department || '',
    status: project.status || 'ongoing',
    progressPercent: Number(project.progress_percent || 0),
    deadline: project.deadline || 'NA',
    ownerIdentifier: project.owner_identifier || null,
    teamMembers: [],
    technologies: []
  };
}

function toSafeProjectTask(task) {
  return {
    id: task.id,
    projectId: task.project_id,
    title: task.title || '',
    description: task.description || '',
    assignedToId: task.assigned_to_id || '',
    assignedToName: task.assigned_to_name || '',
    status: task.status || 'pending',
    deadline: task.deadline || null,
    contributionPercent: Number(task.contribution_percent || 0)
  };
}

function toSafeProjectFile(file) {
  return {
    id: file.id,
    projectId: file.project_id,
    fileName: file.file_name || '',
    fileSize: Number(file.file_size || 0),
    fileType: file.file_type || 'other',
    mimeType: file.mime_type || '',
    uploadedBy: file.uploaded_by || '',
    uploadedByName: file.uploaded_by_name || '',
    uploadedDate: file.uploaded_date || null,
    version: Number(file.version || 1),
    description: file.description || '',
    downloadCount: Number(file.download_count || 0),
    isSubmitted: Boolean(file.is_submitted),
    submittedDate: file.submitted_date || null,
    updatedDate: file.updated_date || null
  };
}

function toSafeFeedbackCorrection(correction) {
  return {
    id: correction.id,
    projectId: correction.project_id,
    studentIdentifier: correction.student_identifier,
    note: correction.note || '',
    createdAt: correction.created_at
  };
}

function normalizeDateOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  return raw;
}

function generateProjectIdentifier() {
  const ts = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `PRJ-${ts}-${String(random).padStart(3, '0')}`;
}

async function ensureProjectsTable() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(60) PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      description TEXT NULL,
      department VARCHAR(120) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'ongoing',
      progress_percent INT NOT NULL DEFAULT 0,
      deadline DATE NULL,
      owner_identifier VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

async function ensureProjectWorkspaceTables() {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id VARCHAR(80) PRIMARY KEY,
      project_id VARCHAR(60) NOT NULL,
      title VARCHAR(220) NOT NULL,
      description TEXT NULL,
      assigned_to_id VARCHAR(80) NULL,
      assigned_to_name VARCHAR(180) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      deadline DATE NULL,
      contribution_percent INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_project_tasks_project (project_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_files (
      id VARCHAR(80) PRIMARY KEY,
      project_id VARCHAR(60) NOT NULL,
      content_key VARCHAR(64) NULL,
      file_name VARCHAR(260) NOT NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      file_type VARCHAR(60) NULL,
      mime_type VARCHAR(120) NULL,
      uploaded_by VARCHAR(80) NULL,
      uploaded_by_name VARCHAR(180) NULL,
      uploaded_date DATE NULL,
      version INT NOT NULL DEFAULT 1,
      description TEXT NULL,
      download_count INT NOT NULL DEFAULT 0,
      is_submitted TINYINT(1) NOT NULL DEFAULT 0,
      submitted_date DATE NULL,
      updated_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_project_files_project (project_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_feedback_corrections (
      id VARCHAR(80) PRIMARY KEY,
      project_id VARCHAR(60) NOT NULL,
      student_identifier VARCHAR(80) NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_project_feedback_project (project_id)
    )
  `);
}

async function ensureProjectFileContentKeyColumn() {
  const pool = getPool();
  const [rows] = await pool.query("SHOW COLUMNS FROM project_files LIKE 'content_key'");
  if (rows.length === 0) {
    try {
      await pool.query('ALTER TABLE project_files ADD COLUMN content_key VARCHAR(64) NULL');
    } catch (error) {
      // Concurrent app instances may both observe the column as missing.
      if (error?.code !== 'ER_DUP_FIELDNAME') throw error;
    }
    return;
  }

  const columnType = String(rows[0].Type || rows[0].type || '').toLowerCase();
  const sizedText = /^(?:var)?char\((\d+)\)/.exec(columnType);
  const unboundedText = /^(?:tinytext|text|mediumtext|longtext)$/.test(columnType);
  if ((!sizedText || Number(sizedText[1]) < 64) && !unboundedText) {
    throw new Error('project_files.content_key cannot store a 64-character key; manual schema review is required.');
  }
}

async function ensureStudentFacultyAssignmentColumn() {
  const pool = getPool();
  const [rows] = await pool.query("SHOW COLUMNS FROM users LIKE 'assigned_faculty_identifier'");
  if (rows.length === 0) {
    await pool.query('ALTER TABLE users ADD COLUMN assigned_faculty_identifier VARCHAR(50) NULL');
  }
}

async function ensureRoleTables() {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student (
        registration_no VARCHAR(80) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        course VARCHAR(120) NULL,
        semester VARCHAR(20) NULL,
        section VARCHAR(20) NULL,
        batch_year VARCHAR(10) NULL,
        date_of_birth DATE NULL,
        guardian_name VARCHAR(120) NULL,
        guardian_phone VARCHAR(30) NULL,
        address VARCHAR(255) NULL,
        profile_photo_url VARCHAR(255) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS faculty (
        employee_id VARCHAR(80) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        department VARCHAR(120) NULL,
        designation VARCHAR(120) NULL,
        specialization VARCHAR(120) NULL,
        qualification VARCHAR(160) NULL,
        office_location VARCHAR(120) NULL,
        office_hours VARCHAR(120) NULL,
        joining_date DATE NULL,
        bio TEXT NULL,
        profile_photo_url VARCHAR(255) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        employee_id VARCHAR(80) PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'admin',
        access_level INT NOT NULL DEFAULT 1,
        permissions_json JSON NULL,
        two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
        emergency_contact VARCHAR(30) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        must_reset_password TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
}

async function ensureDefaultAdmin(identifier = DEFAULT_ADMIN_IDENTIFIER, password = DEFAULT_ADMIN_PASSWORD) {
  const pool = getPool();
  const normalizedIdentifier = String(identifier).trim().toLowerCase();

  if (!normalizedIdentifier || !password) {
    console.warn('Default admin provisioning skipped; set DEFAULT_ADMIN_IDENTIFIER and DEFAULT_ADMIN_PASSWORD explicitly.');
    return;
  }

  const passwordHash = await bcrypt.hash(String(password), BCRYPT_SALT_ROUNDS);
  try {
    await withTransaction(pool, async (connection) => {
      const [existingRows] = await connection.query(
        'SELECT id FROM users WHERE LOWER(identifier) = ? LIMIT 1 FOR UPDATE',
        [normalizedIdentifier]
      );
      if (existingRows.length > 0) return;

      // Legacy installations may have an administrator only in the role
      // mirror. Reuse that identity instead of provisioning a second account
      // whose configured password could shadow the existing credentials.
      const [legacyAdminRows] = await connection.query(
        'SELECT employee_id FROM admin WHERE LOWER(employee_id) = ? OR LOWER(email) = ? LIMIT 1 FOR UPDATE',
        [normalizedIdentifier, `${normalizedIdentifier}@portal.local`]
      );
      if (legacyAdminRows.length > 0) return;

      await connection.query(
        `INSERT INTO users
         (identifier, name, email, role, department, access_level, is_active, must_reset_password, password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          String(identifier).trim(),
          'System Default Admin',
          `${String(identifier).trim().toLowerCase()}@portal.local`,
          'admin',
          'Administration',
          'Super Admin',
          1,
          0,
          passwordHash
        ]
      );

      const createdAdmin = await findUserByIdentifierOrEmail(connection, String(DEFAULT_ADMIN_IDENTIFIER).trim());
      if (createdAdmin) await syncUserIntoRoleTables(connection, createdAdmin);
    });
  } catch (error) {
    // Two app instances may provision at once. The unique key keeps this idempotent.
    if (error?.code !== 'ER_DUP_ENTRY') throw error;
  }
}

async function ensureTempWorkspaceSeed() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    return;
  }
  if (!process.env.DEMO_STUDENT_PASSWORD || !process.env.DEMO_FACULTY_PASSWORD) {
    console.warn('Demo workspace seed skipped; set DEMO_STUDENT_PASSWORD and DEMO_FACULTY_PASSWORD explicitly.');
    return;
  }
  const pool = getPool();
  const tempStudentIdentifier = 'TEMPSTU001';
  const tempFacultyIdentifier = 'TEMPFAC001';
  const tempProjectId = 'TEMP-PRJ-001';

  const ensureUser = async ({ identifier, name, email, role, department, password }) => {
    let existing = await findUserByIdentifierOrEmail(pool, identifier);
    if (existing) {
      return existing;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await pool.query(
      `INSERT INTO users
       (identifier, name, email, role, department, phone, is_active, must_reset_password, password)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        identifier,
        name,
        email,
        role,
        department,
        '+91 90000 00000',
        1,
        0,
        passwordHash
      ]
    );

    existing = await findUserByIdentifierOrEmail(pool, identifier);
    if (existing) {
      await syncUserIntoRoleTables(pool, existing);
    }
    return existing;
  };

  const tempStudent = await ensureUser({
    identifier: tempStudentIdentifier,
    name: 'Temp Student',
    email: 'temp.student@portal.local',
    role: 'student',
    department: 'Computer Science',
    password: process.env.DEMO_STUDENT_PASSWORD
  });

  const tempFaculty = await ensureUser({
    identifier: tempFacultyIdentifier,
    name: 'Temp Faculty',
    email: 'temp.faculty@portal.local',
    role: 'faculty',
    department: 'Computer Science',
    password: process.env.DEMO_FACULTY_PASSWORD
  });

  if (tempStudent && tempFaculty) {
    await pool.query(
      `UPDATE users SET assigned_faculty_identifier = ?, updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(identifier) = LOWER(?) AND role = 'student'`,
      [tempFaculty.identifier, tempStudent.identifier]
    );
  }

  const [projectRows] = await pool.query('SELECT id FROM projects WHERE id = ? LIMIT 1', [tempProjectId]);
  if (projectRows.length === 0 && tempStudent) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 14);
    const deadlineIso = deadline.toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO projects (id, name, description, department, status, progress_percent, deadline, owner_identifier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tempProjectId,
        'Temporary Full Workflow Project',
        'Seeded demo project for validating student, faculty, and admin operations.',
        tempStudent.department || 'Computer Science',
        'ongoing',
        45,
        deadlineIso,
        tempStudent.identifier
      ]
    );
  }
}

async function generateIdentifierForRole(pool, role) {
  const prefixMap = {
    student: 'STU',
    faculty: 'FAC',
    admin: 'ADM'
  };

  const prefix = prefixMap[role] || 'USR';
  const [rows] = await pool.query(
    `SELECT identifier
     FROM users
     WHERE identifier LIKE ?
     ORDER BY id DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  if (rows.length === 0) {
    return `${prefix}001`;
  }

  const lastIdentifier = String(rows[0].identifier || '');
  const match = lastIdentifier.match(/(\d+)$/);
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

app.get('/api/health', async (_req, res) => {
  try {
    await testConnection();
    res.json({
      ok: true,
      server: 'running',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      server: 'running',
      database: 'disconnected',
      error: 'Database connection failed.',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/', (_req, res) => {
  res.status(200).send('Student Portal API is running. Use /api/health for status.');
});

app.use('/api/projects', createProjectRouter({
  requireRoles,
  getPool,
  findUserByIdentifierOrEmail,
  generateProjectIdentifier,
  normalizeDateOrNull,
  toSafeProject,
  toSafeProjectTask,
  toSafeFeedbackCorrection,
  canAccessProject,
  withTransaction,
  sendServerError
}));

app.use('/api/projects/:projectId/files', createProjectFileRouter({
  requireRoles,
  validateProjectUploadIdentifiers,
  authorizeProjectUpload,
  projectFileUpload,
  getProjectFilePool,
  canAccessProject,
  toSafeProjectFile,
  sendServerError,
  isValidProjectFile,
  safeUnlink,
  stageProjectFile,
  resolveProjectFilePath,
  path,
  getProjectFileTransactionMarkerPath,
  listPendingProjectFiles,
  fs,
  promotePendingProjectFile,
  normalizeDateOrNull
}));

app.use('/api', createAdminRouter({
  requireRoles,
  getPool,
  userSelectFields: USER_SELECT_FIELDS,
  toSafeUser,
  sendServerError,
  findUserByIdentifierOrEmail,
  validatePasswordStrength,
  bcrypt,
  saltRounds: BCRYPT_SALT_ROUNDS,
  withTransaction,
  syncUserIntoRoleTables
}));

app.use('/api/profile', createProfileRouter({
  getPool,
  findUserByIdentifierOrEmail,
  toSafeUser,
  sendServerError,
  isSelfOrAdmin,
  profileFieldMap: PROFILE_FIELD_MAP,
  toDbPatchValue,
  withTransaction,
  syncUserIntoRoleTables
}));

const profilePhotoRouters = createProfilePhotoRouters({
  uploadMiddleware,
  getPool,
  isSelfOrAdmin,
  safeUnlink,
  hasValidImageSignature,
  path,
  uploadsDir,
  createPhotoUrl,
  sendServerError
});
app.use('/api/upload/profile-photo', profilePhotoRouters.uploadRouter);
app.use('/api/profile-photo', profilePhotoRouters.photoRouter);

app.use('/api/auth', createAuthRouter({
  loginRateLimiter,
  sensitiveAuthRateLimiter,
  getPool,
  findUserByIdentifierOrEmail,
  isAccountActive,
  verifyPasswordAndMigrate,
  issueUniqueOtp,
  otpSessionTtlMs: OTP_SESSION_TTL_MS,
  deliverOtp,
  otpSessions,
  maskPhone,
  createAuthToken,
  toSafeUser,
  sendServerError,
  maxOtpAttempts: MAX_OTP_ATTEMPTS,
  deliverPasswordReset,
  passwordResetTokens,
  validatePasswordStrength,
  isSelfOrAdmin,
  bcrypt,
  bcryptSaltRounds: BCRYPT_SALT_ROUNDS,
  withTransaction,
  syncUserIntoRoleTables,
  updateRoleTablePassword,
  takePasswordResetToken,
  generateIdentifierForRole,
  verifyAuthToken,
  loadAuthIdentity: (identifier) => authIdentityProvider(identifier)
}));
// ========== CENTRAL ERROR HANDLERS ==========
app.use(...createErrorHandlers(multer.MulterError));

async function bootstrapData() {
  await ensureRoleTables();
  await ensureProjectsTable();
  await ensureProjectWorkspaceTables();
  await ensureProjectFileContentKeyColumn();
  await recoverProjectFileContent();
  await ensureStudentFacultyAssignmentColumn();
  await ensureDefaultAdmin();
  await ensureTempWorkspaceSeed();
}

if (require.main === module) {
  assertApprovedDatabaseTarget(process.env);
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 characters before starting the server.');
  }

  bootstrapData().then(() => {
    app.listen(PORT, getHost(), () => {
      console.log(`Server running on port ${PORT}`);
    });
  }).catch((_error) => {
    console.error('Application bootstrap failed.');
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  authenticateRequest,
  requireRoles,
  isSelfOrAdmin,
  __test: {
    otpSessions,
    passwordResetTokens,
    takePasswordResetToken,
    verifyAuthToken,
    setAuthIdentityProvider,
    setDatabasePoolProvider,
    deliverWebhookMessage,
    deliverOtp,
    canAccessProject,
    createProjectAccessMiddleware,
    getProjectFileStorageName,
    getLegacyProjectFilePath,
    resolveProjectFilePath,
    isValidProjectFile,
    getProjectFileContentPath,
    getProjectFileTransactionMarkerPath,
    getProjectFileContentDir: () => projectFilesContentDir,
    listPendingProjectFiles,
    stageProjectFile,
    recoverProjectFileContent,
    setProjectFilePoolProvider,
    ensureRoleTables,
    ensureDefaultAdmin,
    ensureProjectWorkspaceTables,
    ensureProjectFileContentKeyColumn,
    getHost,
    syncUserIntoRoleTables
  }
};
