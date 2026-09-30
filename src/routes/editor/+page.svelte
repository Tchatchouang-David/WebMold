<script>
	import SmartEditor from '../../components/SmartEditor.svelte';
</script>

<div class="container">
	<h2>CSS Smart Editor</h2>
	<div class="instructions">
		<p>
			Type <strong>wid</strong>, <strong>mar</strong>, or <strong>col</strong> to see autocompletion.
			Try pressing Enter and jumping to a new line!
		</p>
	</div>

	<SmartEditor />
</div>

<style>
	:global(body) {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		background-color: #f8fafc;
		padding: 20px;
	}

	.container {
		max-width: 700px;
		margin: 0 auto;
	}

	h2 {
		margin-bottom: 8px;
		color: #1e293b;
	}

	.instructions {
		background-color: #e0f2fe;
		padding: 12px;
		border-radius: 8px;
		margin-bottom: 20px;
		border-left: 4px solid #0ea5e9;
		font-size: 0.95rem;
		color: #0c4a6e;
	}
</style>
