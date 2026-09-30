function boxed(initial) {
	let value = $state(initial);
	return {
		get value() {
			return value;
		},
		set value(next) {
			value = next;
		}
	};
}

export const toasts = boxed([]);

export const addToast = (toast) => {
	// Create a unique ID so we can easily find/remove it
	// if it is dismissible/has a timeout.
	const id = Math.floor(Math.random() * 10000);

	// Setup some sensible defaults for a toast.
	const defaults = {
		id,
		type: 'info',
		dismissible: true,
		timeout: 3000
	};

	// Push the toast to the top of the list of toasts
	toasts.value = [{ ...defaults, ...toast }, ...toasts.value];

	// If toast is dismissible, dismiss it after "timeout" amount of time.
	if (toast.timeout) setTimeout(() => dismissToast(id), toast.timeout);
};

export const dismissToast = (id) => {
	toasts.value = toasts.value.filter((t) => t.id !== id);
};
