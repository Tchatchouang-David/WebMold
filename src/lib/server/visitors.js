import { createClient } from '@libsql/client';

/**
 * SQLite (via libSQL/Turso), not a local file. A plain SQLite file has the
 * same problem as the JSON version this replaces: Vercel's serverless
 * functions run on an ephemeral, mostly-read-only filesystem, so a local
 * `.db` file would get reset just as often as a JSON file would.
 *
 * `@libsql/client` speaks the same API to a local file *or* a remote
 * Turso database - only the connection URL changes:
 *
 *   - Locally (no env vars set): a real SQLite file at `data/visitors.db`,
 *     for zero-setup `npm run dev`. Deliberately outside `src/` so writing
 *     to it doesn't trigger Vite's file watcher on every page view.
 *   - In production: set DATABASE_URL to your Turso database's `libsql://`
 *     URL and DATABASE_AUTH_TOKEN to its token (both from `turso db show` /
 *     the Turso dashboard), as Vercel project env vars. Free tier is plenty
 *     for a visitor counter. See https://turso.tech/app - once a database
 *     exists, `turso db tokens create <db-name>` gives you the auth token.
 */
const client = createClient({
	url: process.env.DATABASE_URL || 'file:./data/visitors.db',
	authToken: process.env.DATABASE_AUTH_TOKEN
});

// Runs once per warm server instance rather than on every request/call.
let ready;
function ensureTable() {
	if (!ready) {
		ready = client.execute(
			`CREATE TABLE IF NOT EXISTS visitors (
				country TEXT PRIMARY KEY,
				count INTEGER NOT NULL DEFAULT 0
			)`
		);
	}
	return ready;
}

/**
 * Atomic upsert-increment: SQLite handles the read-modify-write itself in
 * one statement, so concurrent visits can't race each other the way they
 * could with a hand-rolled read-JSON/write-JSON cycle - no app-level lock
 * or write queue needed.
 */
async function incrementCountryCount(country) {
	await ensureTable();
	await client.execute({
		sql: `INSERT INTO visitors (country, count) VALUES (?, 1)
			ON CONFLICT(country) DO UPDATE SET count = count + 1`,
		args: [country]
	});
}

/**
 * True for any IP in a range IANA reserves for loopback/private/link-local
 * use - these are never assigned to a real country, so there's nothing to
 * geolocate and no point calling country.is for them.
 */
function isPrivateOrLocalIp(rawIp) {
	if (!rawIp) return true;

	// A dual-stack Node socket can report an IPv4 client as an IPv4-mapped
	// IPv6 address ("::ffff:127.0.0.1") instead of plain "127.0.0.1" - unwrap
	// that first so the IPv4 range checks below still catch it.
	const ip = rawIp.toLowerCase().startsWith('::ffff:') ? rawIp.slice(7) : rawIp;

	if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true; // IPv6 loopback
	if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true; // fc00::/7 unique local
	if (/^fe[89ab][0-9a-f]:/i.test(ip)) return true; // fe80::/10 link-local

	const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
	if (ipv4) {
		const a = Number(ipv4[1]);
		const b = Number(ipv4[2]);
		if (a === 127) return true; // 127.0.0.0/8 loopback
		if (a === 10) return true; // 10.0.0.0/8 private
		if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
		if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private (e.g. Docker)
		if (a === 0) return true; // 0.0.0.0/8 "this network"
	}

	return false;
}

/**
 * Resolve an IP to its two-letter country code via country.is, then forget
 * the IP. This is the only place the raw IP is ever read: it lives in the
 * `ip` parameter of this call and is discarded when the function returns -
 * it is never logged, never written to disk, and never passed anywhere else.
 */
async function resolveCountry(ip) {
	if (isPrivateOrLocalIp(ip)) return null; // localhost/LAN: no geolocation exists

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 3000);
	try {
		const response = await fetch(`https://api.country.is/${ip}`, { signal: controller.signal });
		if (!response.ok) return null;
		const data = await response.json();
		return typeof data?.country === 'string' && /^[A-Z]{2}$/.test(data.country)
			? data.country
			: null;
	} catch {
		// country.is unreachable, rate-limited, or timed out - fail open rather
		// than blocking or breaking the page.
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Record one visit: look up the visitor's country from their IP, then persist
 * only `{ country, +1 }`. Call sites should pass a raw IP straight from
 * `event.getClientAddress()`; nothing here stores it.
 */
export async function recordVisit(ip) {
	const country = (await resolveCountry(ip)) || 'Unknown';
	await incrementCountryCount(country);
}

/** Read-only: [{ country, visitors }], highest count first. */
export async function getVisitorCounts() {
	await ensureTable();
	const result = await client.execute(
		'SELECT country, count AS visitors FROM visitors ORDER BY count DESC'
	);
	return result.rows.map((row) => ({ country: row.country, visitors: Number(row.visitors) }));
}