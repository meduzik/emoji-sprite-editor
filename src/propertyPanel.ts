import type { StateManager } from './state';

export class PropertyPanel {
	private panelEl: HTMLElement;
	private textInput: HTMLInputElement;
	private xInput: HTMLInputElement;
	private yInput: HTMLInputElement;
	private rotationInput: HTMLInputElement;
	private scaleXInput: HTMLInputElement;
	private scaleYInput: HTMLInputElement;
	private frontBtn: HTMLButtonElement;
	private forwardBtn: HTMLButtonElement;
	private backBtn: HTMLButtonElement;
	private backwardBtn: HTMLButtonElement;
	private deleteBtn: HTMLButtonElement;
	private stateManager: StateManager;
	private isUpdating: boolean = false;
	private customFont: string = 'Arial';

	constructor(
		panelEl: HTMLElement,
		textInput: HTMLInputElement,
		xInput: HTMLInputElement,
		yInput: HTMLInputElement,
		rotationInput: HTMLInputElement,
		scaleXInput: HTMLInputElement,
		scaleYInput: HTMLInputElement,
		frontBtn: HTMLButtonElement,
		forwardBtn: HTMLButtonElement,
		backBtn: HTMLButtonElement,
		backwardBtn: HTMLButtonElement,
		deleteBtn: HTMLButtonElement,
		stateManager: StateManager
	) {
		this.panelEl = panelEl;
		this.textInput = textInput;
		this.xInput = xInput;
		this.yInput = yInput;
		this.rotationInput = rotationInput;
		this.scaleXInput = scaleXInput;
		this.scaleYInput = scaleYInput;
		this.frontBtn = frontBtn;
		this.forwardBtn = forwardBtn;
		this.backBtn = backBtn;
		this.backwardBtn = backwardBtn;
		this.deleteBtn = deleteBtn;
		this.stateManager = stateManager;

		this.setupEventListeners();
		this.update();
	}

	private setupEventListeners() {
		// Input change handlers
		this.textInput.addEventListener('input', () => this.onPropertyChange());
		this.xInput.addEventListener('input', () => this.onPropertyChange());
		this.yInput.addEventListener('input', () => this.onPropertyChange());
		this.rotationInput.addEventListener('input', () => this.onPropertyChange());
		this.scaleXInput.addEventListener('input', () => this.onPropertyChange());
		this.scaleYInput.addEventListener('input', () => this.onPropertyChange());

		// Layer control buttons
		this.frontBtn.addEventListener('click', () => {
			const selected = this.stateManager.getSelectedSprite();
			if (selected) {
				this.stateManager.moveLayerToFront(selected.id);
			}
		});

		this.forwardBtn.addEventListener('click', () => {
			const selected = this.stateManager.getSelectedSprite();
			if (selected) {
				this.stateManager.moveLayerUp(selected.id);
			}
		});

		this.backBtn.addEventListener('click', () => {
			const selected = this.stateManager.getSelectedSprite();
			if (selected) {
				this.stateManager.moveLayerToBack(selected.id);
			}
		});

		this.backwardBtn.addEventListener('click', () => {
			const selected = this.stateManager.getSelectedSprite();
			if (selected) {
				this.stateManager.moveLayerDown(selected.id);
			}
		});

		this.deleteBtn.addEventListener('click', () => {
			const selected = this.stateManager.getSelectedSprite();
			if (selected) {
				this.stateManager.deleteSprite(selected.id);
			}
		});
	}

	private onPropertyChange() {
		if (this.isUpdating) return;

		const selected = this.stateManager.getSelectedSprite();
		if (!selected) return;

		const emoji = this.textInput.value || selected.emoji;
		const x = parseFloat(this.xInput.value) || 0;
		const y = parseFloat(this.yInput.value) || 0;
		const rotation = parseFloat(this.rotationInput.value) || 0;
		const scaleX = parseFloat(this.scaleXInput.value) || 1;
		const scaleY = parseFloat(this.scaleYInput.value) || 1;

		this.stateManager.updateSprite(selected.id, {
			emoji,
			x,
			y,
			rotation,
			scaleX: Math.max(0.1, scaleX), // Minimum scale
			scaleY: Math.max(0.1, scaleY), // Minimum scale
		});
	}

	update() {
		this.isUpdating = true;

		const selected = this.stateManager.getSelectedSprite();

		if (selected) {
			this.panelEl.classList.remove('disabled');
			this.textInput.value = selected.emoji;
			this.textInput.style.fontFamily = this.customFont;
			this.xInput.value = selected.x.toFixed(0);
			this.yInput.value = selected.y.toFixed(0);
			this.rotationInput.value = selected.rotation.toFixed(0);
			this.scaleXInput.value = selected.scaleX.toFixed(2);
			this.scaleYInput.value = selected.scaleY.toFixed(2);
		} else {
			this.panelEl.classList.add('disabled');
			this.textInput.value = '';
			this.xInput.value = '';
			this.yInput.value = '';
			this.rotationInput.value = '';
			this.scaleXInput.value = '';
			this.scaleYInput.value = '';
		}

		this.isUpdating = false;
	}

	public setCustomFont(font: string) {
		this.customFont = font;
		this.textInput.style.fontFamily = font;
	}
}
