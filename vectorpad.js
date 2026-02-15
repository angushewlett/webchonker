class SynthVectorPad extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          touch-action: none;   /* allow custom drag */
          user-select: none;
        }

        svg {
          width: 100%;
          height: 100%;
        }

        .outer {
          fill: #111;
          stroke: #555;
          stroke-width: 2;
        }

        .inner {
          fill: #222;
          stroke: #777;
          stroke-width: 1.5;
        }
    
        .star {
             opacity: 0;
             transition: opacity 80ms ease;
           }    

        .handle {
          fill: var(--accent-color, #7cff7c);
          stroke: #000;
          stroke-width: 1;
          opacity: 0;           /* hidden by default */
          transition: opacity 80ms ease;
        }

        :host([dragging]) .handle {
          opacity: 1;
        }
    
        :host([dragging]) .star {
          opacity: 1;
        }
    
      </style>

      <svg viewBox="0 0 100 100">
        <!-- outer circle -->
        <circle class="outer" cx="50" cy="50" r="48" />
        <!-- inner circle -->
        <circle class="inner" cx="50" cy="50" r="15" />
    
        <!-- Eyecandy star (points are around origin; we translate it to centre) -->
        <g class="star" transform="translate(50 50) scale(0.25)">
          <polygon class="starPoly"></polygon>
        </g>
    
        <!-- handle (only shown while dragging) -->
        <circle class="handle" cx="50" cy="50" r="4" />
      </svg>
    `;

    this._svg    = this.shadowRoot.querySelector('svg');
    this._handle = this.shadowRoot.querySelector('.handle');
    this._starG   = this.shadowRoot.querySelector('.star');
    this._starPoly= this.shadowRoot.querySelector('.starPoly');
      // drag state
    this._dragging   = false;
    this._pointerId  = null;
    this._startX     = 0;   // clientX at pointerdown
    this._startY     = 0;   // clientY at pointerdown
    this._radiusPx   = 1;   // computed from bounding box
    this._normX      = 0;
    this._normY      = 0;

    // bind handlers
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
  }

  connectedCallback() {
    this._svg.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
  }

  disconnectedCallback() {
    this._svg.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
  }

  // current normalized drag value (relative to mouse-down), -1..1
  get x() { return this._normX; }
  get y() { return this._normY; }

  _onPointerDown(e) {
    e.preventDefault();

    if (this._dragging) return;

    this._dragging  = true;
    this._pointerId = e.pointerId;

    const rect = this._svg.getBoundingClientRect();
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._radiusPx = Math.min(rect.width, rect.height) / 2;

    this._normX = 0;
    this._normY = 0;
      // New star shape + colour each time
      this._regenStar();
      this._setStarScale(0.25);
      
    this._updateHandle(0, 0);
    this.setAttribute('dragging', '');

    this.dispatchEvent(new CustomEvent('vectorstart', {
      bubbles: true,
      detail: { x: 0, y: 0 }
    }));
  }
    

  _onPointerMove(e) {
    if (!this._dragging) return;
    if (e.pointerId !== this._pointerId) return;

    // delta from mouse-down, in screen pixels
    const dxPx = e.clientX - this._startX;
    const dyPx = e.clientY - this._startY;

    if (this._radiusPx <= 0) return;

    // normalised to [-1, 1], clamp
    let nx = dxPx / this._radiusPx;
    let ny = -dyPx / this._radiusPx; // y+ up (invert screen Y)

    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));

    this._normX = nx;
    this._normY = -ny;

    this._updateHandle(nx, -ny);
      
      // Scale star based on Euclidean drag magnitude
      const mag = Math.min(1, Math.hypot(nx, ny)) * 0.9;
      const scale = (mag <= 0.25) ? 0.25 : mag; // 0.25..1.0
      this._setStarScale(scale);

    this.dispatchEvent(new CustomEvent('vectormove', {
      bubbles: true,
      detail: { x: nx, y: ny }
    }));
  }

  _onPointerUp(e) {
    if (!this._dragging) return;
    if (e.pointerId !== this._pointerId) return;

    this._dragging  = false;
    this._pointerId = null;

    // reset to centre / zero
    this._normX = 0;
    this._normY = 0;
    this._updateHandle(0, 0);
    this._setStarScale(0.25);
    this.removeAttribute('dragging');

    this.dispatchEvent(new CustomEvent('vectorend', {
      bubbles: true,
      detail: { x: 0, y: 0 }
    }));
  }
    
    _setStarScale(scale) {
      // Star group is already translate(50 50), so we only adjust the scale()
      // Keep translate first so scaling occurs around centre.
      this._starG.setAttribute('transform', `translate(50 50) scale(${scale})`);
    }

    _regenStar() {
      // 7-point star => 14 vertices (outer/inner alternating)
      const points = [];
      const spikes = 7;

      // Base radii in viewBox units (since we scale the whole group)
      // Outer radius "feel" + a little randomness per point
      const outerBase = 44; // near outer circle (r=48), but leave margin
      const innerBase = 22;

      for (let i = 0; i < spikes * 2; i++) {
        const angle = (Math.PI * 2 * i) / (spikes * 2);

        const isOuter = (i % 2 === 0);
        const base = isOuter ? outerBase : innerBase;

        // Irregularity: per-point radial jitter
        const jitter = isOuter
          ? (0.75 + Math.random() * 0.5)   // 0.75..1.25
          : (0.75 + Math.random() * 0.6);  // 0.75..1.35

        const r = base * jitter;

        // Points around origin (0,0); group transform moves it to centre
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }

      this._starPoly.setAttribute('points', points.join(' '));

      // Randomise hue only
      const hue = Math.floor(Math.random() * 360);

      // Slightly translucent fill looks nice over dark panel
      this._starPoly.setAttribute('fill', `hsla(${hue}, 90%, 55%, 0.35)`);
      // Optional: subtle outline
      this._starPoly.setAttribute('stroke', `hsla(${hue}, 90%, 65%, 0.65)`);
      this._starPoly.setAttribute('stroke-width', '1');
    }

  _updateHandle(nx, ny) {
    
    let euc = Math.sqrt(nx*nx + ny*ny);
    let inv_euc = 1 / (euc + 0.001);
    inv_euc = Math.min(inv_euc, 1.0);
    // map [-1,1] to viewBox coords; keep inside outer circle
    const cx = 50 + nx * 45 * inv_euc;  // 40 = 80% of radius
    const cy = 50 + ny * 45 * inv_euc;
    this._handle.setAttribute('cx', cx.toString());
    this._handle.setAttribute('cy', cy.toString());
  }
}

customElements.define('pad-vector', SynthVectorPad);
