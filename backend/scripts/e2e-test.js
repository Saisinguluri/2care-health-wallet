/**
 * Postman-style end-to-end API test suite for 2care Health Wallet
 * Run: node scripts/e2e-test.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE = process.env.API_URL || 'http://localhost:5000/api';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_FILE = path.join(__dirname, 'fixtures/test-report.txt');

const results = [];
let passed = 0;
let failed = 0;

function log(icon, name, detail = '') {
  const line = `${icon} ${name}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  results.push({ icon, name, detail });
}

function assert(condition, name, detail = '') {
  if (condition) {
    passed++;
    log('✅', name, detail);
    return true;
  }
  failed++;
  log('❌', name, detail);
  return false;
}

async function request(method, url, { token, body, formData, expectStatus } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (formData) options.body = formData;
  else if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${url}`, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else if (contentType.includes('octet') || contentType.includes('pdf') || contentType.includes('text')) {
    data = await res.arrayBuffer();
  }

  if (expectStatus !== undefined && res.status !== expectStatus) {
    throw new Error(`${method} ${url} expected ${expectStatus}, got ${res.status}: ${JSON.stringify(data)}`);
  }

  return { status: res.status, data, headers: res.headers };
}

async function run() {
  console.log('\n🧪 2care API — End-to-End Test Suite');
  console.log(`   Base URL: ${BASE}\n`);
  console.log('─'.repeat(60));

  const ts = Date.now();
  const ownerEmail = `e2e-owner-${ts}@test.demo`;
  const viewerEmail = `e2e-viewer-${ts}@test.demo`;
  const password = 'testpass123';

  let ownerToken, viewerToken, reportId, vitalId, shareId;

  // ─── 1. HEALTH ───────────────────────────────────────────
  console.log('\n📋 1. Health & Public');
  try {
    const { status, data } = await request('GET', '/health'.replace('/api', '') === '/health' ? '/../health' : '/health');
  } catch {
    // health is at /api/health via base - fix: BASE is /api so use /health won't work
  }
  try {
    const res = await fetch('http://localhost:5000/api/health');
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'GET /api/health', `status=${data.status}`);
  } catch (e) {
    assert(false, 'GET /api/health', e.message);
  }

  // ─── 2. AUTH ───────────────────────────────────────────────
  console.log('\n📋 2. Authentication');

  // Register owner
  try {
    const { status, data } = await request('POST', '/auth/register', {
      body: { name: 'E2E Owner', email: ownerEmail, password, role: 'owner' },
      expectStatus: 201,
    });
    assert(data.user?.email === ownerEmail, 'POST /auth/register (owner)', ownerEmail);
    assert(!!data.token, 'POST /auth/register returns JWT');
    ownerToken = data.token;
  } catch (e) {
    assert(false, 'POST /auth/register (owner)', e.message);
  }

  // Register viewer
  try {
    const { data } = await request('POST', '/auth/register', {
      body: { name: 'E2E Viewer', email: viewerEmail, password, role: 'viewer' },
      expectStatus: 201,
    });
    assert(data.user?.role === 'viewer', 'POST /auth/register (viewer)', 'role=viewer');
    viewerToken = data.token;
  } catch (e) {
    assert(false, 'POST /auth/register (viewer)', e.message);
  }

  // Duplicate register
  try {
    await request('POST', '/auth/register', {
      body: { name: 'Dup', email: ownerEmail, password },
      expectStatus: 409,
    });
    assert(true, 'POST /auth/register duplicate → 409');
  } catch (e) {
    assert(false, 'POST /auth/register duplicate → 409', e.message);
  }

  // Login
  try {
    const { data } = await request('POST', '/auth/login', {
      body: { email: ownerEmail, password },
      expectStatus: 200,
    });
    assert(!!data.token, 'POST /auth/login', ownerEmail);
    ownerToken = data.token;
  } catch (e) {
    assert(false, 'POST /auth/login', e.message);
  }

  // Bad login
  try {
    await request('POST', '/auth/login', {
      body: { email: ownerEmail, password: 'wrong' },
      expectStatus: 401,
    });
    assert(true, 'POST /auth/login wrong password → 401');
  } catch (e) {
    assert(false, 'POST /auth/login wrong password → 401', e.message);
  }

  // GET /me
  try {
    const { data } = await request('GET', '/auth/me', { token: ownerToken, expectStatus: 200 });
    assert(data.user?.email === ownerEmail, 'GET /auth/me', data.user?.name);
  } catch (e) {
    assert(false, 'GET /auth/me', e.message);
  }

  // No token
  try {
    await request('GET', '/auth/me', { expectStatus: 401 });
    assert(true, 'GET /auth/me without token → 401');
  } catch (e) {
    assert(false, 'GET /auth/me without token → 401', e.message);
  }

  // ─── 3. USERS / DASHBOARD ──────────────────────────────────
  console.log('\n📋 3. Users & Dashboard');

  try {
    const { data } = await request('GET', '/users/dashboard', { token: ownerToken, expectStatus: 200 });
    assert(typeof data.stats?.reportCount === 'number', 'GET /users/dashboard', `reports=${data.stats.reportCount}`);
  } catch (e) {
    assert(false, 'GET /users/dashboard', e.message);
  }

  try {
    const { data } = await request('GET', '/users/search?email=viewer', { token: ownerToken, expectStatus: 200 });
    assert(Array.isArray(data.users), 'GET /users/search', `found=${data.users.length}`);
  } catch (e) {
    assert(false, 'GET /users/search', e.message);
  }

  // Viewer cannot search
  try {
    await request('GET', '/users/search?email=owner', { token: viewerToken, expectStatus: 403 });
    assert(true, 'GET /users/search as viewer → 403');
  } catch (e) {
    assert(false, 'GET /users/search as viewer → 403', e.message);
  }

  // ─── 4. REPORT TYPES ───────────────────────────────────────
  console.log('\n📋 4. Reports');

  try {
    const { data } = await request('GET', '/reports/meta/types', { token: ownerToken, expectStatus: 200 });
    assert(data.reportTypes?.length > 0, 'GET /reports/meta/types', `${data.reportTypes.length} types`);
  } catch (e) {
    assert(false, 'GET /reports/meta/types', e.message);
  }

  // Create test fixture (PDF-like content saved as txt for test; we'll use a minimal PNG)
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pngBuffer = Buffer.from(pngBase64, 'base64');
  const pngPath = path.join(__dirname, 'fixtures/test-report.png');
  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  fs.writeFileSync(pngPath, pngBuffer);

  // Upload report
  try {
    const form = new FormData();
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    form.append('file', blob, 'e2e-test-report.png');
    form.append('title', 'E2E Test Blood Panel');
    form.append('report_type', 'blood_test');
    form.append('report_date', '2025-06-01');
    form.append('notes', 'Automated E2E test report');
    form.append(
      'vitals',
      JSON.stringify([
        { vital_type: 'blood_sugar', value: 110, recorded_at: '2025-06-01T10:00:00.000Z' },
        { vital_type: 'heart_rate', value: 78, recorded_at: '2025-06-01T10:00:00.000Z' },
      ])
    );

    const { status, data } = await request('POST', '/reports', {
      token: ownerToken,
      formData: form,
      expectStatus: 201,
    });
    reportId = data.report?.id;
    assert(!!reportId, 'POST /reports (upload)', `id=${reportId}, vitals=${data.report?.vitals?.length}`);
  } catch (e) {
    assert(false, 'POST /reports (upload)', e.message);
  }

  // List reports
  try {
    const { data } = await request('GET', '/reports', { token: ownerToken, expectStatus: 200 });
    assert(data.reports?.some((r) => r.id === reportId), 'GET /reports', `total=${data.reports.length}`);
  } catch (e) {
    assert(false, 'GET /reports', e.message);
  }

  // Filter reports
  try {
    const { data } = await request('GET', '/reports?reportType=blood_test&dateFrom=2025-01-01', {
      token: ownerToken,
      expectStatus: 200,
    });
    assert(data.reports?.length > 0, 'GET /reports?reportType&dateFrom filter');
  } catch (e) {
    assert(false, 'GET /reports?reportType&dateFrom filter', e.message);
  }

  // Filter by vital
  try {
    const { data } = await request('GET', '/reports?vitalType=blood_sugar', {
      token: ownerToken,
      expectStatus: 200,
    });
    assert(data.reports?.some((r) => r.id === reportId), 'GET /reports?vitalType filter');
  } catch (e) {
    assert(false, 'GET /reports?vitalType filter', e.message);
  }

  // Get report by id
  try {
    const { data } = await request('GET', `/reports/${reportId}`, { token: ownerToken, expectStatus: 200 });
    assert(data.report?.title === 'E2E Test Blood Panel', 'GET /reports/:id', `access=${data.access}`);
  } catch (e) {
    assert(false, 'GET /reports/:id', e.message);
  }

  // Update report
  try {
    const { data } = await request('PATCH', `/reports/${reportId}`, {
      token: ownerToken,
      body: { title: 'E2E Test Blood Panel (Updated)', notes: 'Updated via E2E' },
      expectStatus: 200,
    });
    assert(data.report?.title.includes('Updated'), 'PATCH /reports/:id');
  } catch (e) {
    assert(false, 'PATCH /reports/:id', e.message);
  }

  // Download report
  try {
    const res = await fetch(`${BASE}/reports/${reportId}/download`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const buf = await res.arrayBuffer();
    assert(res.status === 200 && buf.byteLength > 0, 'GET /reports/:id/download', `${buf.byteLength} bytes`);
  } catch (e) {
    assert(false, 'GET /reports/:id/download', e.message);
  }

  // Viewer cannot upload
  try {
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'x.png');
    form.append('title', 'X');
    form.append('report_type', 'other');
    form.append('report_date', '2025-06-01');
    await request('POST', '/reports', { token: viewerToken, formData: form, expectStatus: 403 });
    assert(true, 'POST /reports as viewer → 403');
  } catch (e) {
    assert(false, 'POST /reports as viewer → 403', e.message);
  }

  // ─── 5. VITALS ─────────────────────────────────────────────
  console.log('\n📋 5. Vitals');

  try {
    const { data } = await request('POST', '/vitals', {
      token: ownerToken,
      body: {
        vital_type: 'weight',
        value: 70.5,
        recorded_at: '2025-06-07T08:00:00.000Z',
        notes: 'E2E manual entry',
      },
      expectStatus: 201,
    });
    vitalId = data.vital?.id;
    assert(!!vitalId, 'POST /vitals', `id=${vitalId}, value=${data.vital?.value}`);
  } catch (e) {
    assert(false, 'POST /vitals', e.message);
  }

  try {
    const { data } = await request('GET', '/vitals?vitalType=weight', { token: ownerToken, expectStatus: 200 });
    assert(data.vitals?.some((v) => v.id === vitalId), 'GET /vitals', `count=${data.vitals.length}`);
  } catch (e) {
    assert(false, 'GET /vitals', e.message);
  }

  try {
    const { data } = await request('GET', '/vitals/trends?vitalType=blood_sugar', {
      token: ownerToken,
      expectStatus: 200,
    });
    assert(data.data?.length > 0, 'GET /vitals/trends', `${data.data.length} data points`);
  } catch (e) {
    assert(false, 'GET /vitals/trends', e.message);
  }

  try {
    const { data } = await request('GET', '/vitals/summary', { token: ownerToken, expectStatus: 200 });
    assert(data.summary?.length > 0, 'GET /vitals/summary', `${data.summary.length} vital types`);
  } catch (e) {
    assert(false, 'GET /vitals/summary', e.message);
  }

  // Viewer cannot add vitals
  try {
    await request('POST', '/vitals', {
      token: viewerToken,
      body: { vital_type: 'weight', value: 80, recorded_at: '2025-06-07T08:00:00.000Z' },
      expectStatus: 403,
    });
    assert(true, 'POST /vitals as viewer → 403');
  } catch (e) {
    assert(false, 'POST /vitals as viewer → 403', e.message);
  }

  // ─── 6. SHARING ────────────────────────────────────────────
  console.log('\n📋 6. Sharing & Access Control');

  try {
    const { data } = await request('POST', '/shares', {
      token: ownerToken,
      body: { report_id: reportId, viewer_email: viewerEmail },
      expectStatus: 201,
    });
    shareId = data.share?.id;
    assert(!!shareId, 'POST /shares', `shareId=${shareId}, viewer=${data.share?.viewer_email}`);
  } catch (e) {
    assert(false, 'POST /shares', e.message);
  }

  // Duplicate share
  try {
    await request('POST', '/shares', {
      token: ownerToken,
      body: { report_id: reportId, viewer_email: viewerEmail },
      expectStatus: 409,
    });
    assert(true, 'POST /shares duplicate → 409');
  } catch (e) {
    assert(false, 'POST /shares duplicate → 409', e.message);
  }

  try {
    const { data } = await request('GET', '/shares/sent', { token: ownerToken, expectStatus: 200 });
    assert(data.shares?.some((s) => s.id === shareId), 'GET /shares/sent', `count=${data.shares.length}`);
  } catch (e) {
    assert(false, 'GET /shares/sent', e.message);
  }

  // Re-login viewer for fresh token
  try {
    const { data } = await request('POST', '/auth/login', {
      body: { email: viewerEmail, password },
      expectStatus: 200,
    });
    viewerToken = data.token;
  } catch { /* ignore */ }

  try {
    const { data } = await request('GET', '/shares/received', { token: viewerToken, expectStatus: 200 });
    assert(data.shares?.some((s) => s.report_id === reportId), 'GET /shares/received', `count=${data.shares.length}`);
  } catch (e) {
    assert(false, 'GET /shares/received', e.message);
  }

  // Viewer can read shared report
  try {
    const { data } = await request('GET', `/reports/${reportId}`, { token: viewerToken, expectStatus: 200 });
    assert(data.access === 'viewer', 'GET /reports/:id as viewer', 'read-only access');
  } catch (e) {
    assert(false, 'GET /reports/:id as viewer', e.message);
  }

  // Viewer can download shared report
  try {
    const res = await fetch(`${BASE}/reports/${reportId}/download`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert(res.status === 200, 'GET /reports/:id/download as viewer', `status=${res.status}`);
  } catch (e) {
    assert(false, 'GET /reports/:id/download as viewer', e.message);
  }

  // Viewer cannot delete report
  try {
    await request('DELETE', `/reports/${reportId}`, { token: viewerToken, expectStatus: 403 });
    assert(true, 'DELETE /reports/:id as viewer → 403');
  } catch (e) {
    assert(false, 'DELETE /reports/:id as viewer → 403', e.message);
  }

  // Viewer cannot access unshared report (use demo seed report if exists, or skip)
  try {
    const { data: ownerReports } = await request('GET', '/reports', { token: ownerToken, expectStatus: 200 });
    const unshared = ownerReports.reports?.find((r) => r.id !== reportId);
    if (unshared) {
      await request('GET', `/reports/${unshared.id}`, { token: viewerToken, expectStatus: 404 });
      assert(true, 'GET unshared report as viewer → 404');
    } else {
      log('⏭️', 'GET unshared report as viewer → 404', 'skipped (no other reports)');
    }
  } catch (e) {
    assert(false, 'GET unshared report as viewer → 404', e.message);
  }

  // Revoke share
  try {
    await request('DELETE', `/shares/${shareId}`, { token: ownerToken, expectStatus: 200 });
    assert(true, 'DELETE /shares/:id (revoke)');
  } catch (e) {
    assert(false, 'DELETE /shares/:id (revoke)', e.message);
  }

  // Viewer loses access after revoke
  try {
    await request('GET', `/reports/${reportId}`, { token: viewerToken, expectStatus: 404 });
    assert(true, 'GET /reports/:id after revoke → 404');
  } catch (e) {
    assert(false, 'GET /reports/:id after revoke → 404', e.message);
  }

  // ─── 7. CLEANUP ─────────────────────────────────────────────
  console.log('\n📋 7. Cleanup');

  try {
    await request('DELETE', `/vitals/${vitalId}`, { token: ownerToken, expectStatus: 200 });
    assert(true, 'DELETE /vitals/:id');
  } catch (e) {
    assert(false, 'DELETE /vitals/:id', e.message);
  }

  try {
    await request('DELETE', `/reports/${reportId}`, { token: ownerToken, expectStatus: 200 });
    assert(true, 'DELETE /reports/:id');
  } catch (e) {
    assert(false, 'DELETE /reports/:id', e.message);
  }

  // Confirm deleted
  try {
    await request('GET', `/reports/${reportId}`, { token: ownerToken, expectStatus: 404 });
    assert(true, 'GET /reports/:id after delete → 404');
  } catch (e) {
    assert(false, 'GET /reports/:id after delete → 404', e.message);
  }

  // ─── 8. DEMO ACCOUNTS (seed data) ───────────────────────────
  console.log('\n📋 8. Demo Seed Accounts');

  try {
    const { data } = await request('POST', '/auth/login', {
      body: { email: 'owner@2care.demo', password: 'demo1234' },
      expectStatus: 200,
    });
    assert(!!data.token, 'POST /auth/login demo owner');

    const { data: dash } = await request('GET', '/users/dashboard', {
      token: data.token,
      expectStatus: 200,
    });
    assert(dash.stats?.reportCount >= 0, 'Demo owner dashboard', `reports=${dash.stats.reportCount}, vitals=${dash.stats.vitalCount}`);
  } catch (e) {
    assert(false, 'Demo seed accounts', e.message);
  }

  try {
    const { data } = await request('POST', '/auth/login', {
      body: { email: 'doctor@2care.demo', password: 'demo1234' },
      expectStatus: 200,
    });
    const { data: received } = await request('GET', '/shares/received', {
      token: data.token,
      expectStatus: 200,
    });
    assert(received.shares?.length >= 0, 'Demo doctor shared reports', `received=${received.shares.length}`);
  } catch (e) {
    assert(false, 'Demo doctor viewer flow', e.message);
  }

  // ─── SUMMARY ────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Review output above.\n');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('\n💥 Test suite crashed:', err.message);
  process.exit(1);
});
