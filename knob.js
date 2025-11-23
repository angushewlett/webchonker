// synth-knob.js
class SynthKnob extends HTMLElement {
  static get observedAttributes() {
    return ['min', 'max', 'value'];
  }

  constructor() {
    super();
    this._min = 0;
    this._max = 100;
    this._value = 50;

    this._angleMin = -135; // degrees
    this._angleMax = 135;

    this.attachShadow({ mode: 'open' });
    this._root = document.createElement('div');
    this._root.innerHTML = `
      <style>
        :host {
          display: inline-block;
          touch-action: none;
        }
        svg {
          width: 100%;
          height: 100%;
        }
      </style>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" stroke-width="4" stroke="currentColor" fill="none" />
        <line id="pointer" x1="50" y1="50" x2="50" y2="20"
              stroke-width="4" stroke="currentColor"
              stroke-linecap="round" />
      </svg>
    `;
    this.shadowRoot.appendChild(this._root);

    this._pointer = this.shadowRoot.querySelector('#pointer');

    this._dragging = false;
    this._startY = 0;
    this._startValue = 0;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('min');
    this._upgradeProperty('max');
    this._upgradeProperty('value');

    this._root.addEventListener('pointerdown', this._onPointerDown);
    this._updateVisual();
  }

  disconnectedCallback() {
    this._root.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
  }

  // Ensure properties set before definition get synced
  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      let value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    switch (name) {
      case 'min': this._min = Number(newVal); break;
      case 'max': this._max = Number(newVal); break;
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

  _valueToAngle() {
    const t = (this._value - this._min) / (this._max - this._min || 1);
    return this._angleMin + t * (this._angleMax - this._angleMin);
  }

  _updateVisual() {
    const angle = this._valueToAngle();
    this._pointer.setAttribute('transform', `rotate(${angle} 50 50)`);
  }

  _onPointerDown(e) {
    e.preventDefault();
    this._dragging = true;
    this._startY = e.clientY;
    this._startValue = this._value;
    this.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  _onPointerMove(e) {
    if (!this._dragging) return;
    const dy = this._startY - e.clientY; // drag up to increase
    const range = this._max - this._min || 1;
    const sensitivity = range / 200; // tweak for feel
    let newValue = this._startValue + dy * sensitivity;
    newValue = Math.min(this._max, Math.max(this._min, newValue));
    if (newValue !== this._value) {
      this._value = newValue;
      this.setAttribute('value', String(this._value));
      this._updateVisual();
      this.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  _onPointerUp(e) {
    if (!this._dragging) return;
    this._dragging = false;
    this.releasePointerCapture(e.pointerId);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }
}



class SynthKnobLarge extends SynthKnob {}
class SynthKnobSmall extends SynthKnob {}


customElements.define('synth-knob-large', SynthKnobLarge);
customElements.define('synth-knob-small', SynthKnobSmall);

