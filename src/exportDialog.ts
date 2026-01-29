import type { StateManager } from './state';

const LOCALSTORAGE_KEY = 'emoji-sprite-editor-export-settings';

export class ExportDialog {
	private modal: HTMLElement;
	private closeButton: HTMLElement;
	private scaleInput: HTMLInputElement;
	private cropCheckbox: HTMLInputElement;
	private borderCheckbox: HTMLInputElement;
	private confirmButton: HTMLElement;
	private stateManager: StateManager;

	constructor(
		modal: HTMLElement,
		closeButton: HTMLElement,
		scaleInput: HTMLInputElement,
		cropCheckbox: HTMLInputElement,
		borderCheckbox: HTMLInputElement,
		confirmButton: HTMLElement,
		stateManager: StateManager
	) {
		this.modal = modal;
		this.closeButton = closeButton;
		this.scaleInput = scaleInput;
		this.cropCheckbox = cropCheckbox;
		this.borderCheckbox = borderCheckbox;
		this.confirmButton = confirmButton;
		this.stateManager = stateManager;

		this.loadSettings();
		this.setupEventListeners();
	}

	private loadSettings() {
		try {
			const saved = localStorage.getItem(LOCALSTORAGE_KEY);
			if (saved) {
				const settings = JSON.parse(saved);
				if (settings.crop !== undefined) {
					this.cropCheckbox.checked = settings.crop;
				}
				if (settings.border !== undefined) {
					this.borderCheckbox.checked = settings.border;
				}
			}
		} catch (e) {
			console.error('Failed to load export settings:', e);
		}
	}

	private saveSettings() {
		try {
			const settings = {
				crop: this.cropCheckbox.checked,
				border: this.borderCheckbox.checked
			};
			localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(settings));
		} catch (e) {
			console.error('Failed to save export settings:', e);
		}
	}

	private setupEventListeners() {
		// Close button
		this.closeButton.addEventListener('click', () => {
			this.hide();
		});

		// Close on backdrop click
		this.modal.addEventListener('click', (e) => {
			if (e.target === this.modal) {
				this.hide();
			}
		});

		// Close on ESC key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.modal.style.display !== 'none') {
				this.hide();
			}
		});

		// Confirm export
		this.confirmButton.addEventListener('click', () => {
			this.handleExport();
		});

		// Save settings when checkboxes change
		this.cropCheckbox.addEventListener('change', () => {
			this.saveSettings();
		});

		this.borderCheckbox.addEventListener('change', () => {
			this.saveSettings();
		});
	}

	private handleExport() {
		const scale = parseFloat(this.scaleInput.value) || 80;
		const crop = this.cropCheckbox.checked;
		const border = this.borderCheckbox.checked;

		// Call the export method
		this.stateManager.exportPNG(scale, crop, border);

		// Close the dialog
		this.hide();
	}

	show() {
		this.modal.style.display = 'flex';
	}

	hide() {
		this.modal.style.display = 'none';
	}
}
