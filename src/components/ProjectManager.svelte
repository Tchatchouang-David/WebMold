<script>
	let {
		projects = [],
		activeProjectId = null,
		loading = false,
		requiresFirstProject = false,
		onCreateProject = () => {},
		onLoadProject = () => {},
		onDeleteProject = () => {},
		onRenameProject = () => {}
	} = $props();

	let newProjectName = $state('');
	let editingProjectId = $state(null);
	let editingProjectName = $state('');

	let projectCountLabel = $derived(
		`${projects.length} ${projects.length === 1 ? 'project' : 'projects'} available in local workspace.`
	);

	function submitCreate() {
		const name = newProjectName.trim();
		if (!name || loading) return;

		onCreateProject(name);
		newProjectName = '';
	}

	function beginRename(project) {
		editingProjectId = project.id;
		editingProjectName = project.name;
	}

	function cancelRename() {
		editingProjectId = null;
		editingProjectName = '';
	}

	function submitRename() {
		const name = editingProjectName.trim();

		if (!editingProjectId || !name) return;

		onRenameProject(editingProjectId, name);
		cancelRename();
	}

	function handleDelete(project) {
		onDeleteProject(project.id);
	}
</script>

<main
	class="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-500 selection:text-white flex flex-col relative overflow-hidden font-sans"
>
	<!-- Soft ambient background -->
	<div
		class="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[450px] bg-gradient-to-b from-indigo-100/70 via-purple-50/50 to-transparent blur-3xl opacity-80"
	></div>

	<div
		class="pointer-events-none absolute top-1/4 -right-40 w-96 h-96 bg-blue-100/50 blur-[100px] rounded-full"
	></div>

	<div
		class="pointer-events-none absolute bottom-12 -left-36 w-80 h-80 bg-indigo-100/40 blur-[90px] rounded-full"
	></div>

	<!-- Header -->
	<header class="relative z-10 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl shadow-sm">
		<div class="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<div>
					<div
						class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold tracking-wider uppercase"
					>
						<span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>

						WebMold
					</div>

					<h1
						class="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3"
					>
						Your projects
					</h1>

					<p class="mt-2 max-w-2xl text-sm md:text-base leading-relaxed text-slate-500">
						Create and manage your visual web projects. Select a project to open the canvas or
						create a fresh one.
					</p>
				</div>

				<div class="flex items-center gap-2 self-start md:self-center">
					<div
						class="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-600 shadow-sm"
					>
						<svg
							class="w-4 h-4 text-emerald-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								d="M5 13l4 4L19 7"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
							></path>
						</svg>

						<span>Local storage synced</span>
					</div>

					<a
						href="https://github.com/Tchatchouang-David/WebMold"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="View WebMold on GitHub (opens in a new tab)"
						class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-white shadow-sm transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
					>
						<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
							<path
								d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
							></path>
						</svg>
						<span>GitHub</span>
					</a>
				</div>
			</div>
		</div>
	</header>

	<!-- Main -->
	<section
		class="relative z-10 mx-auto grid w-full max-w-6xl flex-1 gap-8 px-6 py-8 lg:grid-cols-[1.25fr_0.75fr] items-start"
	>
		<!-- Projects card -->
		<div
			class="rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm shadow-slate-200/50 flex flex-col justify-between"
		>
			<div>
				<div class="flex items-center justify-between gap-4 pb-5 border-b border-slate-100 mb-6">
					<div class="flex items-center gap-3">
						<div class="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
							<svg
								class="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
								></path>
							</svg>
						</div>

						<div>
							<h2 class="text-base font-bold text-slate-900 tracking-tight">All projects</h2>

							<p class="mt-0.5 text-xs text-slate-500 font-medium">
								{requiresFirstProject ? 'You do not have a project yet.' : projectCountLabel}
							</p>
						</div>
					</div>

					<span
						class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700"
					>
						{projects.length} total
					</span>
				</div>

				{#if projects.length === 0}
					<div
						class="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center"
					>
						<div class="max-w-sm">
							<div
								class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600"
							>
								<svg
									class="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path
										d="M12 4v16m8-8H4"
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
									></path>
								</svg>
							</div>

							<h3 class="mt-4 text-sm font-bold text-slate-800">Create your first project</h3>

							<p class="mt-1 text-xs leading-5 text-slate-500">
								Give it a name on the right and your empty canvas will be ready immediately.
							</p>
						</div>
					</div>
				{:else}
					<div class="grid gap-3.5 md:grid-cols-2">
						{#each projects as project (project.id)}
							<article
								class:selectedProject={activeProjectId === project.id}
								class="group relative rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
							>
								{#if editingProjectId === project.id}
									<div class="flex flex-col gap-2">
										<span
											class="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider"
										>
											Renaming project
										</span>

										<div class="flex gap-2 items-center">
											<input
												bind:value={editingProjectName}
												onkeydown={(event) => event.key === 'Enter' && submitRename()}
												autofocus
												class="min-w-0 flex-1 rounded-lg border border-indigo-400 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none ring-2 ring-indigo-500/20 focus:border-indigo-600"
											/>

											<button
												type="button"
												disabled={loading}
												onclick={submitRename}
												class="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
											>
												Save
											</button>
										</div>

										<div class="flex justify-end">
											<button
												type="button"
												onclick={cancelRename}
												class="text-xs text-slate-400 hover:text-slate-600"
											>
												Cancel
											</button>
										</div>
									</div>
								{:else}
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<span
													class="w-2 h-2 rounded-full {activeProjectId === project.id
														? 'bg-indigo-600 animate-pulse'
														: 'bg-slate-300 group-hover:bg-indigo-500'}"
												></span>

												<p
													class="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-950 transition-colors"
												>
													{project.name}
												</p>
											</div>

											{#if activeProjectId === project.id}
												<div
													class="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-100 border border-indigo-200/80 text-[10px] font-semibold text-indigo-700"
												>
													<span class="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>

													Active project
												</div>
											{/if}
										</div>

										<button
											type="button"
											disabled={loading}
											onclick={() => onLoadProject(project.id)}
											class="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-indigo-600 text-slate-700 hover:text-white active:scale-95 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
										>
											Open

											<svg
												class="w-3.5 h-3.5 ml-0.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													d="M14 5l7 7m0 0l-7 7m7-7H3"
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
												></path>
											</svg>
										</button>
									</div>

									<div
										class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500"
									>
										<button
											type="button"
											onclick={() => beginRename(project)}
											class="inline-flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
										>
											<svg
												class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
												></path>
											</svg>

											Edit name
										</button>

										<button
											type="button"
											disabled={loading}
											onclick={() => handleDelete(project)}
											class="inline-flex items-center gap-1.5 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-40"
										>
											<svg
												class="w-3.5 h-3.5 opacity-80"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v-10"
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
												></path>
											</svg>

											Delete
										</button>
									</div>
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<div
				class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500"
			>
				<span class="flex items-center gap-1.5">
					<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
					Instant canvas synchronization
				</span>

				<span class="text-slate-400"> Auto-saved to client DB </span>
			</div>
		</div>

		<!-- Create card -->
		<aside
			class="h-fit rounded-2xl border border-slate-200 bg-white p-6 md:p-7 shadow-sm shadow-slate-200/50 lg:sticky lg:top-8"
		>
			<div class="flex items-center gap-3 mb-1">
				<div class="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
						></path>
					</svg>
				</div>

				<h2 class="text-base font-bold text-slate-900 tracking-tight">Create a new project</h2>
			</div>

			<p class="mt-1 text-xs leading-5 text-slate-500">
				Each project has its own isolated localForage database.
			</p>

			<div class="my-5 border-t border-slate-100"></div>

			<label class="flex flex-col gap-2">
				<span class="text-xs font-semibold text-slate-700"> Project name </span>

				<input
					bind:value={newProjectName}
					onkeydown={(event) => event.key === 'Enter' && submitCreate()}
					autofocus={requiresFirstProject}
					placeholder="e.g. My Next.js Dashboard"
					type="text"
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-sm"
				/>
			</label>

			<button
				type="button"
				disabled={loading || !newProjectName.trim()}
				onclick={submitCreate}
				class="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.98] py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
			>
				<svg
					class="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
					></path>
				</svg>

				{loading ? 'Opening…' : requiresFirstProject ? 'Create first project' : 'Create project'}
			</button>

			<div
				class="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs leading-relaxed text-indigo-900 flex items-start gap-2.5"
			>
				<svg
					class="w-4 h-4 text-indigo-600 shrink-0 mt-0.5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
					></path>
				</svg>

				<div>
					This page is your project entry point. Once you create or select a project, you will be
					directed to
					<strong class="text-indigo-950 font-semibold underline decoration-indigo-400">
						/canvas
					</strong>.
				</div>
			</div>

			<div
				class="mt-6 pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-500 font-medium"
			>
				<div class="flex items-center gap-2">
					<svg
						class="w-4 h-4 text-emerald-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						></path>
					</svg>

					<span>Isolated IndexedDB workspace storage</span>
				</div>

				<div class="flex items-center gap-2">
					<svg
						class="w-4 h-4 text-emerald-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
						></path>
					</svg>

					<span>Real-time state restoration on reload</span>
				</div>
			</div>
		</aside>
	</section>
</main>

<style>
	.selectedProject {
		border-color: rgb(99 102 241 / 0.4);
		background: rgb(238 242 255 / 0.45);
	}
</style>