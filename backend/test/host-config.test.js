const test = require('node:test');
const assert = require('node:assert/strict');
const { __test } = require('../index');

test('uses the configured HOST for the backend bind address', () => {
  assert.equal(__test.getHost({ HOST: '127.0.0.1' }), '127.0.0.1');
});

test('preserves the deployment bind address when HOST is unset or empty', () => {
  assert.equal(__test.getHost({}), '0.0.0.0');
  assert.equal(__test.getHost({ HOST: '' }), '0.0.0.0');
});
