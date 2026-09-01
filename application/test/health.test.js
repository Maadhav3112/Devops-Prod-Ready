const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../server');

// These tests only cover routes that don't require a live DB connection,
// so they can run in CI without a MongoDB service.

test('GET /health returns 200 and status ok', async () => {
  const res = await request(app).get('/health');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'ok');
});

test('GET /api returns API info', async () => {
  const res = await request(app).get('/api');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.endpoints);
});

test('GET / serves the frontend', async () => {
  const res = await request(app).get('/');
  assert.strictEqual(res.statusCode, 200);
  assert.match(res.headers['content-type'], /html/);
});

test('GET /unknown-route returns 404', async () => {
  const res = await request(app).get('/unknown-route');
  assert.strictEqual(res.statusCode, 404);
});

// --- V2 additions: validation runs before any DB access, so these are
// safe to test without a live MongoDB connection. ---

test('POST /api/employees rejects an invalid status value', async () => {
  const res = await request(app)
    .post('/api/employees')
    .send({ name: 'Test User', email: 'test@example.com', department: 'Engineering', status: 'Retired' });
  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.error, /Status must be one of/);
});

test('POST /api/employees accepts a request with no status (V1-style payload)', async () => {
  // A payload with no `status` field at all must still pass validation,
  // since V1 clients never send this field.
  const res = await request(app)
    .post('/api/employees')
    .send({ name: '', email: 'bad-email', department: '' });
  // Fails on the pre-existing V1 fields, not because status is missing.
  assert.strictEqual(res.statusCode, 400);
  assert.ok(!/status/i.test(res.body.error));
});

test('GET /api/employees rejects an invalid status filter', async () => {
  const res = await request(app).get('/api/employees?status=NotARealStatus');
  assert.strictEqual(res.statusCode, 400);
});

test('GET /api returns V2.1 endpoints including departments and roles', async () => {
  const res = await request(app).get('/api');
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.endpoints.employeeStats);
  assert.ok(res.body.endpoints.employeeExport);
  assert.ok(res.body.endpoints.departments);
  assert.ok(res.body.endpoints.roles);
});

test('POST /api/departments rejects an empty name', async () => {
  const res = await request(app).post('/api/departments').send({ name: '  ' });
  assert.strictEqual(res.statusCode, 400);
});

test('POST /api/roles rejects an empty name', async () => {
  const res = await request(app).post('/api/roles').send({ name: '' });
  assert.strictEqual(res.statusCode, 400);
});
