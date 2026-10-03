<script>
	import ThemeToggle from './ThemeToggle.svelte';

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
	class="relative flex min-h-screen flex-col overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased transition-colors duration-300 selection:bg-indigo-500 selection:text-white dark:bg-slate-950 dark:text-slate-200"
>
	<!-- Soft ambient background -->
	<div class="dot-grid pointer-events-none absolute inset-0"></div>

	<div
		class="pointer-events-none absolute -top-40 left-1/2 h-[450px] w-[1100px] -translate-x-1/2 bg-gradient-to-b from-indigo-100/70 via-purple-50/50 to-transparent opacity-80 blur-3xl dark:from-indigo-500/25 dark:via-purple-500/10 dark:opacity-100"
	></div>

	<div
		class="pointer-events-none absolute top-1/4 -right-40 h-96 w-96 rounded-full bg-blue-100/50 blur-[100px] dark:bg-blue-500/10"
	></div>

	<div
		class="pointer-events-none absolute bottom-12 -left-36 h-80 w-80 rounded-full bg-indigo-100/40 blur-[90px] dark:bg-violet-500/10"
	></div>

	<!-- Header -->
	<header
		class="relative z-10 border-b border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-none"
	>
		<div class="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
			<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div class="flex items-start gap-4">
					<img
						src="/favicon.png"
						alt=""
						class="hidden h-14 w-14 shrink-0 rounded-2xl shadow-lg shadow-indigo-500/25 ring-1 ring-slate-900/5 sm:block dark:shadow-indigo-500/20 dark:ring-white/10"
					/>

					<div>
						<div
							class="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50 px-3 py-1 text-xs font-semibold tracking-wider text-indigo-700 uppercase dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300"
						>
							<span
								class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-400"
							></span>

							WebMold
						</div>

						<h1
							class="mt-3 flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl dark:text-white"
						>
							Your projects
						</h1>

						<p
							class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 md:text-base dark:text-slate-400"
						>
							Create and manage your visual web projects. Select a project to open the canvas or
							create a fresh one.
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2 self-start md:self-center">
					<div
						class="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium whitespace-nowrap text-slate-600 shadow-sm xl:flex dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:shadow-none"
					>
						<svg
							class="h-4 w-4 text-emerald-600 dark:text-emerald-400"
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

					<!-- Theme toggle: lives here because this is the first page shown at "/". -->
					<ThemeToggle />

					<a
						href="https://github.com/Tchatchouang-David/WebMold"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="View WebMold on GitHub (opens in a new tab)"
						class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20 active:scale-95 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:focus-visible:ring-white/30"
					>
						<svg class="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
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
		class="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-start gap-8 px-6 py-8 lg:grid-cols-[1.25fr_0.75fr]"
	>
		<!-- Projects card -->
		<div
			class="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 transition-colors duration-300 md:p-7 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none"
		>
			<div>
				<div
					class="mb-6 flex items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800"
				>
					<div class="flex items-center gap-3">
						<div
							class="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300"
						>
							<svg
								class="h-4 w-4"
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
							<h2 class="text-base font-bold tracking-tight text-slate-900 dark:text-white">
								All projects
							</h2>

							<p class="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
								{requiresFirstProject ? 'You do not have a project yet.' : projectCountLabel}
							</p>
						</div>
					</div>

					<span
						class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
					>
						{projects.length} total
					</span>
				</div>

				{#if projects.length === 0}
					<div
						class="flex min-h-[20rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center dark:border-slate-700 dark:bg-slate-950/40"
					>
						<div class="max-w-sm">
							<div
								class="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300"
							>
								<svg
									class="h-5 w-5"
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

							<h3 class="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
								Create your first project
							</h3>

							<p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
								Give it a name on the right and your empty canvas will be ready immediately.
							</p>
						</div>
					</div>
				{:else}
					<div class="grid gap-3.5 md:grid-cols-2">
						{#each projects as project (project.id)}
							<article
								class:selectedProject={activeProjectId === project.id}
								class="group relative rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60 dark:hover:shadow-black/30"
							>
								{#if editingProjectId === project.id}
									<div class="flex flex-col gap-2">
										<span
											class="text-[11px] font-semibold tracking-wider text-indigo-600 uppercase dark:text-indigo-300"
										>
											Renaming project
										</span>

										<div class="flex items-center gap-2">
											<input
												bind:value={editingProjectName}
												onkeydown={(event) => event.key === 'Enter' && submitRename()}
												autofocus
												aria-label="Project name"
												class="min-w-0 flex-1 rounded-lg border border-indigo-400 bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-2 ring-indigo-500/20 outline-none focus:border-indigo-600 dark:border-indigo-400/60 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400"
											/>

											<button
												type="button"
												disabled={loading}
												onclick={submitRename}
												class="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
											>
												Save
											</button>
										</div>

										<div class="flex justify-end">
											<button
												type="button"
												onclick={cancelRename}
												class="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
											>
												Cancel
											</button>
										</div>
									</div>
								{:else}
									<div class="flex items-start gap-3">
										<div class="flex min-w-0 flex-1 items-start gap-3">
											<div
												class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-sm shadow-indigo-500/30"
												aria-hidden="true"
											>
												{project.name.trim().charAt(0).toUpperCase() || '?'}
											</div>

											<div class="min-w-0 flex-1">
												<div class="flex items-center gap-2">
													<span
														class="h-2 w-2 shrink-0 rounded-full {activeProjectId === project.id
															? 'animate-pulse bg-indigo-600 dark:bg-indigo-400'
															: 'bg-slate-300 group-hover:bg-indigo-500 dark:bg-slate-600 dark:group-hover:bg-indigo-400'}"
													></span>

													<p
														class="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-950 dark:text-slate-100 dark:group-hover:text-white"
														title={project.name}
													>
														{project.name}
													</p>
												</div>

												{#if activeProjectId === project.id}
													<div
														class="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-indigo-200/80 bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-indigo-200"
													>
														<span class="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
														></span>

														Active project
													</div>
												{/if}
											</div>
										</div>

									</div>

									<div
										class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400"
									>
										<div class="flex items-center gap-4">
										<button
											type="button"
											onclick={() => beginRename(project)}
											class="inline-flex items-center gap-1.5 transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
										>
											<svg
												class="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-300"
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
											class="inline-flex items-center gap-1.5 text-slate-400 transition-colors hover:text-rose-600 disabled:opacity-40 dark:text-slate-500 dark:hover:text-rose-400"
										>
											<svg
												class="h-3.5 w-3.5 opacity-80"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												aria-hidden="true"
											>
												<path
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
												></path>
											</svg>

											Delete
										</button>
										</div>

										<button
											type="button"
											disabled={loading}
											onclick={() => onLoadProject(project.id)}
											class="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-indigo-600 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:hover:bg-indigo-500 dark:hover:text-white"
										>
											Open

											<svg
												class="ml-0.5 h-3.5 w-3.5"
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
								{/if}
							</article>
						{/each}
					</div>
				{/if}
			</div>

			<div
				class="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"
			>
				<span class="flex items-center gap-1.5">
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
					Instant canvas synchronization
				</span>

				<span class="text-slate-400 dark:text-slate-500"> Auto-saved to client DB </span>
			</div>
		</div>

		<!-- Create card -->
		<aside
			class="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 transition-colors duration-300 md:p-7 lg:sticky lg:top-8 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none"
		>
			<div class="mb-1 flex items-center gap-3">
				<div
					class="rounded-xl border border-indigo-100 bg-indigo-50 p-2.5 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-300"
				>
					<svg
						class="h-4 w-4"
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

				<h2 class="text-base font-bold tracking-tight text-slate-900 dark:text-white">
					Create a new project
				</h2>
			</div>

			<p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
				Each project has its own isolated localForage database.
			</p>

			<div class="my-5 border-t border-slate-100 dark:border-slate-800"></div>

			<label class="flex flex-col gap-2">
				<span class="text-xs font-semibold text-slate-700 dark:text-slate-300"> Project name </span>

				<input
					bind:value={newProjectName}
					onkeydown={(event) => event.key === 'Enter' && submitCreate()}
					autofocus={requiresFirstProject}
					placeholder="e.g. My Next.js Dashboard"
					type="text"
					class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder-slate-500 dark:shadow-none dark:focus:border-indigo-400 dark:focus:ring-indigo-400/15"
				/>
			</label>

			<button
				type="button"
				disabled={loading || !newProjectName.trim()}
				onclick={submitCreate}
				class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-indigo-700 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all duration-200 hover:from-indigo-500 hover:to-indigo-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:from-indigo-500 dark:via-indigo-500 dark:to-violet-600 dark:shadow-indigo-500/20 dark:hover:from-indigo-400 dark:hover:to-violet-500"
			>
				<svg
					class="h-4 w-4"
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
				class="mt-5 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 text-xs leading-relaxed text-indigo-900 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-200"
			>
				<svg
					class="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300"
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
					<strong
						class="font-semibold text-indigo-950 underline decoration-indigo-400 dark:text-white dark:decoration-indigo-400/70"
					>
						/canvas
					</strong>.
				</div>
			</div>

			<div
				class="mt-6 space-y-2.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400"
			>
				<div class="flex items-center gap-2">
					<svg
						class="h-4 w-4 text-emerald-600 dark:text-emerald-400"
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

					<span>Isolated IndexedDB workspace storage</span>
				</div>

				<div class="flex items-center gap-2">
					<svg
						class="h-4 w-4 text-emerald-600 dark:text-emerald-400"
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

	/* `html.dark` keeps this stronger than Tailwind's own dark: utilities. */
	:global(html.dark) .selectedProject {
		border-color: rgb(129 140 248 / 0.5);
		background: rgb(99 102 241 / 0.12);
	}

	/* Faint dot grid that fades out toward the bottom of the page. */
	.dot-grid {
		background-image: radial-gradient(rgb(100 116 139 / 0.18) 1px, transparent 1px);
		background-size: 22px 22px;
		-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 70%);
		mask-image: linear-gradient(to bottom, black 0%, transparent 70%);
	}

	:global(html.dark) .dot-grid {
		background-image: radial-gradient(rgb(148 163 184 / 0.14) 1px, transparent 1px);
	}
</style>
