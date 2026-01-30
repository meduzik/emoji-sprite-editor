import type { StateManager } from './state';
import { FontManager } from './fontManager';

const SETTINGS_KEY = 'emoji-sprite-editor-settings';

interface Settings {
	font: string;
}

export class SettingsDialog {
	private modal: HTMLElement;
	private closeButton: HTMLElement;
	private showOriginCheckbox: HTMLInputElement;
	private axesOnTopCheckbox: HTMLInputElement;
	private borderOnTopCheckbox: HTMLInputElement;
	private fontInput: HTMLTextAreaElement;
	private fontApplyButton: HTMLButtonElement;
	private notoEmojiLink: HTMLAnchorElement;
	private openmojiLink: HTMLAnchorElement;
	private twemojiLink: HTMLAnchorElement;
	private stateManager: StateManager;
	private fontManager: FontManager;

	constructor(
		modal: HTMLElement,
		closeButton: HTMLElement,
		showOriginCheckbox: HTMLInputElement,
		axesOnTopCheckbox: HTMLInputElement,
		borderOnTopCheckbox: HTMLInputElement,
		fontInput: HTMLTextAreaElement,
		fontApplyButton: HTMLButtonElement,
		notoEmojiLink: HTMLAnchorElement,
		openmojiLink: HTMLAnchorElement,
		twemojiLink: HTMLAnchorElement,
		stateManager: StateManager,
		fontManager: FontManager
	) {
		this.modal = modal;
		this.closeButton = closeButton;
		this.showOriginCheckbox = showOriginCheckbox;
		this.axesOnTopCheckbox = axesOnTopCheckbox;
		this.borderOnTopCheckbox = borderOnTopCheckbox;
		this.fontInput = fontInput;
		this.fontApplyButton = fontApplyButton;
		this.notoEmojiLink = notoEmojiLink;
		this.openmojiLink = openmojiLink;
		this.twemojiLink = twemojiLink;
		this.stateManager = stateManager;
		this.fontManager = fontManager;

		this.loadSettings();
		this.setupEventListeners();
		this.initializeFromState();
	}

	private loadSettings() {
		try {
			const stored = localStorage.getItem(SETTINGS_KEY);
			if (stored) {
				const settings: Settings = JSON.parse(stored);
				this.fontInput.value = settings.font;
			}
		} catch (e) {
			console.error('Failed to load settings:', e);
		}
	}

	private saveSettings() {
		try {
			const settings: Settings = {
				font: this.fontInput.value,
			};
			localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
		} catch (e) {
			console.error('Failed to save settings:', e);
		}
	}

	private initializeFromState() {
		const state = this.stateManager.getState();
		this.showOriginCheckbox.checked = state.showOrigin;
		this.axesOnTopCheckbox.checked = state.axesOnTop;
		this.borderOnTopCheckbox.checked = state.borderOnTop;
		
		// Initialize font display with user's input (not internal font family)
		const fontInput = this.stateManager.getCustomFontInput();
		if (fontInput) {
			this.fontInput.value = fontInput;
		}
	}

	private setupEventListeners() {
		// Close button
		this.closeButton.addEventListener('click', () => this.hide());

		// Close on backdrop click
		// Only close if mousedown and mouseup both occur on the backdrop
		let backdropMouseDown = false;
		this.modal.addEventListener('mousedown', (e) => {
			if (e.target === this.modal) {
				backdropMouseDown = true;
			} else {
				backdropMouseDown = false;
			}
		});
		this.modal.addEventListener('mouseup', (e) => {
			if (e.target === this.modal && backdropMouseDown) {
				this.hide();
			}
			backdropMouseDown = false;
		});

		// Close on ESC key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.modal.style.display === 'flex') {
				this.hide();
			}
		});

		// View option checkboxes
		this.showOriginCheckbox.addEventListener('change', () => {
			this.stateManager.setShowOrigin(this.showOriginCheckbox.checked);
		});

		this.axesOnTopCheckbox.addEventListener('change', () => {
			this.stateManager.setAxesOnTop(this.axesOnTopCheckbox.checked);
		});

		this.borderOnTopCheckbox.addEventListener('change', () => {
			this.stateManager.setBorderOnTop(this.borderOnTopCheckbox.checked);
		});

		// Font apply button
		this.fontApplyButton.addEventListener('click', () => {
			this.applyFont();
		});

		// Allow Enter key in font input to apply
		this.fontInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.applyFont();
			}
		});

		// Noto Color Emoji shortcut link
		this.notoEmojiLink.addEventListener('click', (e) => {
			e.preventDefault();
			this.fontInput.value = '@googlefont:Noto Color Emoji';
			this.applyFont();
		});

		// OpenMoji shortcut link
		this.openmojiLink.addEventListener('click', (e) => {
			e.preventDefault();
			this.fontInput.value = 'OpenMoji';
			this.applyFont();
		});

		// Twemoji shortcut link
		this.twemojiLink.addEventListener('click', (e) => {
			e.preventDefault();
			this.fontInput.value = 'Twemoji';
			this.applyFont();
		});
	}

	private async applyFont() {
		const fontValue = this.fontInput.value.trim();

		this.fontApplyButton.disabled = true;
		this.fontApplyButton.textContent = 'Loading...';

		try {
			// Load the font using FontManager
			await this.fontManager.load(fontValue);

			// Save the user's input to state (not the internal font family)
			this.stateManager.setCustomFontInput(fontValue);

			// Save to localStorage
			this.saveSettings();

			console.log('Font applied:', fontValue);
		} catch (error) {
			console.error('Failed to load font:', error);
			alert('Failed to load font. Please check the font name or URL.');
		} finally {
			this.fontApplyButton.disabled = false;
			this.fontApplyButton.textContent = 'Apply Font';
		}
	}

	show() {
		// Sync checkboxes with current state before showing
		const state = this.stateManager.getState();
		this.showOriginCheckbox.checked = state.showOrigin;
		this.axesOnTopCheckbox.checked = state.axesOnTop;
		this.borderOnTopCheckbox.checked = state.borderOnTop;
		
		this.modal.style.display = 'flex';
	}

	hide() {
		this.modal.style.display = 'none';
	}
}
