// synth-dropdown.js
class SynthDropdown extends HTMLElement {
  static get observedAttributes() {
    return ['options', 'value'];
  }

  constructor() {
    super();

    this._options = [];
    this._value = '';
    this._open = false;

    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: system-ui, sans-serif;
          font-size: 7px;
          color: #eee;
          box-sizing: border-box;
          background: rgba(34, 34, 34, 1.0);     /* <-- fully opaque */    
        }

        .root {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .display {
          position: relative;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          border-radius: 2px;
          border: 1px solid #555;
          background: #222;
          color: #eee;
          padding: 2px 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
    
        .display:hover {
          border-color: #888;
          background: #292929;
        }

        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
    
    .arrow {
      flex: 0 0 auto;           /* arrow stays fixed */
      margin-left: 6px;

      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 6px solid #ccc;
    }    

        .list {
          position: absolute;
          left: 0;
          top: 100%;
          margin-top: 2px;
          width: 100%;
          max-height: 160px;
          overflow-y: auto;
          box-sizing: border-box;
          border-radius: 4px;
          border: 1px solid #555;
          background: rgba(34, 34, 34, 1.0);     /* <-- fully opaque */    
          box-shadow: 0 4px 12px rgba(0,0,0,0.8);
          z-index: 999;
        }

        .list.hidden {
          display: none;
        }

        .item {
          padding: 4px 8px;
          cursor: pointer;
          white-space: nowrap;
        }

        .item:hover {
          background: #444;
        }

        .item.selected {
          background: #555;
        }
      </style>

      <div class="root">
        <div class="display">
          <div class="label"></div>
          <div class="arrow"></div>
        </div>
        <div class="list hidden"></div>
      </div>
    `;

    this._root = this.shadowRoot.querySelector('.root');
    this._display = this.shadowRoot.querySelector('.display');
    this._labelEl = this.shadowRoot.querySelector('.label');
    this._listEl = this.shadowRoot.querySelector('.list');

    this._onDisplayClick = this._onDisplayClick.bind(this);
    this._onDocPointerDown = this._onDocPointerDown.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('options');
    this._upgradeProperty('value');

    this._parseOptionsAttribute();
    this._syncLabel();

    this._display.addEventListener('pointerdown', this._onDisplayClick);
    document.addEventListener('pointerdown', this._onDocPointerDown);
  }

  disconnectedCallback() {
    this._display.removeEventListener('pointerdown', this._onDisplayClick);
    document.removeEventListener('pointerdown', this._onDocPointerDown);
  }

  // Ensure properties set before definition are respected
  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'options') {
      this._parseOptionsAttribute();
      this._ensureValueValid();
      this._syncLabel();
    } else if (name === 'value') {
      this._value = newVal || '';
      this._ensureValueValid();
      this._syncLabel();
    }
  }

  // Public API
  get options() {
    return this._options.slice();
  }
  set options(list) {
    if (Array.isArray(list)) {
      this._options = list.map(String);
      this._rebuildList();
      this._ensureValueValid();
      this._syncLabel();
    }
  }

  get value() {
    return this._value;
  }
  set value(v) {
    this.setAttribute('value', v);
  }

  // Parse "options" attribute: "A,B,C"
  _parseOptionsAttribute() {
    const attr = this.getAttribute('options');
    if (!attr) {
      this._options = [];
      this._rebuildList();
      return;
    }
    this._options = attr.split(',').map(s => s.trim()).filter(Boolean);
    this._rebuildList();
  }

  _ensureValueValid() {
    if (!this._options.length) {
      this._value = '';
      return;
    }
    if (!this._options.includes(this._value)) {
      // default to first option
      this._value = this._options[0];
      this.setAttribute('value', this._value);
    }
  }

  _syncLabel() {
    this._labelEl.textContent = this._value || '';
    // sync selection highlight
    const items = this._listEl.querySelectorAll('.item');
    items.forEach(el => {
      if (el.dataset.value === this._value) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  _rebuildList() {
    // clear
    while (this._listEl.firstChild) {
      this._listEl.removeChild(this._listEl.firstChild);
    }

    for (const opt of this._options) {
      const item = document.createElement('div');
      item.className = 'item';
      item.textContent = opt;
      item.dataset.value = opt;
      item.addEventListener('pointerdown', (e) => {
        // prevent the outer doc handler from thinking this is a click-outside
        e.stopPropagation();
        this._selectValue(opt);
        this._close();
      });
      this._listEl.appendChild(item);
    }
  }

  _selectValue(val) {
    if (val === this._value) return;
    this._value = val;
    this.setAttribute('value', val);
    this._syncLabel();
    this.dispatchEvent(new Event('input', { bubbles: true }));
  }

  _onDisplayClick(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this._open) {
      this._close();
    } else {
      this._openList();
    }
  }

  _openList() {
    if (this._open) return;
    this._open = true;
    this._listEl.classList.remove('hidden');
  }

  _close() {
    if (!this._open) return;
    this._open = false;
    this._listEl.classList.add('hidden');
  }

  _onDocPointerDown(e) {
    // Close when clicking outside the component
    if (!this._open) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this._close();
    }
  }
}

customElements.define('synth-dropdown', SynthDropdown);

