# Clone validation environment

The application refuses to create a MySQL pool unless clone-validation mode is enabled and both the database name and host exactly match explicit allowlists. The database name must include a `test` or `clone` component. The original `student_management` name is always blocked.

Set these values in the process environment used to start the application. Use a unique clone database name and a disposable MySQL host that cannot reach the original database:

```text
DB_CLONE_VALIDATION=true
DB_NAME=student_management_clone_<unique-run-id>
DB_HOST=<approved-disposable-mysql-host>
DB_PORT=<approved-test-port>
DB_APPROVED_TEST_DATABASES=student_management_clone_<unique-run-id>
DB_APPROVED_TEST_HOSTS=<approved-disposable-mysql-host>
DB_APPROVED_TEST_PORTS=<approved-test-port>
DB_USER=<clone-only-database-user>
DB_PASSWORD=<provide-through-a-secret-store>
SEED_DEMO_DATA=false
DEFAULT_ADMIN_IDENTIFIER=
DEFAULT_ADMIN_PASSWORD=
JWT_SECRET=<test-only-random-value-at-least-32-characters>
```

The approved database and host lists are exact comma-separated allowlists. Do not use wildcards. Keep credentials in a secret store or process environment; do not put them in this document, command history, logs, screenshots, or source control. Do not use the repository's ordinary `.env` as the clone configuration unless every database setting is explicitly overridden for the clone process.

Before application startup, verify the selected schema and server using the clone connection only. Stop if the selected schema is `student_management`, the host is not the disposable host, or either selected value differs from its allowlist. Use a database account scoped only to the clone and limited to the privileges needed for schema creation and application tests.

The supplied dump contains database-selection and table-drop statements. Do not import it verbatim into a MySQL instance that can reach the original server. Preserve the supplied file, prepare a temporary import copy for an empty clone with the database directives rewritten to the unique clone name and the `DROP TABLE` statements removed, then import only on the isolated clone host.

Leave demo seeding disabled and default-admin credentials unset during validation. The ordinary application bootstrap creates missing project workspace tables and may add missing compatibility columns, so run it only after the clone target has passed the preflight checks. The clone-only preflight also applies to database scripts that obtain their pool through `backend/db.js`.
