// synth-slider.js
class SynthSlider extends HTMLElement {
  static get observedAttributes() {
    return ['min', 'max', 'value'];
  }

  constructor() {
    super();

    this._min = 0;
    this._max = 100;
    this._value = 50;

    this._dragging = false;
    this._startY = 0;
    this._startValue = 0;
    this._pixelHeight = 1;

    // SVG track geometry (viewBox units)
    this._trackTop = 10;
    this._trackBottom = 110;
    this._trackHeight = this._trackBottom - this._trackTop;

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          touch-action: none;
          user-select: none;
        }
        svg {
          width: 100%;
          height: 100%;
        }
      </style>
      <svg viewBox="0 0 40 120">
        <!-- Background / panel -->
        <rect x="0" y="0" width="40" height="120" fill="none" />

        <!-- Track -->
        <rect id="track" x="18" y="10" width="4" height="100"
              rx="2" ry="2"
              fill="currentColor" opacity="0.25" />

        <!-- Fill (value) -->
        <rect id="fill" x="18" y="110" width="4" height="0"
              rx="2" ry="2"
              fill="currentColor" opacity="0.9" />
      </svg>
    `;

    this._svg = this.shadowRoot.querySelector('svg');
    this._fill = this.shadowRoot.querySelector('#fill');

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('min');
    this._upgradeProperty('max');
    this._upgradeProperty('value');

    // Measure the control's pixel height for drag scaling
    const rect = this.getBoundingClientRect();
    this._pixelHeight = rect.height || 1;

    this._svg.addEventListener('pointerdown', this._onPointerDown);
    this._updateVisual();
  }

  disconnectedCallback() {
    this._svg.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
  }

  // Ensure properties set before definition are synced with attributes
  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    switch (name) {
      case 'min':   this._min = Number(newVal); break;
      case 'max':   this._max = Number(newVal); break;
      case 'value': this._value = Number(newVal); break;
    }
    this._clampValue();
    this._updateVisual();
  }

  get min() { return this._min; }
  set min(v) { this.setAttribute('min', v); }

  get max() { return this._max; }
  set max(v) { this.setAttribute('max', v); }

  get value() { return this._value; }
  set value(v) { this.setAttribute('value', v); }

  _clampValue() {
    if (this._value < this._min) this._value = this._min;
    if (this._value > this._max) this._value = this._max;
  }

  _valueToRatio() {
    const range = this._max - this._min || 1;
    return (this._value - this._min) / range; // 0..1
  }

  _updateVisual() {
    if (!this._fill) return;

    const ratio = this._valueToRatio();      // 0..1 (0 = empty, 1 = full)
    const h = ratio * this._trackHeight;     // height in viewBox units
    const y = this._trackBottom - h;         // anchor at bottom

    this._fill.setAttribute('y', y);
    this._fill.setAttribute('height', h);
  }

  _onPointerDown(e) {
    e.preventDefault();
    this._dragging = true;
    this._startY = e.clientY;
    this._startValue = this._value;

    try {
      this._svg.setPointerCapture(e.pointerId);
    } catch (_) {}

    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  _onPointerMove(e) {
    if (!this._dragging) return;

    const dy = this._startY - e.clientY; // drag up -> positive
    const range = this._max - this._min || 1;

    // convert drag distance relative to control height into value delta
    const fraction = dy / this._pixelHeight;
    let newValue = this._startValue + fraction * range;

    // clamp & update
    const old = this._value;
    newValue = Math.max(this._min, Math.min(this._max, newValue));
    this._value = newValue;
    this.setAttribute('value', String(this._value));
    this._updateVisual();

    if (this._value !== old) {
      this.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  _onPointerUp(e) {
    if (!this._dragging) return;
    this._dragging = false;

    try {
      this._svg.releasePointerCapture(e.pointerId);
    } catch (_) {}

    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);

    this.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

customElements.define('synth-slider', SynthSlider);

