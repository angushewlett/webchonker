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
      </style>
      <svg></svg>
    `;

    this._svg = this.shadowRoot.querySelector('svg');

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
    // Clear SVG
    while (this._svg.firstChild) {
      this._svg.removeChild(this._svg.firstChild);
    }
    this._keyRects.clear();
    this._pressedNote = null;

    const numNotes = this._numKeys;
    const whiteKeyWidth = 14;
    const whiteKeyHeight = 80;
    const blackKeyWidth = whiteKeyWidth * 0.6;
    const blackKeyHeight = whiteKeyHeight * 0.6;

    // Note pattern (C-major scale, starting at C)
    // 0:C,1:C#,2:D,3:D#,4:E,5:F,6:F#,7:G,8:G#,9:A,10:A#,11:B
    const isBlack = [false, true, false, true, false, false, true, false, true, false, true, false];
    const whiteOffsetInOctave = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];

    // First pass: count white keys to know total width
    let whiteCount = 0;
    for (let i = 0; i < numNotes; i++) {
      const noteInOctave = i % 12;
      if (!isBlack[noteInOctave]) {
        whiteCount++;
      }
    }

    const totalWidth = whiteCount * whiteKeyWidth;
    const totalHeight = whiteKeyHeight;

    this._svg.setAttribute('viewBox', `0 0 ${totalWidth} ${totalHeight}`);

    // Second pass: compute positions for white keys
    const whitePositions = new Map(); // noteIndex -> x
    let whiteIndex = 0;

    for (let i = 0; i < numNotes; i++) {
      const noteInOctave = i % 12;
      if (!isBlack[noteInOctave]) {
        const x = whiteIndex * whiteKeyWidth;
        whitePositions.set(i, x);
        whiteIndex++;
      }
    }

    // Draw white keys first
    for (let i = 0; i < numNotes; i++) {
      const noteInOctave = i % 12;
      if (!isBlack[noteInOctave]) {
        const x = whitePositions.get(i);
        if (x == null) continue;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', whiteKeyWidth);
        rect.setAttribute('height', whiteKeyHeight);
        rect.setAttribute('fill', '#ffffff');
        rect.setAttribute('stroke', '#000000');
        rect.setAttribute('stroke-width', '0.5');

        rect.dataset.note = String(i);
       // rect.addEventListener('mousedown', (e) => this._onKeyMouseDown(e, i));

        this._svg.appendChild(rect);
        this._keyRects.set(i, { rect, isBlack: false, baseFill: '#ffffff' });
      }
    }

    // Draw black keys on top
    for (let i = 0; i < numNotes; i++) {
      const noteInOctave = i % 12;
      if (!isBlack[noteInOctave]) continue;

      // approximate x position based on white keys
      const octaveIndex = Math.floor(i / 12);
      const baseInOct = noteInOctave;

      // dx in white key units from start of this octave (tuned visually)
      let dxWhite;
      switch (baseInOct) {
        case 1:  dxWhite = 0.9; break; // C#
        case 3:  dxWhite = 1.9; break; // D#
        case 6:  dxWhite = 3.9; break; // F#
        case 8:  dxWhite = 4.9; break; // G#
        case 10: dxWhite = 5.9; break; // A#
        default: dxWhite = 0;   break;
      }

      // Where does this octave start in white keys?
      const octaveWhiteStart = octaveIndex * 7;
      const x = (octaveWhiteStart + dxWhite) * whiteKeyWidth;

      if (x < 0 || x > totalWidth) continue;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', x - blackKeyWidth / 2);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', blackKeyWidth);
      rect.setAttribute('height', blackKeyHeight);
      rect.setAttribute('fill', '#000000');
      rect.setAttribute('stroke', '#000000');
      rect.setAttribute('stroke-width', '0.5');

      rect.dataset.note = String(i);
      //rect.addEventListener('mousedown', (e) => this._onKeyMouseDown(e, i));

      this._svg.appendChild(rect);
      this._keyRects.set(i, { rect, isBlack: true, baseFill: '#000000' });
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
    
    _onPointerDown(e) {
      e.preventDefault();
      this._dragging = true;

      // Optional: capture pointer so moves still come to us even if cursor leaves the SVG
      try {
        this._svg.setPointerCapture(e.pointerId);
      } catch (_) {}

      this._updateNoteFromPointer(e);
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
      const hit = this.shadowRoot.elementFromPoint(e.clientX, e.clientY);

      if (!hit || !(hit instanceof SVGRectElement) || !hit.dataset || hit.dataset.note == null) {
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

      // This will release the previous note and fire noteon for the new one
      this._pressNote(noteIndex);
    }

  _pressNote(noteIndex) {
    if (this._pressedNote === noteIndex) return;

    // Release previous
    if (this._pressedNote != null) {
      this._releaseNote(this._pressedNote, true);
    }

    const info = this._keyRects.get(noteIndex);
    if (!info) return;

    this._pressedNote = noteIndex;

    // Simple highlight: darken/lighten
    if (info.isBlack) {
      info.rect.setAttribute('fill', '#333333');
    } else {
      info.rect.setAttribute('fill', '#ccccff');
    }

    this.dispatchEvent(
      new CustomEvent('noteon', {
        bubbles: true,
        detail: { note: noteIndex }
      })
    );
  }

  _releaseNote(noteIndex, sendEvent = true) {
    const info = this._keyRects.get(noteIndex);
    if (!info) return;

    // Restore fill
    info.rect.setAttribute('fill', info.baseFill);

    if (this._pressedNote === noteIndex) {
      this._pressedNote = null;
    }

    if (sendEvent) {
      this.dispatchEvent(
        new CustomEvent('noteoff', {
          bubbles: true,
          detail: { note: noteIndex }
        })
      );
    }
  }
}

customElements.define('piano-keyboard', PianoKeyboard);

