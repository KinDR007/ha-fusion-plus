import { describe, expect, it } from 'vitest';
import { tokenAllowed } from './token';

const ingress = new Headers({ 'X-Hass-Source': 'core.ingress' });

describe('tokenAllowed', () => {
	it('keeps the token outside the add-on', () => {
		expect(tokenAllowed(false, new Headers(), '192.168.1.20')).toBe(true);
	});

	it('allows Ingress requests from the Supervisor', () => {
		expect(tokenAllowed(true, ingress, '172.30.32.2')).toBe(true);
		expect(tokenAllowed(true, ingress, '::ffff:172.30.32.2')).toBe(true);
	});

	it('rejects the exposed port, even with a forged Ingress header', () => {
		expect(tokenAllowed(true, ingress, '192.168.1.20')).toBe(false);
		expect(tokenAllowed(true, new Headers(), '172.30.32.2')).toBe(false);
		expect(tokenAllowed(true, new Headers(), '192.168.1.20')).toBe(false);
	});
});
