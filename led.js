// synth-led.js
class SynthLED extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'color'];
  }

  constructor() {
    super();

    this._value = 0;      // 0..1 brightness
    this._color = '#0f0'; // default green

    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          width: 16px;
          height: 8px;
          box-sizing: border-box;
          pointer-events: none; /* let clicks pass "through" the LED */
        }

        svg {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .frame {
          fill: #111;
          stroke: #444;
          stroke-width: 1;
        }

        .off {
          fill: #050505;
        }

        .on-base {
          fill: var(--led-color, #0f0);
        }

        .on-glow {
          fill: var(--led-color, #0f0);
          filter: blur(1.4px);
        }
      </style>

      <svg viewBox="0 0 16 8">
        <!-- outer frame -->
        <rect class="frame" x="0.5" y="0.5" width="15" height="7" rx="2" ry="2" />

        <!-- off layer -->
        <rect class="off" x="2" y="2" width="12" height="4" rx="1.5" ry="1.5" />

        <!-- on layer: base + glow, opacity controlled by value -->
        <g class="on-group">
          <rect class="on-base" x="2" y="2" width="12" height="4" rx="1.5" ry="1.5" />
          <!-- simple glow rectangle slightly larger -->
          <rect class="on-glow" x="1.5" y="1.5" width="13" height="5" rx="2" ry="2" />
        </g>
      </svg>
    `;

    this._onGroup = this.shadowRoot.querySelector('.on-group');
    this._svgRoot = this.shadowRoot.querySelector('svg');
  }

  connectedCallback() {
    this._upgradeProperty('value');
    this._upgradeProperty('color');

    if (!this.hasAttribute('value')) {
      this.value = 0;
    }
    if (this.hasAttribute('color')) {
      this._color = this.getAttribute('color');
    }

    this._applyColor();
    this._updateVisual();
  }

  // for properties set before definition
  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback(name, _old, value) {
    if (name === 'value') {
      const num = Number(value);
      this._value = Number.isFinite(num) ? num : 0;
      this._value = Math.max(0, Math.min(1, this._value));
      this._updateVisual();
    } else if (name === 'color') {
      this._color = value || '#0f0';
      this._applyColor();
    }
  }

  get value() {
    return this._value;
  }
  set value(v) {
    const num = Number(v);
    const clamped = Math.max(0, Math.min(1, Number.isFinite(num) ? num : 0));
    this.setAttribute('value', String(clamped));
  }

  get color() {
    return this._color;
  }
  set color(v) {
    this.setAttribute('color', v);
  }

  _applyColor() {
    if (!this._svgRoot) return;
    this._svgRoot.style.setProperty('--led-color', this._color);
  }

  _updateVisual() {
    if (!this._onGroup) return;
    // value 0..1 -> opacity 0..1
    const opacity = this._value;
    this._onGroup.setAttribute('opacity', opacity.toString());
  }
}

customElements.define('synth-led', SynthLED);

