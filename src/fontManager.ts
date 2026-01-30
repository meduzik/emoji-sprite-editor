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
	private currentUserInput: string = '@googlefont:Noto Color Emoji';
	private currentFontFamily: string = 'Noto Color Emoji';

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
			
			// Load the font
			await document.fonts.load(`80px "${this.currentFontFamily}"`);
		}
		// Check if it's a URL
		else if (this.isUrl(trimmedInput)) {
			// It's a URL - create @font-face and use our custom family name
			this.createFontFace(trimmedInput);
			this.currentFontFamily = CUSTOM_FONT_FAMILY_NAME;
			
			// Load the font
			await document.fonts.load(`80px ${this.currentFontFamily}`);
		} else {
			// It's a font family name - use it directly
			this.removeFontResources();
			this.currentFontFamily = trimmedInput;
			
			// Try to load the font (may fail silently if font doesn't exist)
			try {
				await document.fonts.load(`80px ${this.currentFontFamily}`);
			} catch (e) {
				console.warn('Font may not be available:', trimmedInput);
			}
		}
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
			this.currentUserInput = '@googlefont:Noto Color Emoji';
			this.currentFontFamily = 'Noto Color Emoji';
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
