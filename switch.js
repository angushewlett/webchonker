// synth-switch-multi.js
class SynthSwitchMulti extends HTMLElement {
  static get observedAttributes() {
    return ['steps', 'value'];
  }

  constructor() {
    super();

    this._steps = 3;
    this._value = 0;

    // geometry in SVG units
    this._trackTop = 10;
    this._trackBottom = 44;
    this._trackHeight = this._trackBottom - this._trackTop;
    this._thumbHeight = 12;

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

        .panel {
          fill: none;
        }

        .slot {
          fill: #222;
          stroke: #555;
          stroke-width: 1;
          rx: 4;
          ry: 4;
        }

        .track {
          stroke: #00000044;
          stroke-width: 1;
          stroke-linecap: round;
        }

        .mark {
          stroke: #00000044;
          stroke-width: 1;
        }
    
        .thumb-shadow {
          fill: #00000066;
          stroke: #111;
          stroke-width: 0;
          rx: 5;
          ry: 5;
          transition: transform 120ms ease;
        }
    
        .thumb {
          fill: #ccc;
          stroke: #111;
          stroke-width: 1.5;
          rx: 5;
          ry: 5;
          transition: transform 120ms ease;
        }

        :host(:hover) .thumb {
          fill: var(--accent-color, #7cff7c);
        }
      </style>      
      <svg viewBox="0 0 30 50">
        <!-- background / panel -->
        <rect class="panel" x="0" y="0" width="30" height="50" />

        <!-- slot / recess -->
        <rect class="slot" x="8" y="6" width="14" height="42" rx="5" ry="5" />

        <!-- vertical track line -->
        <line class="track" x1="15" y1="10" x2="15" y2="44" />

        <!-- tick marks container -->
        <g class="marks"></g>

        <!-- thumb / handle -->
        <rect class="thumb-shadow" x="9" y="8"
              width="12" height="12" />
    
        <!-- thumb / handle -->
        <rect class="thumb" x="9" y="8"
              width="12" height="12" />
      </svg>
    `;

    this._svg = this.shadowRoot.querySelector('svg');
    this._thumb = this.shadowRoot.querySelector('.thumb');
    this._thumb_shadow = this.shadowRoot.querySelector('.thumb-shadow');
    this._marksGroup = this.shadowRoot.querySelector('.marks');

    this._onPointerDown = this._onPointerDown.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('steps');
    this._upgradeProperty('value');

    if (!this.hasAttribute('steps')) {
      this.steps = this._steps;
    }
    if (!this.hasAttribute('value')) {
      this.value = this._value;
    }

    this._renderMarks();
    this._updateThumb();

    this._svg.addEventListener('pointerdown', this._onPointerDown);
  }

  disconnectedCallback() {
    this._svg.removeEventListener('pointerdown', this._onPointerDown);
  }
/*
  // Handle pre-upgrade properties
  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }*/

    // Ensure properties set before definition are respected
    _upgradeProperty(prop) {
      if (this.hasOwnProperty(prop)) {
        const value = this[prop];
        delete this[prop];
        this[prop] = value;
      }
    }
    
  attributeChangedCallback(name, _old, value) {
    if (name === 'steps') {
      const n = Number(value);
      this._steps = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
      // clamp current value to new range
      if (this._value >= this._steps) {
        this._value = this._steps - 1;
        this.setAttribute('value', this._value);
      }
      this._renderMarks();
      this._updateThumb();
    } else if (name === 'value') {
      const n = Number(value);
      let idx = Number.isFinite(n) ? Math.floor(n) : 0;
      if (idx < 0) idx = 0;
      if (idx >= this._steps) idx = this._steps - 1;
      this._value = idx;
      this._updateThumb();
    }
  }

  // Public API
  get steps() {
    return this._steps;
  }
  set steps(v) {
    this.setAttribute('steps', String(v));
  }

  get value() {
    return this._value;
  }
  set value(v) {
    this.setAttribute('value', v);
  }

  // Geometry helpers
  _positionForIndex(index) {
    if (this._steps <= 1) {
      const center = this._trackTop + this._trackHeight / 2;
      return center - this._thumbHeight / 2;
    }
    const t = index / (this._steps - 1); // 0..1, top..bottom
    const travel = this._trackHeight - this._thumbHeight;
    const y = this._trackTop + t * travel;
    return y;
  }

  _renderMarks() {
    // Clear old marks
    while (this._marksGroup.firstChild) {
      this._marksGroup.removeChild(this._marksGroup.firstChild);
    }

    if (this._steps <= 1) return;

    for (let i = 0; i < this._steps; i++) {
      const t = (this._steps === 1) ? 0.5 : i / (this._steps - 1);
      const centerY = this._trackTop + t * this._trackHeight;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'mark');
      line.setAttribute('x1', '11');
      line.setAttribute('x2', '19');
      line.setAttribute('y1', centerY.toString());
      line.setAttribute('y2', centerY.toString());
      this._marksGroup.appendChild(line);
    }
  }

  _updateThumb() {
    if (!this._thumb) return;
    const y = this._positionForIndex(this._value);
    const y2 = this._positionForIndex(this._value) + 4;
    this._thumb.setAttribute('y', y.toString());
    this._thumb_shadow.setAttribute('y', y2.toString());
  }

  _increment() {
    const old = this._value;
    let next = old + 1;
    if (next >= this._steps) next = 0;

    if (next === old) return;

    this._value = next;
    this.setAttribute('value', String(next));
    this._updateThumb();

    this.dispatchEvent(new Event('input', { bubbles: true }));
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  _onPointerDown(e) {
    e.preventDefault();
    this._increment();
  }
}

customElements.define('synth-switch-multi', SynthSwitchMulti);


// customElements.define('synth-switch-multi-4', SynthSwitchMulti4);
