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
