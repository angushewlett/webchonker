// synth-button.js
class SynthButton extends HTMLElement {
  static get observedAttributes() {
    return ['label', 'disabled'];
  }

  constructor() {
    super();

    this._label = '';
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
          font-size: 12px;
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
          font-size: 11px;
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
        <svg viewBox="0 0 80 26" preserveAspectRatio="none">
          <!-- outer bevel -->
          <rect class="bg" x="0.5" y="0.5" width="79" height="25" rx="4" ry="4" />
          <!-- inner face -->
          <rect class="face" x="3" y="3" width="74" height="20" rx="3" ry="3" />
          <!-- center label -->
          <text class="label"
                x="50%" y="50%"
                dominant-baseline="middle"
                text-anchor="middle"></text>
        </svg>
      </div>
    `;

    this._root = this.shadowRoot.querySelector('.root');
    this._labelNode = this.shadowRoot.querySelector('.label');

    // Bind handlers
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerCancel = this._onPointerCancel.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('label');
    this._upgradeProperty('disabled');

    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'button');
    }

    // Default label from id if none explicitly set
    if (!this.hasAttribute('label') && this.id) {
      this.label = this.id;
    }

    this._syncLabel();
    this._syncDisabled();

    this._root.addEventListener('pointerdown', this._onPointerDown);
    this._root.addEventListener('keydown', this._onKeyDown);
    this._root.addEventListener('keyup', this._onKeyUp);
  }

  disconnectedCallback() {
    this._root.removeEventListener('pointerdown', this._onPointerDown);
    this._root.removeEventListener('keydown', this._onKeyDown);
    this._root.removeEventListener('keyup', this._onKeyUp);

    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
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

  _setPressed(p) {
    this._pressed = p;
    if (p) {
      this.setAttribute('data-pressed', 'true');
    } else {
      this.removeAttribute('data-pressed');
    }
  }

  _onPointerDown(e) {
    if (this._disabled) return;
    e.preventDefault();
    this._setPressed(true);
    this._pointerId = e.pointerId;

    try {
      this._root.setPointerCapture(e.pointerId);
    } catch (_) {}

    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerCancel);
  }

  _onPointerUp(e) {
    if (this._disabled) return;
    if (this._pointerId !== null && e.pointerId !== this._pointerId) return;

    this._finishPointer();
    // Fire events when button is released
    this._fireCommand();
  }

  _onPointerCancel(e) {
    if (this._pointerId !== null && e.pointerId !== this._pointerId) return;
    this._finishPointer();
  }

  _finishPointer() {
    this._setPressed(false);
    this._pointerId = null;
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerCancel);
  }

  _onKeyDown(e) {
    if (this._disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!this._pressed) {
        this._setPressed(true);
      }
    }
  }

  _onKeyUp(e) {
    if (this._disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (this._pressed) {
        this._setPressed(false);
        this._fireCommand();
      }
    }
  }

  _fireCommand() {
    // Native click for convenience
    this.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Custom 'command' event with label/id info
    this.dispatchEvent(new CustomEvent('command', {
      bubbles: true,
      detail: {
        id: this.id || null,
        label: this._label
      }
    }));
  }
}

customElements.define('synth-button', SynthButton);

