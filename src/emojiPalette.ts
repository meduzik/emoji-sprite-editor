const HARDCODED_EMOJIS = [
	'😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
	'😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
	'😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
	'🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
	'😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫',
	'😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
	'👻', '👽', '🤖', '💀', '☠️', '👹', '👺', '🤡',
	'💩', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨',
	'🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
	'🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
	'🐧', '🐦', '🐤', '🐣', '🦆', '🦅', '🦉', '🦇',
	'🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌',
	'🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍',
	'🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
	'🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊',
	'🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
	'🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆',
	'🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄',
	'⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉',
	'🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍',
	'🏏', '🥅', '⛳', '🏹', '🎣', '🤿', '🥊', '🥋',
	'🎮', '🕹️', '🎲', '♟️', '🎯', '🎰', '🎳', '🎪',
	'🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷',
	'🎺', '🎸', '🪕', '🎻', '🎭', '🩰', '🎪', '🎟️',
	'⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌈',
	'☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
	'❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
	'💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
	'💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️',
	'🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉',
];

const CUSTOM_EMOJIS_KEY = 'emoji-sprite-editor-custom-emojis';

export class EmojiPalette {
	private paletteEl: HTMLElement;
	private customListEl: HTMLElement;
	private inputEl: HTMLInputElement;
	private addButtonEl: HTMLButtonElement;
	private customEmojis: string[] = [];
	private onEmojiSelect: (emoji: string) => void;

	constructor(
		paletteEl: HTMLElement,
		customListEl: HTMLElement,
		inputEl: HTMLInputElement,
		addButtonEl: HTMLButtonElement,
		onEmojiSelect: (emoji: string) => void
	) {
		this.paletteEl = paletteEl;
		this.customListEl = customListEl;
		this.inputEl = inputEl;
		this.addButtonEl = addButtonEl;
		this.onEmojiSelect = onEmojiSelect;

		this.loadCustomEmojis();
		this.render();
		this.setupEventListeners();
	}

	private loadCustomEmojis() {
		try {
			const stored = localStorage.getItem(CUSTOM_EMOJIS_KEY);
			if (stored) {
				this.customEmojis = JSON.parse(stored);
			}
		} catch (e) {
			console.error('Failed to load custom emojis:', e);
		}
	}

	private saveCustomEmojis() {
		try {
			localStorage.setItem(CUSTOM_EMOJIS_KEY, JSON.stringify(this.customEmojis));
		} catch (e) {
			console.error('Failed to save custom emojis:', e);
		}
	}

	private render() {
		// Render hardcoded emojis
		this.paletteEl.innerHTML = '';
		HARDCODED_EMOJIS.forEach(emoji => {
			const item = document.createElement('div');
			item.className = 'emoji-item';
			item.textContent = emoji;
			item.addEventListener('click', () => this.onEmojiSelect(emoji));
			item.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				this.toggleCustomEmoji(emoji);
			});
			this.paletteEl.appendChild(item);
		});

		// Render custom emojis
		this.renderCustomList();
	}

	private renderCustomList() {
		this.customListEl.innerHTML = '';
		this.customEmojis.forEach(emoji => {
			const item = document.createElement('div');
			item.className = 'custom-emoji-item';
			item.textContent = emoji;
			item.dataset.emoji = emoji;
			
			item.addEventListener('click', () => {
				this.onEmojiSelect(emoji);
			});

			item.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				this.deleteCustomEmoji(emoji);
			});

			this.customListEl.appendChild(item);
		});
	}

	private setupEventListeners() {
		this.addButtonEl.addEventListener('click', () => this.addCustomEmojiFromInput());
		
		this.inputEl.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.addCustomEmojiFromInput();
			}
		});
	}

	private addCustomEmojiFromInput() {
		const value = this.inputEl.value.trim();
		if (value && !this.customEmojis.includes(value)) {
			this.customEmojis.push(value);
			this.saveCustomEmojis();
			this.renderCustomList();
			this.inputEl.value = '';
		}
	}

	public toggleCustomEmoji(emoji: string) {
		if (this.customEmojis.includes(emoji)) {
			this.customEmojis = this.customEmojis.filter(e => e !== emoji);
		} else {
			this.customEmojis.push(emoji);
		}
		this.saveCustomEmojis();
		this.renderCustomList();
	}

	private deleteCustomEmoji(emoji: string) {
		this.customEmojis = this.customEmojis.filter(e => e !== emoji);
		this.saveCustomEmojis();
		this.renderCustomList();
	}
}
