const FONT_FACE_ID = 'emoji-font-face';
const GOOGLE_FONT_LINK_ID = 'google-font-link';
const CUSTOM_FONT_FAMILY_NAME = 'EmojiCustomFont';
const SYSTEM_DEFAULT_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

/**
 * Manages custom font loading and CSS @font-face rules.
 * Handles font family names, font URLs, and Google Fonts.
 */
export class FontManager {
	private fontStyleElement: HTMLStyleElement | null = null;
	private googleFontLink: HTMLLinkElement | null = null;
	private currentUserInput: string = '';
	private currentFontFamily: string = SYSTEM_DEFAULT_FONT;


	constructor() {
	}

	/**
	 * Load a font from user input (font family name or URL)
	 * @param userInput - Either a font family name (e.g., "Arial"), a URL (e.g., "https://..."), or a Google Font (e.g., "@googlefont:Font Name")
	 * @returns Promise that resolves when the font is loaded
	 */
	async load(userInput: string): Promise<void> {
		const trimmedInput = userInput.trim();

		// Empty input means use system default
		if (!trimmedInput) {
			this.removeFontResources();
			this.currentUserInput = '';
			this.currentFontFamily = SYSTEM_DEFAULT_FONT;
			return;
		}

		this.currentUserInput = trimmedInput;

		// Check if it's a Google Font
		if (this.isGoogleFont(trimmedInput)) {
			const fontName = this.parseGoogleFont(trimmedInput);
			this.createGoogleFontLink(fontName);
			this.currentFontFamily = fontName;
			await this.waitForFontLoad(this.currentFontFamily);
		}
		// Check if it's a URL
		else if (this.isUrl(trimmedInput)) {
			this.createFontFace(trimmedInput);
			this.currentFontFamily = CUSTOM_FONT_FAMILY_NAME;
			await this.waitForFontLoad(this.currentFontFamily);
		} else {
			this.removeFontResources();
			this.currentFontFamily = trimmedInput;
			try {
				await this.waitForFontLoad(this.currentFontFamily);
			} catch (e) {
				console.warn('Font may not be available:', trimmedInput);
			}
		}
	}

	/**
	 * Wait for all fonts to finish loading (using document.fonts.onloadingdone)
	 * Resolves when the specified font family is loaded or timeout occurs
	 */
	waitForFontLoad(fontFamily: string, timeoutMs: number = 4000): Promise<void> {
		return new Promise((resolve, reject) => {
			let resolved = false;
			const onDone = () => {
				if (!resolved) {
					resolved = true;
					clearTimeout(timer);
					resolve();
				}
			};
			const timer = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					document.fonts.removeEventListener('loadingdone', onDone);
					reject(new Error('Font load timeout'));
				}
			}, timeoutMs);
			document.fonts.addEventListener('loadingdone', onDone, { once: true });
			// Fallback: if font is already loaded, resolve immediately
			if (document.fonts.check(`80px "${fontFamily}"`)) {
				clearTimeout(timer);
				document.fonts.removeEventListener('loadingdone', onDone);
				resolved = true;
				resolve();
			}
		});
	}

	/**
	 * Get the CSS font-family to use for rendering
	 */
	getFontFamily(): string {
		return this.currentFontFamily;
	}

	/**
	 * Get the user's original input (for persistence)
	 */
	getUserInput(): string {
		return this.currentUserInput;
	}

	/**
	 * Initialize with saved user input
	 */
	async initialize(userInput: string = '@googlefont:Noto Color Emoji'): Promise<void> {
		try {
			await this.load(userInput);
		} catch (e) {
			console.error('Failed to initialize font:', e);
			// Fall back to Noto Color Emoji
			await this.load('@googlefont:Noto Color Emoji');
		}
	}

	private isUrl(input: string): boolean {
		return input.startsWith('http://') || input.startsWith('https://');
	}

	private isGoogleFont(input: string): boolean {
		return input.toLowerCase().startsWith('@googlefont:');
	}

	private parseGoogleFont(input: string): string {
		// Remove the @googlefont: prefix and trim
		return input.substring('@googlefont:'.length).trim();
	}

	private createGoogleFontLink(fontName: string): void {
		// Remove existing font resources
		this.removeFontResources();

		// Create Google Fonts URL
		const encodedFontName = fontName.replace(/ /g, '+');
		const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${encodedFontName}&display=swap`;

		// Create link element
		this.googleFontLink = document.createElement('link');
		this.googleFontLink.id = GOOGLE_FONT_LINK_ID;
		this.googleFontLink.href = googleFontsUrl;
		this.googleFontLink.rel = 'stylesheet';
		document.head.appendChild(this.googleFontLink);
	}

	private createFontFace(url: string): void {
		// Remove existing font resources
		this.removeFontResources();

		// Detect font format from URL
		const format = this.detectFontFormat(url);
		const formatHint = format ? ` format('${format}')` : '';

		// Create new style element with @font-face
		this.fontStyleElement = document.createElement('style');
		this.fontStyleElement.id = FONT_FACE_ID;
		this.fontStyleElement.textContent = `
			@font-face {
				font-family: '${CUSTOM_FONT_FAMILY_NAME}';
				src: url('${url}')${formatHint};
			}
		`;
		document.head.appendChild(this.fontStyleElement);
	}

	private detectFontFormat(url: string): string | null {
		const urlLower = url.toLowerCase();
		
		if (urlLower.endsWith('.woff2')) return 'woff2';
		if (urlLower.endsWith('.woff')) return 'woff';
		if (urlLower.endsWith('.ttf') || urlLower.includes('.truetype')) return 'truetype';
		if (urlLower.endsWith('.otf') || urlLower.includes('.opentype')) return 'opentype';
		if (urlLower.endsWith('.eot')) return 'embedded-opentype';
		if (urlLower.endsWith('.svg') || urlLower.includes('.svg#')) return 'svg';
		
		// Check for format in query parameters (e.g., ?format=woff2)
		const match = urlLower.match(/[?&]format=([^&]+)/);
		if (match) return match[1];
		
		return null; // Unknown format - browser will try to detect
	}

	private removeFontResources(): void {
		// Remove @font-face style element
		const existingStyle = document.getElementById(FONT_FACE_ID);
		if (existingStyle) {
			existingStyle.remove();
		}
		this.fontStyleElement = null;

		// Remove Google Font link element
		const existingLink = document.getElementById(GOOGLE_FONT_LINK_ID);
		if (existingLink) {
			existingLink.remove();
		}
		this.googleFontLink = null;
	}
}
