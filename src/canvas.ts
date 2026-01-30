import type { SpriteObject, Point, Bounds } from './types';

const BASE_FONT_SIZE = 80; // Scale 1.0 = 80px font size

export class CanvasRenderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private centerX: number = 0;
	private centerY: number = 0;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get 2D context');
		this.ctx = ctx;
		this.updateSize();
	}

	updateSize() {
		const rect = this.canvas.getBoundingClientRect();
		this.canvas.width = rect.width;
		this.canvas.height = rect.height;
		this.centerX = this.canvas.width / 2;
		this.centerY = this.canvas.height / 2;
	}

	clear() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	render(sprites: SpriteObject[], showOrigin: boolean = true, axesOnTop: boolean = false, borderOnTop: boolean = false, customFont: string = 'Arial') {
		this.clear();

		// Draw axes and border below sprites if not on top
		if (showOrigin && !axesOnTop) {
			this.drawAxes();
		}
		if (showOrigin && !borderOnTop) {
			this.drawBorder();
		}

		// Sort sprites by zIndex
		const sorted = [...sprites].sort((a, b) => a.zIndex - b.zIndex);

		// Draw all sprites
		sorted.forEach(sprite => {
			this.drawSprite(sprite, customFont);
		});

		// Draw axes and border on top if enabled
		if (showOrigin && axesOnTop) {
			this.drawAxes();
		}
		if (showOrigin && borderOnTop) {
			this.drawBorder();
		}
	}

	private drawAxes() {
		this.ctx.strokeStyle = '#444444';
		this.ctx.lineWidth = 1;
		
		// X axis (horizontal)
		this.ctx.beginPath();
		this.ctx.moveTo(0, this.centerY);
		this.ctx.lineTo(this.canvas.width, this.centerY);
		this.ctx.stroke();
		
		// Y axis (vertical)
		this.ctx.beginPath();
		this.ctx.moveTo(this.centerX, 0);
		this.ctx.lineTo(this.centerX, this.canvas.height);
		this.ctx.stroke();
	}

	private drawBorder() {
		this.ctx.strokeStyle = '#666666';
		this.ctx.lineWidth = 1;
		
		// Inner border (160x160)
		this.ctx.strokeRect(
			this.centerX - 80,
			this.centerY - 80,
			160,
			160
		);
		
		// Outer border (320x320)
		this.ctx.strokeRect(
			this.centerX - 160,
			this.centerY - 160,
			320,
			320
		);
	}

	drawSprite(sprite: SpriteObject, customFont: string = 'Arial') {
		this.ctx.save();

		const bounds = this.getSpriteBounds(sprite, customFont);

		// Translate to world position
		const screenX = this.centerX + sprite.x;
		const screenY = this.centerY + sprite.y;
		
		this.ctx.translate(screenX, screenY);
		this.ctx.rotate((sprite.rotation * Math.PI) / 180);
		this.ctx.scale(sprite.scaleX, sprite.scaleY);
		this.ctx.translate(bounds.penX, bounds.penY);

		// Set font size (base size, scaling applied via transform)
		const fontSize = BASE_FONT_SIZE;
		this.ctx.font = `${fontSize}px ${customFont}`;
		this.ctx.textAlign = 'start';
		this.ctx.textBaseline = 'alphabetic';

		// Draw the emoji
		this.ctx.fillStyle = '#ffffff';
		this.ctx.fillText(sprite.emoji, 0, 0);

		this.ctx.restore();
	}

	getSpriteBounds(sprite: SpriteObject, customFont: string = 'Arial'): Bounds {
		const fontSize = BASE_FONT_SIZE;
		this.ctx.font = `${fontSize}px ${customFont}`;
		const metrics = this.ctx.measureText(sprite.emoji);

		let left = metrics.actualBoundingBoxLeft;
		let right = metrics.actualBoundingBoxRight;
		let ascent = metrics.actualBoundingBoxAscent;
		let descent = metrics.actualBoundingBoxDescent;

		// Base width and height (unscaled)
		let baseWidth = left + right;
		let baseHeight = ascent + descent;

		// Apply scale factors
		let width = baseWidth * sprite.scaleX;
		let height = baseHeight * sprite.scaleY;

		let penX = (-baseWidth / 2 + left);
		let penY = (ascent - baseHeight / 2);

		// Return bounds in world coordinates (centered on sprite position)
		return {
			x: sprite.x - width / 2,
			y: sprite.y - height / 2,
			width: width,
			height: height,
			penX: penX,
			penY: penY
		};
	}

	screenToWorld(screenX: number, screenY: number): Point {
		return {
			x: screenX - this.centerX,
			y: screenY - this.centerY,
		};
	}

	worldToScreen(worldX: number, worldY: number): Point {
		return {
			x: this.centerX + worldX,
			y: this.centerY + worldY,
		};
	}

	// Test if a point in world space is inside a sprite (accounting for rotation)
	isPointInSprite(sprite: SpriteObject, worldX: number, worldY: number, customFont: string = 'Arial'): boolean {
		const bounds = this.getSpriteBounds(sprite, customFont);
		
		// Transform the point from world space to the sprite's local (rotated) space
		const localX = worldX - sprite.x;
		const localY = worldY - sprite.y;
		
		// Rotate the point by negative rotation to get it in the sprite's coordinate system
		const rad = (-sprite.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const rotatedX = localX * cos - localY * sin;
		const rotatedY = localX * sin + localY * cos;
		
		// Check if the rotated point is within the unrotated bounds
		return (
			rotatedX >= -bounds.width / 2 &&
			rotatedX <= bounds.width / 2 &&
			rotatedY >= -bounds.height / 2 &&
			rotatedY <= bounds.height / 2
		);
	}

	hitTest(sprites: SpriteObject[], worldX: number, worldY: number, customFont: string = 'Arial'): string | null {
		// Test in reverse zIndex order (top to bottom)
		const sorted = [...sprites].sort((a, b) => b.zIndex - a.zIndex);

		for (const sprite of sorted) {
			if (this.isPointInSprite(sprite, worldX, worldY, customFont)) {
				return sprite.id;
			}
		}

		return null;
	}

	getCenterX(): number {
		return this.centerX;
	}

	getCenterY(): number {
		return this.centerY;
	}

	// Transform a point from local (unrotated) space to world space
	rotatePoint(x: number, y: number, rotation: number): Point {
		const rad = (rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		return {
			x: x * cos - y * sin,
			y: x * sin + y * cos,
		};
	}
}
