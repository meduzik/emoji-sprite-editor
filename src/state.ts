import type { EditorState, SpriteObject } from './types';

const LOCALSTORAGE_KEY = 'emoji-sprite-editor-state';

export class StateManager {
	private state: EditorState;
	private undoStack: string[] = [];
	private redoStack: string[] = [];
	private listeners: Array<() => void> = [];

	constructor() {
		this.state = {
			sprites: [],
			selectedId: null,
			nextId: 1,
			showOrigin: true,
			axesOnTop: false,
			borderOnTop: false,
			customFont: '@googlefont:Noto Color Emoji',
		};
		// Don't save snapshot here - let loadFromLocalStorage handle it
		// or it will be saved on first user action
	}

	getState(): EditorState {
		return this.state;
	}

	setState(newState: EditorState) {
		this.state = newState;
		this.notifyListeners();
	}

	addSprite(emoji: string, x: number = 0, y: number = 0): SpriteObject {
		const sprite: SpriteObject = {
			id: `sprite-${this.state.nextId++}`,
			emoji,
			x,
			y,
			rotation: 0,
			scaleX: 1,
			scaleY: 1,
			zIndex: this.state.sprites.length,
		};
		this.state.sprites.push(sprite);
		this.state.selectedId = sprite.id;
		this.saveSnapshot();
		this.notifyListeners();
		return sprite;
	}

	updateSprite(id: string, updates: Partial<SpriteObject>) {
		const sprite = this.state.sprites.find(s => s.id === id);
		if (sprite) {
			Object.assign(sprite, updates);
			this.saveSnapshot();
			this.notifyListeners();
		}
	}

	updateSpriteWithoutSnapshot(id: string, updates: Partial<SpriteObject>) {
		const sprite = this.state.sprites.find(s => s.id === id);
		if (sprite) {
			Object.assign(sprite, updates);
			this.notifyListeners();
		}
	}

	finalizeChanges() {
		this.saveSnapshot();
	}

	deleteSprite(id: string) {
		this.state.sprites = this.state.sprites.filter(s => s.id !== id);
		if (this.state.selectedId === id) {
			this.state.selectedId = null;
		}
		this.reindexZOrder();
		this.saveSnapshot();
		this.notifyListeners();
	}

	clearAll() {
		this.state.sprites = [];
		this.state.selectedId = null;
		this.saveSnapshot();
		this.notifyListeners();
	}

	selectSprite(id: string | null) {
		this.state.selectedId = id;
		this.saveSnapshot();
		this.notifyListeners();
	}

	setShowOrigin(show: boolean) {
		this.state.showOrigin = show;
		this.saveSnapshot();
		this.notifyListeners();
	}

	setAxesOnTop(onTop: boolean) {
		this.state.axesOnTop = onTop;
		this.saveSnapshot();
		this.notifyListeners();
	}

	setBorderOnTop(onTop: boolean) {
		this.state.borderOnTop = onTop;
		this.saveSnapshot();
		this.notifyListeners();
	}

	getCustomFontInput(): string {
		return this.state.customFont;
	}

	setCustomFontInput(fontInput: string) {
		this.state.customFont = fontInput;
		this.saveSnapshot();
		this.notifyListeners();
	}

	getSelectedSprite(): SpriteObject | null {
		if (!this.state.selectedId) return null;
		return this.state.sprites.find(s => s.id === this.state.selectedId) || null;
	}

	moveLayerUp(id: string) {
		const sprite = this.state.sprites.find(s => s.id === id);
		if (!sprite) return;

		const sorted = [...this.state.sprites].sort((a, b) => a.zIndex - b.zIndex);
		const index = sorted.findIndex(s => s.id === id);
		
		if (index < sorted.length - 1) {
			const temp = sorted[index + 1].zIndex;
			sorted[index + 1].zIndex = sprite.zIndex;
			sprite.zIndex = temp;
			this.saveSnapshot();
			this.notifyListeners();
		}
	}

	moveLayerDown(id: string) {
		const sprite = this.state.sprites.find(s => s.id === id);
		if (!sprite) return;

		const sorted = [...this.state.sprites].sort((a, b) => a.zIndex - b.zIndex);
		const index = sorted.findIndex(s => s.id === id);
		
		if (index > 0) {
			const temp = sorted[index - 1].zIndex;
			sorted[index - 1].zIndex = sprite.zIndex;
			sprite.zIndex = temp;
			this.saveSnapshot();
			this.notifyListeners();
		}
	}

	moveLayerToFront(id: string) {
		const sprite = this.state.sprites.find(s => s.id === id);
		if (!sprite) return;

		const maxZ = Math.max(...this.state.sprites.map(s => s.zIndex));
		sprite.zIndex = maxZ + 1;
		this.reindexZOrder();
		this.saveSnapshot();
		this.notifyListeners();
	}

	moveLayerToBack(id: string) {
		const sprite = this.state.sprites.find(s => s.id === id);
		if (!sprite) return;

		const minZ = Math.min(...this.state.sprites.map(s => s.zIndex));
		sprite.zIndex = minZ - 1;
		this.reindexZOrder();
		this.saveSnapshot();
		this.notifyListeners();
	}

	private reindexZOrder() {
		const sorted = [...this.state.sprites].sort((a, b) => a.zIndex - b.zIndex);
		sorted.forEach((sprite, index) => {
			sprite.zIndex = index;
		});
	}

	exportJSON(): string {
		// Sort sprites by zIndex and create compact version
		const sorted = [...this.state.sprites].sort((a, b) => a.zIndex - b.zIndex);
		
		const compactSprites = sorted.map(sprite => {
			const obj: any = {
				e: sprite.emoji,
			};
			
			// Only include non-default values
			const x = Math.round(sprite.x * 100) / 100;
			const y = Math.round(sprite.y * 100) / 100;
			const rotation = Math.round(sprite.rotation * 10) / 10;
			const scaleX = Math.round(sprite.scaleX * 10000) / 10000;
			const scaleY = Math.round(sprite.scaleY * 10000) / 10000;
			
			if (x !== 0) obj.x = x;
			if (y !== 0) obj.y = y;
			if (rotation !== 0) obj.r = rotation;
			
			// Use 's' for uniform scale, 'sx'/'sy' for non-uniform
			if (scaleX === scaleY && scaleX !== 1) {
				obj.s = scaleX;
			} else {
				if (scaleX !== 1) obj.sx = scaleX;
				if (scaleY !== 1) obj.sy = scaleY;
			}
			
			return obj;
		});
		
		return JSON.stringify(compactSprites);
	}

	exportPNG(scale: number = 80, crop: boolean = false, addBorder: boolean = true, fontFamily: string = 'Arial'): void {
		// Scale is "pixels per world unit" - divide by 80 to get the multiplier
		const scaleFactor = scale / 80;
		const baseFontSize = 80; // Our base font size in pixels

		if (this.state.sprites.length === 0) {
			console.warn('No sprites to export');
			return;
		}

		// Create temporary canvas for measuring and rendering
		const tempCanvas = document.createElement('canvas');
		const tempCtx = tempCanvas.getContext('2d');
		if (!tempCtx) {
			console.error('Failed to create temp canvas context');
			return;
		}

		// Set font for measuring
		tempCtx.font = `${baseFontSize}px ${fontFamily}`;

		// Calculate bounds of all sprites in world space
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

		this.state.sprites.forEach(sprite => {
			// Measure the emoji at base font size
			const metrics = tempCtx.measureText(sprite.emoji);
			const left = metrics.actualBoundingBoxLeft;
			const right = metrics.actualBoundingBoxRight;
			const ascent = metrics.actualBoundingBoxAscent;
			const descent = metrics.actualBoundingBoxDescent;

			const baseWidth = left + right;
			const baseHeight = ascent + descent;

			// Apply sprite's scale
			const width = baseWidth * sprite.scaleX;
			const height = baseHeight * sprite.scaleY;

			// For rotation, we need to find the corners of the bounding box
			// and transform them to find the actual bounds
			const halfW = width / 2;
			const halfH = height / 2;

			// Four corners of the bounding box (before rotation)
			const corners = [
				{ x: -halfW, y: -halfH },
				{ x: halfW, y: -halfH },
				{ x: -halfW, y: halfH },
				{ x: halfW, y: halfH }
			];

			// Rotate corners and translate to sprite position
			const angleRad = (sprite.rotation * Math.PI) / 180;
			const cos = Math.cos(angleRad);
			const sin = Math.sin(angleRad);

			corners.forEach(corner => {
				const rotatedX = corner.x * cos - corner.y * sin;
				const rotatedY = corner.x * sin + corner.y * cos;
				const worldX = sprite.x + rotatedX;
				const worldY = sprite.y + rotatedY;

				minX = Math.min(minX, worldX);
				minY = Math.min(minY, worldY);
				maxX = Math.max(maxX, worldX);
				maxY = Math.max(maxY, worldY);
			});
		});

		// Add padding (10% of content size, minimum 40 world units)
		const contentWidth = maxX - minX;
		const contentHeight = maxY - minY;
		const padding = Math.max(40, Math.max(contentWidth, contentHeight) * 0.1);
		minX -= padding;
		minY -= padding;
		maxX += padding;
		maxY += padding;

		let canvasWidth: number, canvasHeight: number, offsetX: number, offsetY: number;

		if (crop) {
			// Cropped mode: canvas size matches content bounds
			canvasWidth = Math.ceil((maxX - minX) * scaleFactor);
			canvasHeight = Math.ceil((maxY - minY) * scaleFactor);
			offsetX = -minX * scaleFactor;
			offsetY = -minY * scaleFactor;
		} else {
			// Uncropped mode: ensure origin (0,0) is centered
			// Find the maximum distance from origin in each direction
			const radiusX = Math.max(Math.abs(minX), Math.abs(maxX));
			const radiusY = Math.max(Math.abs(minY), Math.abs(maxY));
			
			canvasWidth = Math.ceil(radiusX * 2 * scaleFactor);
			canvasHeight = Math.ceil(radiusY * 2 * scaleFactor);
			offsetX = canvasWidth / 2;  // Center is at half width
			offsetY = canvasHeight / 2; // Center is at half height
		}

		// Set canvas size
		tempCanvas.width = canvasWidth;
		tempCanvas.height = canvasHeight;

		// Sort sprites by zIndex
		const sorted = [...this.state.sprites].sort((a, b) => a.zIndex - b.zIndex);

		// Render each sprite
		sorted.forEach(sprite => {
			tempCtx.save();

			// Calculate sprite bounds for pen offset
			tempCtx.font = `${baseFontSize}px ${fontFamily}`;
			const metrics = tempCtx.measureText(sprite.emoji);
			const left = metrics.actualBoundingBoxLeft;
			const right = metrics.actualBoundingBoxRight;
			const ascent = metrics.actualBoundingBoxAscent;
			const descent = metrics.actualBoundingBoxDescent;

			const baseWidth = left + right;
			const baseHeight = ascent + descent;
			const penX = -baseWidth / 2 + left;
			const penY = ascent - baseHeight / 2;

			// Transform to screen position (with scale applied)
			const screenX = offsetX + sprite.x * scaleFactor;
			const screenY = offsetY + sprite.y * scaleFactor;

			tempCtx.translate(screenX, screenY);
			tempCtx.rotate((sprite.rotation * Math.PI) / 180);
			tempCtx.scale(sprite.scaleX * scaleFactor, sprite.scaleY * scaleFactor);
			tempCtx.translate(penX, penY);

			// Set font and draw
			tempCtx.font = `${baseFontSize}px ${fontFamily}`;
			tempCtx.textAlign = 'start';
			tempCtx.textBaseline = 'alphabetic';
			tempCtx.fillStyle = '#ffffff';
			tempCtx.fillText(sprite.emoji, 0, 0);

			tempCtx.restore();
		});

		// Scan for opaque pixels to find actual content bounds
		const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
		const pixels = imageData.data;

		let cropMinX = canvasWidth, cropMinY = canvasHeight;
		let cropMaxX = 0, cropMaxY = 0;

		for (let y = 0; y < canvasHeight; y++) {
			for (let x = 0; x < canvasWidth; x++) {
				const alpha = pixels[(y * canvasWidth + x) * 4 + 3];
				if (alpha > 0) {
					cropMinX = Math.min(cropMinX, x);
					cropMinY = Math.min(cropMinY, y);
					cropMaxX = Math.max(cropMaxX, x);
					cropMaxY = Math.max(cropMaxY, y);
				}
			}
		}

		// If no opaque pixels found, download empty canvas
		if (cropMaxX < cropMinX || cropMaxY < cropMinY) {
			this.downloadCanvas(tempCanvas, 'sprite-export.png');
			return;
		}

		if (crop) {
			// Cropped mode: just crop to content bounds
			const croppedWidth = cropMaxX - cropMinX + 1;
			const croppedHeight = cropMaxY - cropMinY + 1;
			const borderPadding = addBorder ? 1 : 0;
			const croppedCanvas = document.createElement('canvas');
			croppedCanvas.width = croppedWidth + borderPadding * 2;
			croppedCanvas.height = croppedHeight + borderPadding * 2;
			const croppedCtx = croppedCanvas.getContext('2d');
			
			if (croppedCtx) {
				croppedCtx.putImageData(
					tempCtx.getImageData(cropMinX, cropMinY, croppedWidth, croppedHeight),
					borderPadding, borderPadding
				);
				this.downloadCanvas(croppedCanvas, 'sprite-export.png');
			}
		} else {
			// Uncropped mode: maintain centered origin
			// Calculate content bounds relative to canvas center
			const centerX = canvasWidth / 2;
			const centerY = canvasHeight / 2;
			
			const leftDist = centerX - cropMinX;
			const rightDist = cropMaxX - centerX;
			const upDist = centerY - cropMinY;
			const downDist = cropMaxY - centerY;
			
			// Find maximum distance in each direction
			const maxHorizDist = Math.max(leftDist, rightDist);
			const maxVertDist = Math.max(upDist, downDist);
			
			// Create canvas with centered origin
			const borderPadding = addBorder ? 1 : 0;
			const finalWidth = Math.ceil(maxHorizDist * 2);
			const finalHeight = Math.ceil(maxVertDist * 2);
			const finalCanvas = document.createElement('canvas');
			finalCanvas.width = finalWidth + borderPadding * 2;
			finalCanvas.height = finalHeight + borderPadding * 2;
			const finalCtx = finalCanvas.getContext('2d');
			
			if (finalCtx) {
				// Calculate source and destination rectangles
				const srcX = centerX - maxHorizDist;
				const srcY = centerY - maxVertDist;
				
				finalCtx.putImageData(
					tempCtx.getImageData(srcX, srcY, finalWidth, finalHeight),
					borderPadding, borderPadding
				);
				this.downloadCanvas(finalCanvas, 'sprite-export.png');
			}
		}
	}

	private downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
		canvas.toBlob(blob => {
			if (!blob) {
				console.error('Failed to create blob');
				return;
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.download = filename;
			link.href = url;
			link.click();
			URL.revokeObjectURL(url);
		}, 'image/png');
	}

	importJSON(json: string): boolean {
		try {
			const imported = JSON.parse(json);
			
			// Handle compact format (array of sprites without IDs)
			if (Array.isArray(imported)) {
				// Regenerate IDs and zIndex based on array order
				const sprites = imported.map((sprite, index) => {
					// Support multiple formats: shorthand (e/r/s/sx/sy) and full (emoji/rotation/scale/scaleX/scaleY)
					const emoji = sprite.e || sprite.emoji;
					const rotation = sprite.r !== undefined ? sprite.r : (sprite.rotation || 0);
					
					// Handle scale: 's' (uniform), 'sx'/'sy' (non-uniform), or old 'scaleX'/'scaleY' or 'scale'
					let scaleX = 1, scaleY = 1;
					if (sprite.s !== undefined) {
						// Uniform scale shorthand
						scaleX = scaleY = sprite.s;
					} else if (sprite.sx !== undefined || sprite.sy !== undefined) {
						// Non-uniform scale shorthand
						scaleX = sprite.sx !== undefined ? sprite.sx : 1;
						scaleY = sprite.sy !== undefined ? sprite.sy : 1;
					} else if (sprite.scaleX !== undefined || sprite.scaleY !== undefined) {
						// Old full format
						scaleX = sprite.scaleX !== undefined ? sprite.scaleX : 1;
						scaleY = sprite.scaleY !== undefined ? sprite.scaleY : 1;
					} else if (sprite.scale !== undefined) {
						// Legacy uniform scale
						scaleX = scaleY = sprite.scale;
					}
					
					return {
						id: `sprite-${this.state.nextId + index}`,
						emoji,
						x: sprite.x || 0,
						y: sprite.y || 0,
						rotation,
						scaleX,
						scaleY,
						zIndex: index, // zIndex is determined by array position
					};
				});
				
				this.state.sprites = sprites;
				this.state.nextId += sprites.length;
				this.state.selectedId = null;
				this.saveSnapshot();
				this.notifyListeners();
				return true;
			}
			
			// Handle legacy full format
			if (imported.sprites && Array.isArray(imported.sprites)) {
				this.state = imported;
				this.saveSnapshot();
				this.notifyListeners();
				return true;
			}
			
			return false;
		} catch (e) {
			console.error('Failed to import JSON:', e);
			return false;
		}
	}

	private saveSnapshot() {
		const snapshot = JSON.stringify(this.state);
		// Don't save duplicate snapshots
		if (this.undoStack[this.undoStack.length - 1] !== snapshot) {
			this.undoStack.push(snapshot);
			this.redoStack = []; // Clear redo stack on new action
			
			// Limit undo stack to 50 items
			if (this.undoStack.length > 50) {
				this.undoStack.shift();
			}
			
			// Save to localStorage
			try {
				localStorage.setItem(LOCALSTORAGE_KEY, snapshot);
			} catch (e) {
				console.error('Failed to save to localStorage:', e);
			}
		}
	}

	undo() {
		if (this.undoStack.length <= 1) return; // Keep at least one state
		
		const current = this.undoStack.pop()!;
		this.redoStack.push(current);
		
		const previous = this.undoStack[this.undoStack.length - 1];
		this.state = JSON.parse(previous);
		this.notifyListeners();
	}

	redo() {
		if (this.redoStack.length === 0) return;
		
		const next = this.redoStack.pop()!;
		this.undoStack.push(next);
		
		this.state = JSON.parse(next);
		this.notifyListeners();
	}

	canUndo(): boolean {
		return this.undoStack.length > 1;
	}

	canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	onChange(listener: () => void) {
		this.listeners.push(listener);
	}

	loadFromLocalStorage(): boolean {
		try {
			const stored = localStorage.getItem(LOCALSTORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Validate basic structure
				if (parsed.sprites && Array.isArray(parsed.sprites)) {
					this.state = parsed;
					this.undoStack = [stored];
					this.redoStack = [];
					this.notifyListeners();
					return true;
				}
			}
		} catch (e) {
			console.error('Failed to load from localStorage:', e);
		}
		
		// If no valid state was loaded, initialize undo stack with current (empty) state
		this.undoStack = [JSON.stringify(this.state)];
		return false;
	}

	private notifyListeners() {
		this.listeners.forEach(listener => listener());
	}
}
