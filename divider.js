// svg-vert.js
class SynthDivider extends HTMLElement {
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
      </style>

      <div class="root" tabindex="0">
        <svg viewBox="0 0 5 314" preserveAspectRatio="none">
            <rect x="0" y="0" width="1" height="314" fill="white" fill-opacity="0.06"/>
            <rect x="2" y="0" width="1" height="314" fill="black" fill-opacity="0.85"/>
            <rect x="4" y="0" width="1" height="314" fill="white" fill-opacity="0.06"/>
        </svg>
      </div>
    `;

    this._root = this.shadowRoot.querySelector('.root');
  }
}

customElements.define('svg-vert', SynthDivider);
