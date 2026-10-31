const ORIGINAL_DATABASE_NAME = 'student_management';

function parseExactAllowlist(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item && item !== '*');
}

function assertApprovedDatabaseTarget(env = process.env) {
  const database = String(env.DB_NAME || '').trim();
  const host = String(env.DB_HOST || '').trim();
  const port = String(env.DB_PORT || '').trim();
  const normalizedDatabase = database.toLowerCase();
  const normalizedHost = host.toLowerCase().replace(/\.$/, '');
  const safeDatabaseName = /^[a-zA-Z0-9_-]+$/.test(database);

  if (!database || !safeDatabaseName || normalizedDatabase === ORIGINAL_DATABASE_NAME) {
    throw new Error('Database startup blocked by clone-target preflight.');
  }

  const explicitlyCloneNamed = /(?:^|[_-])(?:test|clone)(?:[_-]|$)/i.test(database);
  const cloneModeEnabled = String(env.DB_CLONE_VALIDATION || '').toLowerCase() === 'true';
  const approvedDatabases = parseExactAllowlist(env.DB_APPROVED_TEST_DATABASES);
  const approvedHosts = parseExactAllowlist(env.DB_APPROVED_TEST_HOSTS)
    .map((approvedHost) => approvedHost.replace(/\.$/, ''));
  const approvedPorts = parseExactAllowlist(env.DB_APPROVED_TEST_PORTS)
    .map((approvedPort) => Number(approvedPort))
    .filter((approvedPort) => Number.isInteger(approvedPort) && approvedPort >= 1 && approvedPort <= 65535);
  const normalizedPort = Number(port);

  if (!cloneModeEnabled || !explicitlyCloneNamed
    || !approvedDatabases.includes(normalizedDatabase)
    || !normalizedHost || !approvedHosts.includes(normalizedHost)
    || !/^\d+$/.test(port) || normalizedPort < 1 || normalizedPort > 65535
    || !approvedPorts.includes(normalizedPort)) {
    throw new Error('Database startup blocked by clone-target preflight.');
  }

  return true;
}

module.exports = {
  ORIGINAL_DATABASE_NAME,
  assertApprovedDatabaseTarget
};
