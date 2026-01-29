import './styles.css';
import { StateManager } from './state';
import { CanvasRenderer } from './canvas';
import { EmojiPalette } from './emojiPalette';
import { PropertyPanel } from './propertyPanel';
import { Gizmo } from './gizmo';
import { EmojiSearcher } from './emojiSearch';
import { ExportDialog } from './exportDialog';

class EmojiSpriteEditor {
	private stateManager: StateManager;
	private renderer: CanvasRenderer;
	private gizmo: Gizmo;
	private propertyPanel: PropertyPanel;
	private emojiSearcher: EmojiSearcher;
	private emojiPalette: EmojiPalette;
	private exportDialog!: ExportDialog;

	constructor() {
		// Initialize state manager
		this.stateManager = new StateManager();

		// Try to load saved state from localStorage
		const loaded = this.stateManager.loadFromLocalStorage();
		if (loaded) {
			console.log('Loaded state from localStorage');
		}

		// Get DOM elements
		const canvas = document.getElementById('canvas') as HTMLCanvasElement;
		if (!canvas) throw new Error('Canvas element not found');

		// Initialize canvas renderer
		this.renderer = new CanvasRenderer(canvas);

		// Initialize gizmo
		this.gizmo = new Gizmo(canvas, this.renderer, this.stateManager);

		// Initialize emoji searcher
		this.emojiSearcher = new EmojiSearcher();
		this.setupEmojiSearch();

		// Initialize emoji palette
		const paletteEl = document.getElementById('emoji-palette') as HTMLElement;
		const customListEl = document.getElementById('custom-emoji-list') as HTMLElement;
		const customInputEl = document.getElementById('custom-emoji-input') as HTMLInputElement;
		const addCustomBtn = document.getElementById('add-custom-emoji') as HTMLButtonElement;

		this.emojiPalette = new EmojiPalette(
			paletteEl,
			customListEl,
			customInputEl,
			addCustomBtn,
			(emoji) => this.addSpriteToCanvas(emoji)
		);

		// Initialize property panel
		const propertyPanelEl = document.getElementById('property-panel') as HTMLElement;
		const textInput = document.getElementById('prop-text') as HTMLInputElement;
		const xInput = document.getElementById('prop-x') as HTMLInputElement;
		const yInput = document.getElementById('prop-y') as HTMLInputElement;
		const rotationInput = document.getElementById('prop-rotation') as HTMLInputElement;
		const scaleXInput = document.getElementById('prop-scaleX') as HTMLInputElement;
		const scaleYInput = document.getElementById('prop-scaleY') as HTMLInputElement;
		const frontBtn = document.getElementById('layer-front') as HTMLButtonElement;
		const forwardBtn = document.getElementById('layer-forward') as HTMLButtonElement;
		const backBtn = document.getElementById('layer-back') as HTMLButtonElement;
		const backwardBtn = document.getElementById('layer-backward') as HTMLButtonElement;
		const deleteBtn = document.getElementById('delete-sprite') as HTMLButtonElement;

		this.propertyPanel = new PropertyPanel(
			propertyPanelEl,
			textInput,
			xInput,
			yInput,
			rotationInput,
			scaleXInput,
			scaleYInput,
			frontBtn,
			forwardBtn,
			backBtn,
			backwardBtn,
			deleteBtn,
			this.stateManager
		);

		// Setup origin visibility toggle
		const showOriginCheckbox = document.getElementById('show-origin') as HTMLInputElement;
		showOriginCheckbox.addEventListener('change', () => {
			this.stateManager.setShowOrigin(showOriginCheckbox.checked);
		});

		// Setup axes on top toggle
		const axesOnTopCheckbox = document.getElementById('axes-on-top') as HTMLInputElement;
		axesOnTopCheckbox.addEventListener('change', () => {
			this.stateManager.setAxesOnTop(axesOnTopCheckbox.checked);
		});

		// Setup border on top toggle
		const borderOnTopCheckbox = document.getElementById('border-on-top') as HTMLInputElement;
		borderOnTopCheckbox.addEventListener('change', () => {
			this.stateManager.setBorderOnTop(borderOnTopCheckbox.checked);
		});

		// Setup Clear button
		const clearBtn = document.getElementById('clear-canvas') as HTMLButtonElement;
		clearBtn.addEventListener('click', () => {
			this.stateManager.clearAll();
		});

		// Setup export/import
		this.setupExportImport();

		// Setup export PNG dialog
		this.setupExportDialog();

		// Setup help modal
		this.setupHelpModal();

		// Setup keyboard shortcuts
		this.setupKeyboardShortcuts();

		// Listen to state changes
		this.stateManager.onChange(() => {
			this.render();
			this.propertyPanel.update();
		});

		// Handle window resize
		window.addEventListener('resize', () => this.onResize());

		// Initial render
		this.render();
	}

	private setupEmojiSearch() {
		const searchInput = document.getElementById('emoji-search-input') as HTMLInputElement;
		const searchResults = document.getElementById('emoji-search-results') as HTMLElement;
		const skinToneSelector = document.getElementById('skin-tone-selector') as HTMLSelectElement;

		// Skin tone mapping
		const skinTones: Record<string, string> = {
			none: '\uD83D\uDFE8',
			light: '\uD83C\uDFFB',
			mediumLight: '\uD83C\uDFFC',
			medium: '\uD83C\uDFFD',
			mediumDark: '\uD83C\uDFFE',
			dark: '\uD83C\uDFFF'
		};

		// Load saved skin tone preference
		const savedSkinTone = localStorage.getItem('skinTone');
		if (savedSkinTone && skinTones[savedSkinTone]) {
			skinToneSelector.value = savedSkinTone;
		}

		// Save skin tone preference on change
		skinToneSelector.addEventListener('change', () => {
			localStorage.setItem('skinTone', skinToneSelector.value);
			// Re-render search results if any
			if (searchInput.value.trim()) {
				searchInput.dispatchEvent(new Event('input'));
			}
		});

		let searchTimeout: number | null = null;

		searchInput.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			searchInput.value = '';
			searchResults.innerHTML = '';
			searchInput.focus();
		});

		searchInput.addEventListener('input', () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}

			searchTimeout = window.setTimeout(() => {
				const query = searchInput.value.trim();
				
				if (query === '') {
					searchResults.innerHTML = '';
					return;
				}

				const results = this.emojiSearcher.findEmoji(query);
				
				searchResults.innerHTML = '';
				results.forEach(emoji => {
					const item = document.createElement('div');
					item.className = 'emoji-item';
					// Apply skin tone if supported and selected
					const skinToneKey = skinToneSelector.value;
					const skinToneChar = skinTones[skinToneKey];
					const displayEmoji = (emoji.skinTone && skinToneKey !== 'none') 
						? emoji.char + skinToneChar 
						: emoji.char;
					item.textContent = displayEmoji;
					item.title = emoji.name;
					item.addEventListener('click', () => {
						this.addSpriteToCanvas(displayEmoji);
					});
					item.addEventListener('contextmenu', (e) => {
						e.preventDefault();
						this.emojiPalette.toggleCustomEmoji(displayEmoji);
					});
					searchResults.appendChild(item);
				});
			}, 150);
		});
	}

	private addSpriteToCanvas(emoji: string) {
		const selected = this.stateManager.getSelectedSprite();
		
		// If a sprite is selected, change its emoji
		if (selected) {
			this.stateManager.updateSprite(selected.id, { emoji });
		} else {
			// Otherwise, add a new sprite at canvas center (world 0, 0)
			this.stateManager.addSprite(emoji, 0, 0);
		}
	}

	private setupExportImport() {
		const jsonTextarea = document.getElementById('json-data') as HTMLTextAreaElement;
		const exportBtn = document.getElementById('export-json') as HTMLButtonElement;
		const importBtn = document.getElementById('import-json') as HTMLButtonElement;
		const importClipboardBtn = document.getElementById('import-clipboard') as HTMLButtonElement;

		exportBtn.addEventListener('click', async () => {
			const json = this.stateManager.exportJSON();
			jsonTextarea.value = json;
			jsonTextarea.select();
			
			// Copy to clipboard
			try {
				await navigator.clipboard.writeText(json);
				exportBtn.textContent = 'Copied!';
				setTimeout(() => {
					exportBtn.textContent = 'Export';
				}, 1500);
			} catch (err) {
				console.error('Failed to copy to clipboard:', err);
				alert('Export successful but failed to copy to clipboard');
			}
		});

		importBtn.addEventListener('click', () => {
			const json = jsonTextarea.value.trim();
			if (json) {
				const success = this.stateManager.importJSON(json);
				if (success) {
					alert('Import successful!');
				} else {
					alert('Import failed. Invalid JSON format.');
				}
			}
		});

		importClipboardBtn.addEventListener('click', async () => {
			try {
				const json = await navigator.clipboard.readText();
				if (json.trim()) {
					const success = this.stateManager.importJSON(json);
					if (success) {
						jsonTextarea.value = json;
						importClipboardBtn.textContent = 'Imported!';
						setTimeout(() => {
							importClipboardBtn.textContent = 'Import Clipboard';
						}, 1500);
					} else {
						alert('Import failed. Invalid JSON format.');
					}
				} else {
					alert('Clipboard is empty');
				}
			} catch (err) {
				console.error('Failed to read from clipboard:', err);
				alert('Failed to read from clipboard. Permission may be denied.');
			}
		});
	}

	private setupExportDialog() {
		const exportModal = document.getElementById('export-modal') as HTMLElement;
		const closeExportBtn = document.getElementById('close-export') as HTMLElement;
		const scaleInput = document.getElementById('export-scale') as HTMLInputElement;
		const cropCheckbox = document.getElementById('export-crop') as HTMLInputElement;
		const borderCheckbox = document.getElementById('export-border') as HTMLInputElement;
		const confirmBtn = document.getElementById('export-png-confirm') as HTMLButtonElement;
		const showDialogBtn = document.getElementById('export-png') as HTMLButtonElement;

		this.exportDialog = new ExportDialog(
			exportModal,
			closeExportBtn,
			scaleInput,
			cropCheckbox,
			borderCheckbox,
			confirmBtn,
			this.stateManager
		);

		// Show dialog when button is clicked
		showDialogBtn.addEventListener('click', () => {
			this.exportDialog.show();
		});
	}

	private setupKeyboardShortcuts() {
		document.addEventListener('keydown', (e) => {
			// Ctrl+Z for undo
			if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
				e.preventDefault();
				if (this.stateManager.canUndo()) {
					this.stateManager.undo();
				}
			}

			// Ctrl+Y or Ctrl+Shift+Z for redo
			if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
				e.preventDefault();
				if (this.stateManager.canRedo()) {
					this.stateManager.redo();
				}
			}

			// Ctrl+D to duplicate selected sprite
			if (e.ctrlKey && e.key === 'd') {
				e.preventDefault();
				const selected = this.stateManager.getSelectedSprite();
				if (selected) {
					// Create a duplicate with slight offset
					const newSprite = this.stateManager.addSprite(
						selected.emoji,
						selected.x + 10,
						selected.y + 10
					);
					// Copy all other properties
					this.stateManager.updateSprite(newSprite.id, {
						rotation: selected.rotation,
						scaleX: selected.scaleX,
						scaleY: selected.scaleY,
					});
					// Select the new sprite
					this.stateManager.selectSprite(newSprite.id);
				}
			}

			// Delete key to delete selected sprite
			if (e.key === 'Delete') {
				const selected = this.stateManager.getSelectedSprite();
				if (selected) {
					// Only delete if we're not typing in an input field or textarea
					const target = e.target as HTMLElement;
					const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
					
					if (!isInputField) {
						this.stateManager.deleteSprite(selected.id);
						e.preventDefault();
					}
				}
			}

			// Arrow keys to nudge selected sprite by 1px
			if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
				const selected = this.stateManager.getSelectedSprite();
				if (selected) {
					// Only nudge if we're not typing in an input field or textarea
					const target = e.target as HTMLElement;
					const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
					
					if (!isInputField) {
						e.preventDefault();
						let newX = selected.x;
						let newY = selected.y;
						
						if (e.key === 'ArrowLeft') newX -= 1;
						if (e.key === 'ArrowRight') newX += 1;
						if (e.key === 'ArrowUp') newY -= 1;
						if (e.key === 'ArrowDown') newY += 1;
						
						this.stateManager.updateSprite(selected.id, { x: newX, y: newY });
					}
				}
			}
		});
	}

	private setupHelpModal() {
		const helpButton = document.getElementById('help-button') as HTMLButtonElement;
		const helpModal = document.getElementById('help-modal') as HTMLElement;
		const closeHelpButton = document.getElementById('close-help') as HTMLButtonElement;

		// Open modal
		helpButton.addEventListener('click', () => {
			helpModal.style.display = 'flex';
		});

		// Close modal on close button
		closeHelpButton.addEventListener('click', () => {
			helpModal.style.display = 'none';
		});

		// Close modal on backdrop click
		helpModal.addEventListener('click', (e) => {
			if (e.target === helpModal) {
				helpModal.style.display = 'none';
			}
		});

		// Close modal on Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && helpModal.style.display === 'flex') {
				helpModal.style.display = 'none';
			}
		});
	}

	private onResize() {
		this.renderer.updateSize();
		this.render();
	}

	private render() {
		const state = this.stateManager.getState();
		
		// Render sprites
		this.renderer.render(state.sprites, state.showOrigin, state.axesOnTop, state.borderOnTop);

		// Draw gizmo for selected sprite
		if (state.selectedId) {
			const selected = state.sprites.find(s => s.id === state.selectedId);
			if (selected) {
				this.gizmo.drawGizmo(selected);
			}
		}
	}
}

// Initialize the app
new EmojiSpriteEditor();
