/** Supervisor address that proxies Ingress, see developers.home-assistant.io docs/apps/presentation.md */
const SUPERVISOR = '172.30.32.2';

/**
 * Whether the long-lived token from configuration.yaml may be sent to the
 * browser. Outside the add-on the user controls who reaches the port. Inside
 * it only Ingress requests are authenticated by Home Assistant; the header
 * alone can be forged on an exposed port, the Supervisor address cannot.
 */
export function tokenAllowed(addon: boolean, headers: Headers, clientAddress: string): boolean {
	if (!addon) return true;
	const address = clientAddress.replace(/^::ffff:/, '');
	return address === SUPERVISOR && headers.get('x-hass-source') === 'core.ingress';
}
