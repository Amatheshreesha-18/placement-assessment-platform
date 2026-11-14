const request = require('supertest');
const app = require('../src/app');

describe('API Security and Validation Middleware', () => {
  it('POST /api/v1/auth/register should fail with 400 when missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toBeInstanceOf(Array);
  });

  it('POST /api/v1/auth/login should fail with 400 for empty payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  it('GET /api/v1/students/profile should reject with 401 when no auth token is provided', async () => {
    const res = await request(app).get('/api/v1/students/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Bearer');
  });

  it('GET /api/v1/resources should reject with 401 when no auth token is provided', async () => {
    const res = await request(app).get('/api/v1/resources');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/placements should reject with 401 without auth token', async () => {
    const res = await request(app).post('/api/v1/placements').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
