import { recordVisit } from '$lib/server/visitors';

// Not a session id or anything identifying - just a "have we already counted
// this browser" flag, so refreshing or clicking between pages doesn't
// increment the total on every navigation.
const VISITOR_COOKIE = 'wm_counted';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// By default, SvelteKit's `load` functions run on the server, It shall be automatically called on page load.
//It has 2 params, sveltekit will automatically pass the cookies and getClientAddress to the load function based on 
// the incoming request data from the client.
export async function load({ cookies, getClientAddress }) {
	if (!cookies.get(VISITOR_COOKIE)) {
		cookies.set(VISITOR_COOKIE, '1', {
			path: '/',
			maxAge: COOKIE_MAX_AGE,
			httpOnly: true,
			sameSite: 'lax'
		});

		try {
			// getClientAddress() is SvelteKit's platform-aware way to read the
			// real connecting IP (proxy-aware on supported adapters) rather than
			// trusting a spoofable header directly.
			await recordVisit(getClientAddress());
		} catch (error) {
			// A failed count should never break page rendering.
			console.error('Visitor count failed:', error);
		}
	}

	return {};
}
