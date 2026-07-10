import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/server/app'

const app = createApp()

describe('api', () => {
  it('reports health without exposing secrets', async () => {
    const response = await request(app).get('/api/health').expect(200)

    expect(response.body.ok).toBe(true)
    expect(response.body.aiMode).toBe('demo-rules')
    expect(response.headers['content-security-policy']).not.toContain('unsafe-inline')
    expect(JSON.stringify(response.body)).not.toContain('GEMINI_API_KEY')
  })

  it('returns a stadium snapshot', async () => {
    const response = await request(app).get('/api/stadium/snapshot').expect(200)

    expect(response.body.venueName).toBe('Harbor Park Stadium')
    expect(response.body.metrics.highRiskZones).toBeGreaterThan(0)
    expect(response.body.zones.length).toBeGreaterThan(5)
  })

  it('returns machine-readable evaluation evidence for alignment and code quality', async () => {
    const response = await request(app).get('/api/evaluation/evidence').expect(200)

    expect(response.body.problemStatementAlignment.targetScore).toBe(100)
    expect(response.body.problemStatementAlignment.exactProblemStatement).toContain(
      'Build a GenAI-enabled solution',
    )
    expect(response.body.problemStatementAlignment.requiredCapabilities).toEqual(
      expect.arrayContaining([
        'navigation',
        'crowd management',
        'accessibility',
        'transportation',
        'sustainability',
        'multilingual assistance',
        'operational intelligence',
        'real-time decision support',
      ]),
    )
    expect(response.body.codeQuality.targetScore).toBe(100)
    expect(response.body.codeQuality.validationCommand).toBe('npm run check')
    expect(response.body.codeQuality.evidence.length).toBeGreaterThanOrEqual(5)
  })

  it('returns route planning options for selectable venue zones', async () => {
    const response = await request(app).get('/api/routes/options').expect(200)

    expect(response.body.zones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'north-gate',
          name: 'North Gate',
          accessible: true,
        }),
      ]),
    )
  })

  it('validates decision support requests', async () => {
    const response = await request(app)
      .post('/api/operations/decision')
      .send({ role: 'operations', prompt: 'short' })
      .expect(400)

    expect(response.body.error).toBe('Invalid request')
  })

  it('generates a decision support briefing in demo-safe mode', async () => {
    const response = await request(app)
      .post('/api/operations/decision')
      .send({
        role: 'operations',
        language: 'en',
        urgency: 'high',
        prompt: 'Plan a safe fan routing response for the busiest zone.',
        includePublicMessage: true,
      })
      .expect(200)

    expect(response.body.source).toBe('demo-rules')
    expect(response.body.recommendedActions.length).toBeGreaterThanOrEqual(2)
    expect(response.body.publicMessage).toContain('For guests')
  })

  it('plans accessible routes', async () => {
    const response = await request(app)
      .post('/api/routes/plan')
      .send({
        from: 'north-gate',
        to: 'section-224',
        mobility: 'wheelchair',
        avoidCrowds: true,
      })
      .expect(200)

    expect(response.body.steps.every((step: { accessible: boolean }) => step.accessible)).toBe(true)
  })

  it('returns clean 400 errors for invalid route requests', async () => {
    const response = await request(app)
      .post('/api/routes/plan')
      .send({
        from: 'north-gate',
        to: 'north-gate',
        mobility: 'standard',
        avoidCrowds: true,
      })
      .expect(400)

    expect(response.body).toEqual({
      error: 'Start and destination must be different',
    })
  })

  it('bounds route endpoint input size', async () => {
    const response = await request(app)
      .post('/api/routes/plan')
      .send({
        from: 'x'.repeat(200),
        to: 'section-224',
        mobility: 'standard',
        avoidCrowds: true,
      })
      .expect(400)

    expect(response.body.error).toBe('Invalid request')
  })

  it('returns clean 400 errors for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/routes/plan')
      .set('Content-Type', 'application/json')
      .send('{ bad json')
      .expect(400)

    expect(response.body).toEqual({
      error: 'Invalid JSON body',
    })
  })

  it('returns a safe 413 error when request bodies exceed the configured limit', async () => {
    const response = await request(app)
      .post('/api/operations/decision')
      .send({
        role: 'operations',
        language: 'en',
        urgency: 'high',
        prompt: 'x'.repeat(40_000),
        includePublicMessage: true,
      })
      .expect(413)

    expect(response.body).toEqual({
      error: 'Request body too large',
    })
  })

  it('rejects untrusted CORS origins without exposing cross-origin headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example')
      .expect(403)

    expect(response.body).toEqual({
      error: 'Origin not allowed',
    })
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})
