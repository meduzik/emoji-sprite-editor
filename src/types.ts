export interface SpriteObject {
	id: string;
	emoji: string;
	x: number; // Position from canvas center
	y: number; // Position from canvas center
	rotation: number; // Degrees
	scaleX: number; // Horizontal scale multiplier where 1.0 = 40px font size
	scaleY: number; // Vertical scale multiplier where 1.0 = 40px font size
	zIndex: number;
}

export interface EditorState {
	sprites: SpriteObject[];
	selectedId: string | null;
	nextId: number;
	showOrigin: boolean;
	axesOnTop: boolean;
	borderOnTop: boolean;
}

export interface Point {
	x: number;
	y: number;
}

export interface Bounds {
	x: number;
	y: number;
	width: number;
	height: number;
	penX: number;
	penY: number;
}
