<script>
	import CanvasEditor from '../../../components/CanvasEditor.svelte';
	import { page } from '$app/state';
</script>

<CanvasEditor projectId={page.params.projectId} />
