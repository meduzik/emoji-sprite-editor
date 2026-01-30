import type { SpriteObject, Point } from './types';
import type { CanvasRenderer } from './canvas';
import type { StateManager } from './state';
import type { FontManager } from './fontManager';

const HANDLE_SIZE = 8; // Visual size
const HANDLE_HIT_SIZE = 14; // Hit area size
const ROTATION_HANDLE_OFFSET = 25;
const ROTATION_HANDLE_RADIUS = 6;
const BOUNDS_MARGIN = 4; // Margin around sprite bounds in pixels

enum InteractionMode {
	None,
	Dragging,
	Rotating,
	ScalingTopLeft,
	ScalingTopRight,
	ScalingBottomLeft,
	ScalingBottomRight,
}

interface Handle {
	x: number;
	y: number;
	width: number;
	height: number;
	mode: InteractionMode;
}

export class Gizmo {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private renderer: CanvasRenderer;
	private stateManager: StateManager;
	private fontManager: FontManager;
	private mode: InteractionMode = InteractionMode.None;
	private dragStartPos: Point | null = null;
	private dragStartSpriteState: Partial<SpriteObject> | null = null;
	private dragStartLocalPos: Point | null = null; // Local sprite coordinates at drag start

	constructor(
		canvas: HTMLCanvasElement,
		renderer: CanvasRenderer,
		stateManager: StateManager,
		fontManager: FontManager
	) {
		this.canvas = canvas;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Failed to get 2D context');
		this.ctx = ctx;
		this.renderer = renderer;
		this.stateManager = stateManager;
		this.fontManager = fontManager;

		this.setupEventListeners();
	}

	private setupEventListeners() {
		this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
		this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
		this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
		this.canvas.addEventListener('pointercancel', (e) => this.onPointerUp(e));
	}

	private getMousePos(e: PointerEvent): Point {
		const rect = this.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		return this.renderer.screenToWorld(screenX, screenY);
	}

	private onPointerDown(e: PointerEvent) {
		const mousePos = this.getMousePos(e);
		const selected = this.stateManager.getSelectedSprite();

		if (selected) {
			const handles = this.getHandles(selected);
			
			// Check rotation handle first
			const rotHandle = handles.find(h => h.mode === InteractionMode.Rotating);
			if (rotHandle && this.isPointInCircle(mousePos, { x: rotHandle.x, y: rotHandle.y }, ROTATION_HANDLE_RADIUS)) {
				this.mode = InteractionMode.Rotating;
				this.dragStartPos = mousePos;
				this.dragStartSpriteState = { ...selected };
				this.canvas.setPointerCapture(e.pointerId);
				return;
			}

			// Check corner handles
			for (const handle of handles) {
				if (handle.mode !== InteractionMode.Rotating && this.isPointInRect(mousePos, handle)) {
					this.mode = handle.mode;
					this.dragStartPos = mousePos;
					this.dragStartSpriteState = { ...selected };
					// Store local coordinates of the grab point
					this.dragStartLocalPos = this.worldToLocal(selected, mousePos.x, mousePos.y);
					this.canvas.setPointerCapture(e.pointerId);
					return;
				}
			}

			// Check which sprite is actually at this location (could be a different sprite on top)
			const sprites = this.stateManager.getState().sprites;
			const customFont = this.fontManager.getFontFamily();
			const hitId = this.renderer.hitTest(sprites, mousePos.x, mousePos.y, customFont);
			
			if (hitId && hitId !== selected.id) {
				// Clicked on a different sprite - select it and start dragging
				this.stateManager.selectSprite(hitId);
				const newlySelected = this.stateManager.getSelectedSprite();
				if (newlySelected) {
					this.mode = InteractionMode.Dragging;
					this.dragStartPos = mousePos;
					this.dragStartSpriteState = { ...newlySelected };
					this.canvas.setPointerCapture(e.pointerId);
				}
				return;
			} else if (hitId === selected.id) {
				// Clicked on the selected sprite - start dragging it
				this.mode = InteractionMode.Dragging;
				this.dragStartPos = mousePos;
				this.dragStartSpriteState = { ...selected };
				this.canvas.setPointerCapture(e.pointerId);
				return;
			}
			// If hitId is null, fall through to deselect below
		}

		// No selected sprite or clicked outside selected sprite - do hit test
		const sprites = this.stateManager.getState().sprites;
		const customFont = this.fontManager.getFontFamily();
		const hitId = this.renderer.hitTest(sprites, mousePos.x, mousePos.y, customFont);
		
		if (hitId) {
			// Found a sprite - select it and start dragging
			this.stateManager.selectSprite(hitId);
			const newlySelected = this.stateManager.getSelectedSprite();
			if (newlySelected) {
				this.mode = InteractionMode.Dragging;
				this.dragStartPos = mousePos;
				this.dragStartSpriteState = { ...newlySelected };
				this.canvas.setPointerCapture(e.pointerId);
			}
		} else {
			// Clicked outside all sprites - deselect
			this.stateManager.selectSprite(null);
		}
	}

	private onPointerMove(e: PointerEvent) {
		if (this.mode === InteractionMode.None || !this.dragStartPos || !this.dragStartSpriteState) {
			this.updateCursor(e);
			return;
		}

		const mousePos = this.getMousePos(e);
		const selected = this.stateManager.getSelectedSprite();
		if (!selected) return;

		const dx = mousePos.x - this.dragStartPos.x;
		const dy = mousePos.y - this.dragStartPos.y;

		switch (this.mode) {
			case InteractionMode.Dragging:
				this.stateManager.updateSpriteWithoutSnapshot(selected.id, {
					x: (this.dragStartSpriteState.x || 0) + dx,
					y: (this.dragStartSpriteState.y || 0) + dy,
				});
				break;

			case InteractionMode.Rotating:
				this.handleRotation(selected, mousePos);
				break;

			case InteractionMode.ScalingTopLeft:
			case InteractionMode.ScalingTopRight:
			case InteractionMode.ScalingBottomLeft:
			case InteractionMode.ScalingBottomRight:
				this.handleScaling(selected, mousePos, e.shiftKey);
				break;
		}
	}

	private onPointerUp(e: PointerEvent) {
		// Release pointer capture
		if (this.canvas.hasPointerCapture(e.pointerId)) {
			this.canvas.releasePointerCapture(e.pointerId);
		}

		// Finalize changes if an operation was in progress
		if (this.mode !== InteractionMode.None) {
			this.stateManager.finalizeChanges();
		}
		
		this.mode = InteractionMode.None;
		this.dragStartPos = null;
		this.dragStartSpriteState = null;
		this.dragStartLocalPos = null;
		this.updateCursor(e);
	}

	private handleRotation(sprite: SpriteObject, mousePos: Point) {
		if (!this.dragStartSpriteState) return;

		const centerX = sprite.x;
		const centerY = sprite.y;

		// Calculate angle from center to mouse
		// atan2 returns 0 for east, but our rotation handle is at north (top)
		// So we add 90 degrees to make north = 0 degrees
		const angle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX);
		const degrees = (angle * 180) / Math.PI + 90;

		this.stateManager.updateSpriteWithoutSnapshot(sprite.id, {
			rotation: degrees,
		});
	}

	private handleScaling(sprite: SpriteObject, mousePos: Point, shiftKey: boolean) {
		if (!this.dragStartPos || !this.dragStartSpriteState || !this.dragStartLocalPos) return;

		// Transform current mouse position to local coordinates using ORIGINAL scales
		// to avoid feedback loop
		const currentLocal = this.worldToLocalWithScale(
			sprite.x, 
			sprite.y, 
			sprite.rotation,
			this.dragStartSpriteState.scaleX || 1,
			this.dragStartSpriteState.scaleY || 1,
			mousePos.x, 
			mousePos.y
		);

		const startScaleX = this.dragStartSpriteState.scaleX || 1;
		const startScaleY = this.dragStartSpriteState.scaleY || 1;

		if (shiftKey) {
			// Non-uniform scaling: scale each axis independently
			// Calculate what scaleX would make currentLocal.x match dragStartLocalPos.x
			let newScaleX = startScaleX;
			if (Math.abs(this.dragStartLocalPos.x) > 0.001) {
				newScaleX = startScaleX * (currentLocal.x / this.dragStartLocalPos.x);
			}

			// Calculate what scaleY would make currentLocal.y match dragStartLocalPos.y
			let newScaleY = startScaleY;
			if (Math.abs(this.dragStartLocalPos.y) > 0.001) {
				newScaleY = startScaleY * (currentLocal.y / this.dragStartLocalPos.y);
			}

			this.stateManager.updateSpriteWithoutSnapshot(sprite.id, {
				scaleX: Math.max(0.1, Math.abs(newScaleX)),
				scaleY: Math.max(0.1, Math.abs(newScaleY)),
			});
		} else {
			// Uniform scaling: maintain aspect ratio
			// Calculate the average scale change needed to pin the point
			let scaleRatio = 1;
			
			const startDist = Math.sqrt(
				this.dragStartLocalPos.x * this.dragStartLocalPos.x +
				this.dragStartLocalPos.y * this.dragStartLocalPos.y
			);
			
			if (startDist > 0.001) {
				const currentDist = Math.sqrt(
					currentLocal.x * currentLocal.x +
					currentLocal.y * currentLocal.y
				);
				scaleRatio = currentDist / startDist;
			}

			const newScaleX = startScaleX * scaleRatio;
			const newScaleY = startScaleY * scaleRatio;

			this.stateManager.updateSpriteWithoutSnapshot(sprite.id, {
				scaleX: Math.max(0.1, newScaleX),
				scaleY: Math.max(0.1, newScaleY),
			});
		}
	}

	private updateCursor(e: PointerEvent) {
		const mousePos = this.getMousePos(e);
		const selected = this.stateManager.getSelectedSprite();

		if (!selected) {
			this.canvas.style.cursor = 'default';
			return;
		}

		const handles = this.getHandles(selected);
		
		// Check rotation handle
		const rotHandle = handles.find(h => h.mode === InteractionMode.Rotating);
		if (rotHandle && this.isPointInCircle(mousePos, { x: rotHandle.x, y: rotHandle.y }, ROTATION_HANDLE_RADIUS)) {
			this.canvas.style.cursor = 'grab';
			return;
		}

		// Check corner handles
		for (const handle of handles) {
			if (handle.mode !== InteractionMode.Rotating && this.isPointInRect(mousePos, handle)) {
				this.canvas.style.cursor = this.getCursorForHandle(handle, selected);
				return;
			}
		}

		// Check sprite bounds
		if (this.renderer.isPointInSprite(selected, mousePos.x, mousePos.y)) {
			this.canvas.style.cursor = 'move';
			return;
		}

		this.canvas.style.cursor = 'default';
	}

	drawGizmo(sprite: SpriteObject) {
		const customFont = this.fontManager.getFontFamily();
		const bounds = this.renderer.getSpriteBounds(sprite, customFont);
		const screenPos = this.renderer.worldToScreen(sprite.x, sprite.y);

		this.ctx.save();
		this.ctx.translate(screenPos.x, screenPos.y);
		this.ctx.rotate((sprite.rotation * Math.PI) / 180);

		// Draw bounding box (in local rotated and scaled space)
		this.ctx.strokeStyle = '#007acc';
		this.ctx.lineWidth = 2;
		// bounds already includes scale, so draw directly with margin
		const marginedWidth = bounds.width + BOUNDS_MARGIN * 2;
		const marginedHeight = bounds.height + BOUNDS_MARGIN * 2;
		this.ctx.strokeRect(
			-marginedWidth / 2,
			-marginedHeight / 2,
			marginedWidth,
			marginedHeight
		);

		// Get handles in local coordinates with margin
		const localHandles = [
			{ x: -marginedWidth / 2, y: -marginedHeight / 2, mode: InteractionMode.ScalingTopLeft },
			{ x: marginedWidth / 2, y: -marginedHeight / 2, mode: InteractionMode.ScalingTopRight },
			{ x: -marginedWidth / 2, y: marginedHeight / 2, mode: InteractionMode.ScalingBottomLeft },
			{ x: marginedWidth / 2, y: marginedHeight / 2, mode: InteractionMode.ScalingBottomRight },
			{ x: 0, y: -marginedHeight / 2 - ROTATION_HANDLE_OFFSET, mode: InteractionMode.Rotating },
		];

		// Draw corner handles (squares)
		this.ctx.fillStyle = '#ffffff';
		this.ctx.strokeStyle = '#007acc';
		this.ctx.lineWidth = 2;

		for (const handle of localHandles) {
			if (handle.mode === InteractionMode.Rotating) continue;
			
			this.ctx.fillRect(
				handle.x - HANDLE_SIZE / 2,
				handle.y - HANDLE_SIZE / 2,
				HANDLE_SIZE,
				HANDLE_SIZE
			);
			this.ctx.strokeRect(
				handle.x - HANDLE_SIZE / 2,
				handle.y - HANDLE_SIZE / 2,
				HANDLE_SIZE,
				HANDLE_SIZE
			);
		}

		// Draw rotation handle (circle)
		const rotHandle = localHandles.find(h => h.mode === InteractionMode.Rotating);
		if (rotHandle) {
			this.ctx.fillStyle = '#ffffff';
			this.ctx.strokeStyle = '#007acc';
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.arc(rotHandle.x, rotHandle.y, ROTATION_HANDLE_RADIUS, 0, Math.PI * 2);
			this.ctx.fill();
			this.ctx.stroke();
		}

		this.ctx.restore();
	}

	private getHandles(sprite: SpriteObject): Handle[] {
		const customFont = this.fontManager.getFontFamily();
		const bounds = this.renderer.getSpriteBounds(sprite, customFont);
		const handles: Handle[] = [];

		// Define handles in local (unrotated) coordinates with margin
		const marginedWidth = bounds.width + BOUNDS_MARGIN * 2;
		const marginedHeight = bounds.height + BOUNDS_MARGIN * 2;
		const localHandles = [
			{ x: -marginedWidth / 2, y: -marginedHeight / 2, mode: InteractionMode.ScalingTopLeft },
			{ x: marginedWidth / 2, y: -marginedHeight / 2, mode: InteractionMode.ScalingTopRight },
			{ x: -marginedWidth / 2, y: marginedHeight / 2, mode: InteractionMode.ScalingBottomLeft },
			{ x: marginedWidth / 2, y: marginedHeight / 2, mode: InteractionMode.ScalingBottomRight },
			{ x: 0, y: -marginedHeight / 2 - ROTATION_HANDLE_OFFSET, mode: InteractionMode.Rotating },
		];

		// Transform to world space with rotation
		for (const local of localHandles) {
			const rotated = this.renderer.rotatePoint(local.x, local.y, sprite.rotation);
			handles.push({
				x: sprite.x + rotated.x,
				y: sprite.y + rotated.y,
				width: local.mode === InteractionMode.Rotating ? ROTATION_HANDLE_RADIUS * 2 : HANDLE_HIT_SIZE,
				height: local.mode === InteractionMode.Rotating ? ROTATION_HANDLE_RADIUS * 2 : HANDLE_HIT_SIZE,
				mode: local.mode,
			});
		}

		return handles;
	}

	private isPointInRect(point: Point, rect: { x: number; y: number; width: number; height: number }): boolean {
		return (
			point.x >= rect.x - rect.width / 2 &&
			point.x <= rect.x + rect.width / 2 &&
			point.y >= rect.y - rect.height / 2 &&
			point.y <= rect.y + rect.height / 2
		);
	}

	private isPointInCircle(point: Point, center: Point, radius: number): boolean {
		const dx = point.x - center.x;
		const dy = point.y - center.y;
		return Math.sqrt(dx * dx + dy * dy) <= radius;
	}

	private getCursorForHandle(handle: Handle, sprite: SpriteObject): string {
		// Calculate the visual angle of the handle from sprite center
		const dx = handle.x - sprite.x;
		const dy = handle.y - sprite.y;
		
		// Get angle in degrees (0 = right, 90 = down, 180 = left, 270 = up)
		let angle = Math.atan2(dy, dx) * 180 / Math.PI;
		
		// Normalize to 0-360
		if (angle < 0) angle += 360;
		
		// Snap to 8 directions (0, 45, 90, 135, 180, 225, 270, 315)
		// and map to resize cursors
		angle = (angle + 22.5) % 360; // Offset by half a segment for rounding
		const direction = Math.floor(angle / 45);
		
		// Map directions to cursors
		// 0: e, 1: se, 2: s, 3: sw, 4: w, 5: nw, 6: n, 7: ne
		const cursors = ['e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize', 'n-resize', 'ne-resize'];
		return cursors[direction] || 'nwse-resize';
	}

	// Transform world coordinates to local sprite coordinates (unrotated, unscaled)
	private worldToLocal(sprite: SpriteObject, worldX: number, worldY: number): Point {
		return this.worldToLocalWithScale(
			sprite.x,
			sprite.y,
			sprite.rotation,
			sprite.scaleX,
			sprite.scaleY,
			worldX,
			worldY
		);
	}

	// Transform world coordinates to local sprite coordinates with explicit scale values
	private worldToLocalWithScale(
		spriteX: number,
		spriteY: number,
		rotation: number,
		scaleX: number,
		scaleY: number,
		worldX: number,
		worldY: number
	): Point {
		// Translate to sprite origin
		const localX = worldX - spriteX;
		const localY = worldY - spriteY;
		
		// Rotate by negative rotation to get unrotated coordinates
		const rad = (-rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const rotatedX = localX * cos - localY * sin;
		const rotatedY = localX * sin + localY * cos;
		
		// Unscale by dividing by scale factors
		return {
			x: rotatedX / scaleX,
			y: rotatedY / scaleY,
		};
	}
}
