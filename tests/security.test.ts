import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS } from '../src/securityHeaders';

describe('security headers and CI', () => {
  it('publishes nosniff, a referrer policy, and the content security policy', () => {
    const headers = readFileSync('public/_headers', 'utf8');
    expect(headers).toContain(`X-Content-Type-Options: ${SECURITY_HEADERS['X-Content-Type-Options']}`);
    expect(headers).toContain(`Referrer-Policy: ${SECURITY_HEADERS['Referrer-Policy']}`);
    expect(headers).toContain(`Content-Security-Policy: ${SECURITY_HEADERS['Content-Security-Policy']}`);
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src 'self'");
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain('https://gibs.earthdata.nasa.gov');
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(headers).toContain(`Permissions-Policy: ${SECURITY_HEADERS['Permissions-Policy']}`);
    expect(headers).toContain(`Strict-Transport-Security: ${SECURITY_HEADERS['Strict-Transport-Security']}`);
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=()');
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('pins actions by commit and grants only contents read', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(workflow).toMatch(/permissions:\n {2}contents: read/);
    expect(workflow).toMatch(/actions\/checkout@[0-9a-f]{40}/);
    expect(workflow).toMatch(/actions\/setup-node@[0-9a-f]{40}/);
    expect(workflow).not.toMatch(/uses:\s+actions\/[a-z0-9-]+@v\d/);
    expect(workflow).not.toMatch(/contents:\s+write/);
    expect(workflow).not.toMatch(/cache:\s*npm/);
    expect(workflow).toContain('webkit');
  });
});
