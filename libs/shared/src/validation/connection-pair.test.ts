import { describe, expect, it } from 'vitest';
import { assessConnectionPair } from './connection-pair';

describe('assessConnectionPair', () => {
  it('marks client → client as invalid', () => {
    const r = assessConnectionPair('client_web', 'client_mobile');
    expect(r.status).toBe('invalid');
    expect(r.reasonEn.length).toBeGreaterThan(0);
    expect(r.reasonPt.length).toBeGreaterThan(0);
  });

  it('marks DB → client as invalid', () => {
    expect(assessConnectionPair('sql_db', 'client_web').status).toBe('invalid');
    expect(assessConnectionPair('nosql_db', 'client_mobile').status).toBe('invalid');
  });

  it('marks MQ → client as invalid', () => {
    expect(assessConnectionPair('message_queue', 'client_web').status).toBe('invalid');
    expect(assessConnectionPair('kafka', 'client_web').status).toBe('invalid');
  });

  it('marks client → DB as warn (interview anti-pattern)', () => {
    const r = assessConnectionPair('client_web', 'sql_db');
    expect(r.status).toBe('warn');
  });

  it('marks client → cache as warn', () => {
    expect(assessConnectionPair('client_mobile', 'cache_redis').status).toBe('warn');
  });

  it('allows typical ok paths', () => {
    expect(assessConnectionPair('client_web', 'cdn').status).toBe('ok');
    expect(assessConnectionPair('client_web', 'load_balancer').status).toBe('ok');
    expect(assessConnectionPair('load_balancer', 'app_server').status).toBe('ok');
    expect(assessConnectionPair('app_server', 'cache_redis').status).toBe('ok');
    expect(assessConnectionPair('app_server', 'sql_db').status).toBe('ok');
    expect(assessConnectionPair('app_server', 'message_queue').status).toBe('ok');
    expect(assessConnectionPair('message_queue', 'worker').status).toBe('ok');
    expect(assessConnectionPair('worker', 'sql_db').status).toBe('ok');
  });

  it('warns CDN → DB and observability odd targets', () => {
    expect(assessConnectionPair('cdn', 'sql_db').status).toBe('warn');
    expect(assessConnectionPair('monitoring', 'sql_db').status).toBe('warn');
  });

  it('warns messaging → messaging chains', () => {
    expect(assessConnectionPair('message_queue', 'kafka').status).toBe('warn');
  });
});
