// piano-keyboard.js
class PianoKeyboard extends HTMLElement {
  static get observedAttributes() {
    return ['keys'];
  }

  constructor() {
    super();

    this._numKeys = 61; // number of semitones, starting from C
    this._pressedNote = null;
    this._keyRects = new Map(); // noteIndex -> { rect, isBlack, baseFill }
    this._dragging = false;   //
      
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

      /* Optional press/highlight styling */
      g.white-key.pressed * {
        /* tweak to taste */
        fill: #ccd5ff;
      }
      g.black-key.pressed * {
        fill: #5555ff;
      }
    </style>

    <svg>
      <defs>
        <linearGradient id="paint0_linear_0_1" x1="1" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
        <stop stop-color="#6B6B6BFF"/>
        <stop offset="0.0288462" stop-color="#D9D9D9FF"/>
        <stop offset="0.899038" stop-color="#D9D9D9FF"/>
        <stop offset="1.0" stop-color="#D9D9D9FF"/>
        </linearGradient>
    
    <linearGradient id="paint0_linear_0_2" x1="1" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop stop-color="#424040"/>
    <stop offset="0.0432692"/>
    <stop offset="0.620192" stop-color="#0F0F0F"/>
    <stop offset="0.677885" stop-color="#1F1E1E"/>
    <stop offset="0.956731" stop-color="#2E2E2E"/>
    <stop offset="1.0" stop-color="#505050"/>
    </linearGradient>
    
    
        <!-- White key template: paste Figma white-key group contents here -->
        <g id="white-key-template" class="white-key">
          <!-- Example placeholder; replace with your Figma export -->
    <rect width="13" height="80" fill="#939393"/>
    <rect x="1" y="1" width="12" height="78" rx="2" fill="#00000000" stroke="black" stroke-opacity="0.44" stroke-width="3"/>
    <rect width="13" height="80" rx="2" fill="url(#paint0_linear_0_1)"/>    
        </g>
        <!-- Black key template: paste Figma black-key group contents here -->
        <g id="black-key-template" class="black-key">
    <rect width="8" height="48" rx="1" fill="#2C2C2C"/>
    <rect width="8" height="48" rx="2" fill="url(#paint0_linear_0_2)"/>
        </g>
    
      </defs>

    </svg>
    `;

    this._svg = this.shadowRoot.querySelector('svg');
    this._whiteTemplate = this._svg.getElementById('white-key-template');
    this._blackTemplate = this._svg.getElementById('black-key-template');

    //this._onMouseUp = this._onMouseUp.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp   = this._onPointerUp.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('keys');
    this._render();
      this._svg.addEventListener('pointerdown', this._onPointerDown);
      window.addEventListener('pointerup', this._onPointerUp);
      window.addEventListener('pointermove', this._onPointerMove);
    //window.addEventListener('mouseup', this._onMouseUp);
    //window.addEventListener('mousemove', this._onMouseMove);
  }

  disconnectedCallback() {
      this._svg.removeEventListener('pointerdown', this._onPointerDown);
      window.removeEventListener('pointerup', this._onPointerUp);
      window.removeEventListener('pointermove', this._onPointerMove);
    //window.removeEventListener('mouseup', this._onMouseUp);
    //window.removeEventListener('mousemove', this._onMouseMove);
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
    if (name === 'keys') {
      const n = Number(newVal);
      if (!Number.isNaN(n) && n > 0) {
        this._numKeys = n;
        this._render();
      }
    }
  }

  get keys() {
    return this._numKeys;
  }
  set keys(v) {
    this.setAttribute('keys', String(v));
  }

    _render() {
      // clear old keys
      this._keyRects.clear();
      // this._pressedNote = null;
    
        // remove all children except <defs>
        Array.from(this._svg.children).forEach(child => {
          if (child.tagName !== 'defs') {
            this._svg.removeChild(child);
          }
        });
      const numNotes = this._numKeys;
      const whiteKeyWidth = 14;    // logical spacing; independent of Figma design width
      const whiteKeyHeight = 80;

      const blackKeyWidth = whiteKeyWidth * 0.6;
      const blackKeyHeight = whiteKeyHeight * 0.6;

      const isBlack = [false, true, false, true, false, false, true, false, true, false, true, false];

      // count whites for viewBox width
      let whiteCount = 0;
      for (let i = 0; i < numNotes; i++) {
        if (!isBlack[i % 12]) whiteCount++;
      }

      const totalWidth = whiteCount * whiteKeyWidth;
      const totalHeight = whiteKeyHeight;

      this._svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

      // re-add defs (we removed everything earlier)
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.appendChild(this._whiteTemplate.cloneNode(true));
      defs.appendChild(this._blackTemplate.cloneNode(true));
      this._svg.appendChild(defs);

      // recapture template refs from new defs
      this._whiteTemplate = defs.querySelector('#white-key-template');
      this._blackTemplate = defs.querySelector('#black-key-template');

      // 1) positions of white keys
      const whitePositions = new Map();
      let whiteIndex = 0;

      for (let i = 0; i < numNotes; i++) {
        const noteInOct = i % 12;
        if (!isBlack[noteInOct]) {
          const x = whiteIndex * whiteKeyWidth;
          whitePositions.set(i, x);
          whiteIndex++;
        }
      }

      // 2) instantiate white key groups
      for (let i = 0; i < numNotes; i++) {
        const noteInOct = i % 12;
        if (!isBlack[noteInOct]) {
          const x = whitePositions.get(i);
          if (x == null) continue;

          const g = this._whiteTemplate.cloneNode(true);
          g.removeAttribute('id');            // avoid duplicate IDs
          g.dataset.note = String(i);
          g.classList.add('white-key');
          g.setAttribute('transform', `translate(${x}, 0)`);

          // pointer events on group for note press
          g.addEventListener('pointerdown', (e) => this._onPointerDownKey(e, i));

          this._svg.appendChild(g);
          this._keyRects.set(i, { group: g, isBlack: false });
        }
      }

      // 3) instantiate black key groups (like before, but using template)
      for (let i = 0; i < numNotes; i++) {
        const noteInOct = i % 12;
        if (!isBlack[noteInOct]) continue;

        const octaveIndex = Math.floor(i / 12);
        let dxWhite;
        switch (noteInOct) {
          case 1:  dxWhite = 0.7; break;
          case 3:  dxWhite = 1.7; break;
          case 6:  dxWhite = 3.7; break;
          case 8:  dxWhite = 4.7; break;
          case 10: dxWhite = 5.7; break;
          default: dxWhite = 0;   break;
        }
        const octaveWhiteStart = octaveIndex * 7;
        const x = (octaveWhiteStart + dxWhite) * whiteKeyWidth + 3;

        if (x < 0 || x > totalWidth) continue;

        const g = this._blackTemplate.cloneNode(true);
        g.removeAttribute('id');
        g.dataset.note = String(i);
        g.classList.add('black-key');
        g.setAttribute('transform', `translate(${x - blackKeyWidth / 2}, 0)`);

        g.addEventListener('pointerdown', (e) => this._onPointerDownKey(e, i));

        this._svg.appendChild(g);
        this._keyRects.set(i, { group: g, isBlack: true });
      }
    }

  _onKeyMouseDown(e, noteIndex) {
    e.preventDefault();
    this._pressNote(noteIndex);
    this.dragging = true;
  }

  _onMouseUp(e) {
    if (this._pressedNote != null) {
      const note = this._pressedNote;
      this._releaseNote(note);
    }
    this.dragging = false;
  }
    
    _onMouseMove(e) {
      if (!this._dragging) return;

      // Find what’s under the cursor in the *page*, not just inside the shadow root
      // Hit-test inside the shadow DOM, not the outer document
      const hit = this.shadowRoot.elementFromPoint(e.clientX, e.clientY);
        
      // If we’re not over an SVG rect with a data-note, release current and bail
      if (!(hit instanceof SVGRectElement) || !hit.dataset || hit.dataset.note == null) {
        if (this._pressedNote != null) {
          this._releaseNote(this._pressedNote);
        }
        return;
      }

      const noteIndex = Number(hit.dataset.note);
      if (Number.isNaN(noteIndex)) return;

      // If we’re still on the same note, do nothing
      if (this._pressedNote === noteIndex) return;

      // Press the new note (this will release any previous one)
      this._pressNote(noteIndex);
    }
    
    _onPointerDownKey(e, noteIndex) {
      e.preventDefault();
      this._dragging = true;
      try {
        this._svg.setPointerCapture(e.pointerId);
      } catch (_) {}
      this._updateNoteFromPointer(e); // for gliss logic
      this._pressNote(noteIndex);
    }
    
    _onPointerDown(e) {
      e.preventDefault();
      this._dragging = true;

      // Optional: capture pointer so moves still come to us even if cursor leaves the SVG
      try {
        this._svg.setPointerCapture(e.pointerId);
      } catch (_) {}

      //this._updateNoteFromPointer(e);
    }

    _onPointerMove(e) {
      if (!this._dragging) return;
      this._updateNoteFromPointer(e);
    }

    _onPointerUp(e) {
      if (!this._dragging) return;
      this._dragging = false;

      try {
        this._svg.releasePointerCapture(e.pointerId);
      } catch (_) {}

      if (this._pressedNote != null) {
        this._releaseNote(this._pressedNote);
      }
    }
    
    _updateNoteFromPointer(e) {
      // Hit-test inside the shadow DOM
      let hit = this.shadowRoot.elementFromPoint(e.clientX, e.clientY);

      // Walk up the DOM tree until we find something with data-note
      while (hit && hit !== this._svg && (!hit.dataset || hit.dataset.note == null)) {
        hit = hit.parentNode;
      }

      if (!hit || hit === this._svg || !hit.dataset || hit.dataset.note == null) {
        // Pointer is not over any key: release current note
        if (this._pressedNote != null) {
          this._releaseNote(this._pressedNote);
        }
        return;
      }

      const noteIndex = Number(hit.dataset.note);
      if (Number.isNaN(noteIndex)) return;

      if (this._pressedNote === noteIndex) {
        // Still on the same key, nothing to do
        return;
      }

      this._pressNote(noteIndex);
    }
     /*
    _updateNoteFromPointer(e) {
      let hit = this.shadowRoot.elementFromPoint(e.clientX, e.clientY);

      // climb to the <g data-note="...">
      while (hit && hit !== this._svg && (!hit.dataset || hit.dataset.note == null)) {
        hit = hit.parentNode;
      }

      if (!hit || hit === this._svg || !hit.dataset || hit.dataset.note == null) {
        if (this._pressedNote != null) {
          this._releaseNote(this._pressedNote);
        }
        return;
      }

      const noteIndex = Number(hit.dataset.note);
      if (Number.isNaN(noteIndex)) return;
      if (this._pressedNote === noteIndex) return;

      this._pressNote(noteIndex);
    }
*/

    _pressNote(noteIndex) {
      if (this._pressedNote === noteIndex) return;

      if (this._pressedNote != null) {
        this._releaseNote(this._pressedNote, true);
      }

      const info = this._keyRects.get(noteIndex);
      if (!info) return;

      this._pressedNote = noteIndex;
      info.group.classList.add('pressed');

      this.dispatchEvent(new CustomEvent('noteon', {
        bubbles: true,
        detail: { note: noteIndex }
      }));
    }

    _releaseNote(noteIndex, sendEvent = true) {
      const info = this._keyRects.get(noteIndex);
      if (!info) return;

      info.group.classList.remove('pressed');

      if (this._pressedNote === noteIndex) {
        this._pressedNote = null;
      }

      if (sendEvent) {
        this.dispatchEvent(new CustomEvent('noteoff', {
          bubbles: true,
          detail: { note: noteIndex }
        }));
      }
    }

}

customElements.define('piano-keyboard', PianoKeyboard);

