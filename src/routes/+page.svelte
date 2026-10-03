<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ProjectManager from '../components/ProjectManager.svelte';
	import MinimumWidthModal from '../components/MinimumWidthModal.svelte';
	import { addToast } from '$lib/js/toastStore.svelte';
	import { title, description } from '$lib/js/store.svelte';
	import {
		listProjects,
		createProject,
		renameProject,
		deleteProject,
		setActiveProjectId,
		saveProjectSnapshot,
		migrateLegacyProject
	} from '$lib/js/persistence';

	let projects = $state([]);
	let loading = $state(false);
	let initializing = $state(true);

	async function refreshProjects() {
		projects = await listProjects();
	}

	async function handleCreateProject(name) {
		loading = true;
		try {
			const project = await createProject(name);
			await saveProjectSnapshot({
				version: 1,
				allCreatedRecangles: [],
				allClasses: [],
				importedCss: '',
				globalJs: '',
				devMode: false
			}, project.id);
			await goto(`/canvas/${project.id}`);
		} catch (error) {
			console.error('Project creation failed:', error);
			addToast({
				message: error?.message || 'Unable to create project.',
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		} finally {
			loading = false;
		}
	}

	async function handleLoadProject(projectId) {
		loading = true;
		try {
			const exists = projects.some((project) => project.id === projectId);
			if (!exists) return;
			await setActiveProjectId(projectId);
			await goto(`/canvas/${projectId}`);
		} catch (error) {
			console.error('Project load failed:', error);
			addToast({
				message: 'Unable to load the project.',
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		} finally {
			loading = false;
		}
	}

	async function handleRenameProject(projectId, name) {
		try {
			await renameProject(projectId, name);
			await refreshProjects();
		} catch (error) {
			console.error('Project rename failed:', error);
			addToast({
				message: error?.message || 'Unable to rename project.',
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		}
	}

	async function handleDeleteProject(projectId) {
		const project = projects.find((item) => item.id === projectId);
		if (!project) return;
		if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;

		try {
			await deleteProject(projectId);
			await refreshProjects();
		} catch (error) {
			console.error('Project deletion failed:', error);
			addToast({
				message: 'Unable to delete project.',
				type: 'error',
				dismissible: true,
				timeout: 3000
			});
		}
	}

	onMount(async () => {
		try {
			await migrateLegacyProject();
			await refreshProjects();
		} catch (error) {
			console.error('Project initialization failed:', error);
		} finally {
			initializing = false;
		}
	});
</script>

<MinimumWidthModal minWidth={1024} />

<svelte:head>
	<!-- Ces balises injecteront les valeurs directement dans le <head> HTML -->
	<title>{title.value}</title>
	<meta name="description" content={description.value} />
</svelte:head>

{#if !initializing}
	<ProjectManager
		{projects}
		{loading}
		requiresFirstProject={projects.length === 0}
		onCreateProject={handleCreateProject}
		onLoadProject={handleLoadProject}
		onDeleteProject={handleDeleteProject}
		onRenameProject={handleRenameProject}
	/>
{:else}
	<div
		class="min-h-screen flex items-center justify-center gap-2.5 bg-slate-100 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400"
	>
		<span
			class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400"
			aria-hidden="true"
		></span>
		Loading projects…
	</div>
{/if}