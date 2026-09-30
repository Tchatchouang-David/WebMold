import { getVisitorCounts } from '$lib/server/visitors';

export async function load() {
	const counts = await getVisitorCounts();
	const total = counts.reduce((sum, row) => sum + row.visitors, 0);
	return { counts, total };
}
