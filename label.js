// synth-label.js
class SynthLabel extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'disabled'];
  }

  constructor() {
    super();

   // this._label = '';
    this._disabled = false;
    this._pressed = false;
    this._pointerId = null;

    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          touch-action: none;
          user-select: none;
          font-family: system-ui, sans-serif;
          font-size: 13px;
          color: #eee;
          outline: none;
        }

        .root {
          width: 100%;
          height: 100%;
        }

        svg {
          width: 100%;
          height: 100%;
          cursor: pointer;
        }

        :host([disabled]) svg {
          cursor: default;
          opacity: 0.4;
        }

        /* Base styles */
        .bg {
          fill: #333;
          stroke: #777;
          stroke-width: 1;
        }

        .face {
          fill: #262626;
        }

        .label {
          fill: #eee;
          font-family: inherit;
          font-size: 13px;
          pointer-events: none;
        }

        /* Pressed visual */
        :host([data-pressed="true"]) .bg {
          stroke: #aaa;
        }

        :host([data-pressed="true"]) .face {
          fill: #1a1a1a;
        }

        :host(:focus-visible) .bg {
          stroke: #d0d0d0;
        }
      </style>

      <div class="root" tabindex="0">
        <svg viewBox="0 0 320 26" preserveAspectRatio="none">
          <!--  -->
          <text class="label"
                x="50%" y="50%"
                dominant-baseline="middle"
                text-anchor="left"></text>
        </svg>
      </div>
    `;

    this._root = this.shadowRoot.querySelector('.root');
    this._labelNode = this.shadowRoot.querySelector('.label');

  }

  connectedCallback() {
    this._upgradeProperty('label');
    this._upgradeProperty('disabled');

    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'label');
    }

    // Default label from id if none explicitly set
    if (!this.hasAttribute('label') && this.id) {
      this.label = this.id;
    }

    this._syncLabel();
    this._syncDisabled();

  }

  disconnectedCallback() {
  }

  // Handle props set before upgrade
  _upgradeProperty(prop) {
    if (Object.prototype.hasOwnProperty.call(this, prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback(name, _oldVal, newVal) {
    if (name === 'label') {
      this._label = newVal || '';
      this._syncLabel();
    } else if (name === 'disabled') {
      this._disabled = newVal !== null;
      this._syncDisabled();
    }
  }

  // Public API
  get label() {
    return this._label;
  }
    
    set label(v) {
      this.setAttribute('label', v);
    }

  get disabled() {
    return this._disabled;
  }
  set disabled(v) {
    if (v) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  _syncLabel() {
    if (this._labelNode) {
      this._labelNode.textContent = this._label || '';
    }
  }

  _syncDisabled() {
    if (this._disabled) {
      this._root.setAttribute('tabindex', '-1');
      this.setAttribute('aria-disabled', 'true');
    } else {
      this._root.setAttribute('tabindex', '0');
      this.removeAttribute('aria-disabled');
    }
  }
}

customElements.define('synth-label', SynthLabel);
