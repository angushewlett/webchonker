// synth-knob.js
class SynthKnob extends HTMLElement {
  static get observedAttributes() {
    return ['min', 'max', 'value'];
  }

  constructor() {
    super();
    this._min = 0.0;
    this._max = 1.0;
    this._value = 0.5;

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
      <svg viewBox="0 0 95 92">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M46.0298 80.8872C63.1506 80.8872 77.0298 67.0081 77.0298 49.8872C77.0298 32.7664 63.1506 18.8872 46.0298 18.8872C28.909 18.8872 15.0298 32.7664 15.0298 49.8872C15.0298 67.0081 28.909 80.8872 46.0298 80.8872ZM46.0298 81.8872C63.7029 81.8872 78.0298 67.5603 78.0298 49.8872C78.0298 32.2141 63.7029 17.8872 46.0298 17.8872C28.3567 17.8872 14.0298 32.2141 14.0298 49.8872C14.0298 67.5603 28.3567 81.8872 46.0298 81.8872Z" fill="black" fill-opacity="0.25"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M46.0298 78.8872C63.1506 78.8872 77.0298 65.0081 77.0298 47.8872C77.0298 30.7664 63.1506 16.8872 46.0298 16.8872C28.909 16.8872 15.0298 30.7664 15.0298 47.8872C15.0298 65.0081 28.909 78.8872 46.0298 78.8872ZM46.0298 79.8872C63.7029 79.8872 78.0298 65.5603 78.0298 47.8872C78.0298 30.2141 63.7029 15.8872 46.0298 15.8872C28.3567 15.8872 14.0298 30.2141 14.0298 47.8872C14.0298 65.5603 28.3567 79.8872 46.0298 79.8872Z" fill="white" fill-opacity="0.03"/>
    <path d="M78.0298 48.8872C78.0298 66.5603 63.7029 80.8872 46.0298 80.8872C28.3567 80.8872 14.0298 66.5603 14.0298 48.8872C14.0298 31.2141 28.3567 16.8872 46.0298 16.8872C63.7029 16.8872 78.0298 31.2141 78.0298 48.8872Z" fill="url(#paint0_linear_15_165)"/>
    <g filter="url(#filter0_d_15_165)">
    <path d="M74.0298 48.8872C74.0298 64.3512 61.4938 76.8872 46.0298 76.8872C30.5658 76.8872 18.0298 64.3512 18.0298 48.8872C18.0298 33.4233 30.5658 20.8872 46.0298 20.8872C61.4938 20.8872 74.0298 33.4233 74.0298 48.8872Z" fill="url(#paint1_linear_15_165)"/>
    </g>
    <g clip-path="url(#paint2_angular_15_165_clip_path)" data-figma-skip-parse="true"><g transform="matrix(-0.0161888 0.0163378 -0.0163378 -0.0161888 46.0298 48.8872)"><foreignObject x="-1475.69" y="-1475.69" width="2951.37" height="2951.37"><div xmlns="http://www.w3.org/1999/xhtml" style="background:conic-gradient(from 90deg,rgba(64, 64, 64, 1) 0deg,rgba(56, 56, 56, 1) 90deg,rgba(64, 64, 64, 1) 180deg,rgba(56, 56, 56, 1) 270deg,rgba(64, 64, 64, 1) 360deg);height:100%;width:100%;opacity:1"></div></foreignObject></g></g><path d="M69.0298 48.8872C69.0298 61.5898 58.7323 71.8872 46.0298 71.8872C33.3272 71.8872 23.0298 61.5898 23.0298 48.8872C23.0298 36.1847 33.3272 25.8872 46.0298 25.8872C58.7323 25.8872 69.0298 36.1847 69.0298 48.8872Z" data-figma-gradient-fill="{&#34;type&#34;:&#34;GRADIENT_ANGULAR&#34;,&#34;stops&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.25098040699958801,&#34;g&#34;:0.25098040699958801,&#34;b&#34;:0.25098040699958801,&#34;a&#34;:1.0},&#34;position&#34;:0.0},{&#34;color&#34;:{&#34;r&#34;:0.21960784494876862,&#34;g&#34;:0.21960784494876862,&#34;b&#34;:0.21960784494876862,&#34;a&#34;:1.0},&#34;position&#34;:0.250},{&#34;color&#34;:{&#34;r&#34;:0.25098040699958801,&#34;g&#34;:0.25098040699958801,&#34;b&#34;:0.25098040699958801,&#34;a&#34;:1.0},&#34;position&#34;:0.50},{&#34;color&#34;:{&#34;r&#34;:0.21960784494876862,&#34;g&#34;:0.21960784494876862,&#34;b&#34;:0.21960784494876862,&#34;a&#34;:1.0},&#34;position&#34;:0.750},{&#34;color&#34;:{&#34;r&#34;:0.25098040699958801,&#34;g&#34;:0.25098040699958801,&#34;b&#34;:0.25098040699958801,&#34;a&#34;:1.0},&#34;position&#34;:1.0}],&#34;stopsVar&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.25098040699958801,&#34;g&#34;:0.25098040699958801,&#34;b&#34;:0.25098040699958801,&#34;a&#34;:1.0},&#34;position&#34;:0.0},{&#34;color&#34;:{&#34;r&#34;:0.21960784494876862,&#34;g&#34;:0.21960784494876862,&#34;b&#34;:0.21960784494876862,&#34;a&#34;:1.0},&#34;position&#34;:0.250},{&#34;color&#34;:{&#34;r&#34;:0.25098040699958801,&#34;g&#34;:0.25098040699958801,&#34;b&#34;:0.25098040699958801,&#34;a&#34;:1.0},&#34;position&#34;:0.50},{&#34;color&#34;:{&#34;r&#34;:0.21960784494876862,&#34;g&#34;:0.21960784494876862,&#34;b&#34;:0.21960784494876862,&#34;a&#34;:1.0},&#34;position&#34;:0.750},{&#34;color&#34;:{&#34;r&#34;:0.25098040699958801,&#34;g&#34;:0.25098040699958801,&#34;b&#34;:0.25098040699958801,&#34;a&#34;:1.0},&#34;position&#34;:1.0}],&#34;transform&#34;:{&#34;m00&#34;:-32.377559661865234,&#34;m01&#34;:-32.675579071044922,&#34;m02&#34;:78.556350708007812,&#34;m10&#34;:32.675579071044922,&#34;m11&#34;:-32.377559661865234,&#34;m12&#34;:48.738227844238281},&#34;opacity&#34;:1.0,&#34;blendMode&#34;:&#34;NORMAL&#34;,&#34;visible&#34;:true}"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M46.0298 70.8872C58.18 70.8872 68.0298 61.0375 68.0298 48.8872C68.0298 36.737 58.18 26.8872 46.0298 26.8872C33.8795 26.8872 24.0298 36.737 24.0298 48.8872C24.0298 61.0375 33.8795 70.8872 46.0298 70.8872ZM46.0298 71.8872C58.7323 71.8872 69.0298 61.5898 69.0298 48.8872C69.0298 36.1847 58.7323 25.8872 46.0298 25.8872C33.3272 25.8872 23.0298 36.1847 23.0298 48.8872C23.0298 61.5898 33.3272 71.8872 46.0298 71.8872Z" fill="white" fill-opacity="0.12"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M46.0298 26.3872C33.6034 26.3872 23.5298 36.4608 23.5298 48.8872C23.5298 61.3136 33.6034 71.3872 46.0298 71.3872C58.4562 71.3872 68.5298 61.3136 68.5298 48.8872C68.5298 36.4608 58.4562 26.3872 46.0298 26.3872ZM22.5298 48.8872C22.5298 35.9085 33.0511 25.3872 46.0298 25.3872C59.0085 25.3872 69.5298 35.9085 69.5298 48.8872C69.5298 61.8659 59.0085 72.3872 46.0298 72.3872C33.0511 72.3872 22.5298 61.8659 22.5298 48.8872Z" fill="black" fill-opacity="0.2"/>
    <path d="M47.0298 12.8872C47.0298 13.4395 46.5821 13.8872 46.0298 13.8872C45.4775 13.8872 45.0298 13.4395 45.0298 12.8872C45.0298 12.335 45.4775 11.8872 46.0298 11.8872C46.5821 11.8872 47.0298 12.335 47.0298 12.8872Z" fill="white" fill-opacity="0.36"/>
    <path d="M82.5298 50.3872C81.9775 50.3872 81.5298 49.9395 81.5298 49.3872C81.5298 48.8349 81.9775 48.3872 82.5298 48.3872C83.0821 48.3872 83.5298 48.8349 83.5298 49.3872C83.5298 49.9395 83.0821 50.3872 82.5298 50.3872Z" fill="white" fill-opacity="0.36"/>
    <path d="M9.52979 50.3872C8.9775 50.3872 8.52979 49.9395 8.52979 49.3872C8.52979 48.8349 8.9775 48.3872 9.52979 48.3872C10.0821 48.3872 10.5298 48.8349 10.5298 49.3872C10.5298 49.9395 10.0821 50.3872 9.52979 50.3872Z" fill="white" fill-opacity="0.36"/>
    <path d="M71.1321 75.9038C70.7416 75.5132 70.7416 74.8801 71.1321 74.4895C71.5226 74.099 72.1558 74.099 72.5463 74.4895C72.9368 74.8801 72.9368 75.5132 72.5463 75.9038C72.1558 76.2943 71.5226 76.2943 71.1321 75.9038Z" fill="white" fill-opacity="0.36"/>
    <path d="M19.5133 24.285C19.1228 23.8944 19.1228 23.2613 19.5133 22.8707C19.9038 22.4802 20.537 22.4802 20.9275 22.8707C21.3181 23.2613 21.3181 23.8944 20.9275 24.285C20.537 24.6755 19.9038 24.6755 19.5133 24.285Z" fill="white" fill-opacity="0.36"/>
    <path d="M72.5463 24.285C72.1558 24.6755 71.5226 24.6755 71.1321 24.285C70.7415 23.8944 70.7415 23.2613 71.1321 22.8707C71.5226 22.4802 72.1558 22.4802 72.5463 22.8707C72.9368 23.2613 72.9368 23.8944 72.5463 24.285Z" fill="white" fill-opacity="0.36"/>
    <path d="M20.9275 75.9037C20.537 76.2943 19.9038 76.2943 19.5133 75.9037C19.1228 75.5132 19.1228 74.88 19.5133 74.4895C19.9038 74.099 20.537 74.099 20.9275 74.4895C21.318 74.88 21.318 75.5132 20.9275 75.9037Z" fill="white" fill-opacity="0.36"/>
    <defs>
    <filter id="filter0_d_15_165" x="14.0298" y="20.8872" width="64" height="71" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
    <feOffset dy="11"/>
    <feGaussianBlur stdDeviation="2"/>
    <feComposite in2="hardAlpha" operator="out"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.32 0"/>
    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_165"/>
    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_165" result="shape"/>
    </filter>
    <clipPath id="paint2_angular_15_165_clip_path"><path d="M69.0298 48.8872C69.0298 61.5898 58.7323 71.8872 46.0298 71.8872C33.3272 71.8872 23.0298 61.5898 23.0298 48.8872C23.0298 36.1847 33.3272 25.8872 46.0298 25.8872C58.7323 25.8872 69.0298 36.1847 69.0298 48.8872Z"/></clipPath><linearGradient id="paint0_linear_15_165" x1="46.0298" y1="16.8872" x2="46.0298" y2="80.8872" gradientUnits="userSpaceOnUse">
    <stop stop-color="#282828"/>
    <stop offset="1" stop-color="#202020"/>
    </linearGradient>
    <linearGradient id="paint1_linear_15_165" x1="46.0298" y1="20.8872" x2="46.0298" y2="76.8872" gradientUnits="userSpaceOnUse">
    <stop stop-color="#404040"/>
    <stop offset="0.08" stop-color="#343434"/>
    <stop offset="0.26" stop-color="#323232"/>
    <stop offset="1" stop-color="#282828"/>
    </linearGradient>
    </defs>
        <line id="pointer" x1="46" y1="30" x2="46" y2="25"
              stroke-width="3" stroke="#A0A0A0"
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
    this._pointer.setAttribute('transform', `rotate(${angle} 46 48)`);
  }

  _onPointerDown(e) {
    e.preventDefault();
    this._dragging = true;
    this._startY = e.clientY;
    this._startValue = this._value;
    this.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    this.dispatchEvent(new Event('mouseDown', { bubbles: true }));
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
    this.dispatchEvent(new Event('mouseUp', { bubbles: true }));
  }
}



class SynthKnobLarge extends SynthKnob {}
class SynthKnobSmall extends SynthKnob {}


customElements.define('synth-knob-large', SynthKnobLarge);
customElements.define('synth-knob-small', SynthKnobSmall);

