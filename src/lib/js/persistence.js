/**
 * localForage project manager.
 *
 * Project metadata lives in one small registry. Every project gets its own
 * localForage instance/database, so projects are isolated from one another.
 */

const REGISTRY_DB_NAME = 'webmold-projects-registry';
const REGISTRY_STORE_NAME = 'projects';
const REGISTRY_KEY = 'projects';
const ACTIVE_PROJECT_KEY = 'active-project-id';

async function getLocalForage() {
	if (typeof window === 'undefined') return null;
	const module = await import('localforage');
	return module.default || module;
}

async function getRegistry() {
	const localforage = await getLocalForage();
	if (!localforage) return null;
	return localforage.createInstance({
		name: REGISTRY_DB_NAME,
		storeName: REGISTRY_STORE_NAME
	});
}

function getProjectDatabaseName(projectId) {
	return `webmold-project-${projectId}`;
}

async function getProjectStore(projectId) {
	const localforage = await getLocalForage();
	if (!localforage || !projectId) return null;
	return localforage.createInstance({
		name: getProjectDatabaseName(projectId),
		storeName: 'snapshot'
	});
}

export async function listProjects() {
	const registry = await getRegistry();
	if (!registry) return [];
	const projects = await registry.getItem(REGISTRY_KEY);
	return Array.isArray(projects) ? projects : [];
}

export async function getActiveProjectId() {
	const registry = await getRegistry();
	if (!registry) return null;
	return registry.getItem(ACTIVE_PROJECT_KEY);
}

export async function setActiveProjectId(projectId) {
	const registry = await getRegistry();
	if (!registry) return false;
	if (projectId) {
		await registry.setItem(ACTIVE_PROJECT_KEY, projectId);
	} else {
		await registry.removeItem(ACTIVE_PROJECT_KEY);
	}
	return true;
}

export async function createProject(name) {
	const cleanName = String(name ?? '').trim();
	if (!cleanName) throw new Error('Project name is required.');

	const registry = await getRegistry();
	if (!registry) throw new Error('localForage is unavailable.');

	const projects = await listProjects();
	const duplicate = projects.some((project) => project.name.toLowerCase() === cleanName.toLowerCase());
	if (duplicate) throw new Error('A project with this name already exists.');

	const project = {
		id: typeof crypto !== 'undefined' && crypto.randomUUID
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
		name: cleanName,
		createdAt: Date.now(),
		updatedAt: Date.now()
	};

	await registry.setItem(REGISTRY_KEY, [...projects, project]);
	const store = await getProjectStore(project.id);
	await store.setItem('snapshot', null);
	await setActiveProjectId(project.id);
	return project;
}

export async function renameProject(projectId, name) {
	const cleanName = String(name ?? '').trim();
	if (!projectId || !cleanName) throw new Error('Project id and name are required.');

	const registry = await getRegistry();
	if (!registry) return null;

	const projects = await listProjects();
	const duplicate = projects.some((project) =>
		project.id !== projectId && project.name.toLowerCase() === cleanName.toLowerCase()
	);
	if (duplicate) throw new Error('A project with this name already exists.');

	const updated = projects.map((project) =>
		project.id === projectId
			? { ...project, name: cleanName, updatedAt: Date.now() }
			: project
	);

	await registry.setItem(REGISTRY_KEY, updated);
	return updated.find((project) => project.id === projectId) || null;
}

export async function deleteProject(projectId) {
	if (!projectId) return false;

	const registry = await getRegistry();
	if (!registry) return false;

	const projects = await listProjects();
	if (!projects.some((project) => project.id === projectId)) return false;

	await registry.setItem(REGISTRY_KEY, projects.filter((project) => project.id !== projectId));

	const projectStore = await getProjectStore(projectId);
	if (projectStore) {
		await projectStore.clear();
		await projectStore.dropInstance();
	}

	const activeProjectId = await getActiveProjectId();
	if (activeProjectId === projectId) {
		await setActiveProjectId(null);
	}

	return true;
}

export async function saveProjectSnapshot(snapshot, projectId) {
	const resolvedProjectId = projectId || await getActiveProjectId();
	const store = await getProjectStore(resolvedProjectId);
	if (!store) return false;

	await store.setItem('snapshot', snapshot);

	const registry = await getRegistry();
	if (registry) {
		const projects = await listProjects();
		const updated = projects.map((project) =>
			project.id === resolvedProjectId
				? { ...project, updatedAt: Date.now() }
				: project
		);
		await registry.setItem(REGISTRY_KEY, updated);
	}

	return true;
}

export async function loadProjectSnapshot(projectId) {
	const resolvedProjectId = projectId || await getActiveProjectId();
	const store = await getProjectStore(resolvedProjectId);
	if (!store) return null;
	return store.getItem('snapshot');
}

/**
 * Migrate the previous single-project MVP snapshot into the first project.
 * This lets existing users keep their current canvas once the multi-project
 * architecture is introduced.
 */
export async function migrateLegacyProject() {
	const localforage = await getLocalForage();
	if (!localforage) return null;

	const projects = await listProjects();
	if (projects.length > 0) return null;

	// The previous MVP used localForage's default instance/database and stored
	// the complete snapshot under this key. Read that exact location so existing
	// users are migrated instead of losing their current canvas.
	const legacySnapshot = await localforage.getItem('webmold-project-v1');
	if (!legacySnapshot) return null;

	const firstProject = await createProject('Project 1');
	await saveProjectSnapshot(legacySnapshot, firstProject.id);
	return firstProject;
}

/** Remove legacy storage after a successful migration when desired. */
export async function clearLegacyProjectSnapshot() {
	const localforage = await getLocalForage();
	if (!localforage) return;
	await localforage.removeItem('webmold-project-v1');
}