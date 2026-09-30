<script>
	let { data } = $props();

	const regionNames = (() => {
		try {
			return new Intl.DisplayNames(['en'], { type: 'region' });
		} catch {
			return null;
		}
	})();

	function countryName(code) {
		if (code === 'Unknown') return 'Unknown';
		return regionNames?.of(code) ?? code;
	}

	let maxVisitors = $derived(data.counts.reduce((max, row) => Math.max(max, row.visitors), 0));
</script>

<svelte:head>
	<title>Visitors · Webmold</title>
</svelte:head>

<main class="min-h-screen bg-slate-50 px-6 py-10 font-roboto text-slate-800">
	<div class="mx-auto max-w-2xl">
		<header class="mb-8">
			<h1 class="text-xl font-bold">Visitors by country</h1>
			<p class="mt-1 text-sm text-slate-500">
				{data.total.toLocaleString()}
				{data.total === 1 ? 'visit' : 'visits'} counted across {data.counts.length}
				{data.counts.length === 1 ? 'country' : 'countries'}.
			</p>
		</header>

		{#if data.counts.length === 0}
			<p class="rounded-lg border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
				No visits recorded yet.
			</p>
		{:else}
			<div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
				<table class="w-full text-left text-sm">
					<thead>
						<tr class="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
							<th class="px-4 py-2 font-semibold">Country</th>
							<th class="px-4 py-2 font-semibold text-right">Visitors</th>
						</tr>
					</thead>
					<tbody>
						{#each data.counts as row (row.country)}
							<tr class="border-b border-slate-100 last:border-0">
								<td class="px-4 py-3">
									<div class="flex items-center justify-between gap-3">
										<span class="font-medium">{countryName(row.country)}</span>
										<span class="text-xs text-slate-400">{row.country}</span>
									</div>
									<div class="mt-1.5 h-1 w-full rounded-full bg-slate-100">
										<div
											class="h-1 rounded-full bg-blue-500"
											style="width: {maxVisitors ? (row.visitors / maxVisitors) * 100 : 0}%"
										></div>
									</div>
								</td>
								<td class="px-4 py-3 text-right font-semibold tabular-nums">{row.visitors}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</main>
