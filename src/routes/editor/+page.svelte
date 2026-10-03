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

	:global(html.dark body) {
		background-color: #020617;
	}

	h2 {
		margin-bottom: 8px;
		color: #1e293b;
	}

	:global(html.dark) h2 {
		color: #f1f5f9;
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

	:global(html.dark) .instructions {
		background-color: rgb(14 165 233 / 0.12);
		border-left-color: #38bdf8;
		color: #bae6fd;
	}
</style>
