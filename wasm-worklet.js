
function asciiCStringFromWasm(ptr, memory) {
  const bytes = new Uint8Array(memory.buffer);
  let s = "";
  let i = ptr;
  while (bytes[i] !== 0) {
    s += String.fromCharCode(bytes[i++]);
  }
  return s;
}


class WasmToneProcessor extends AudioWorkletProcessor {
    
    allocCStringInWasm(str) {

      // 2. Allocate in WASM memory
      const ptr = this.malloc(str.length);

      // 3. Copy into WASM memory
      const mem = new Uint8Array(this.memory.buffer, ptr, str.length);
      mem.set(str);

      return ptr; // caller is responsible for free()
    }

    
  constructor(options) {
    super();

    this.ready = false;
    this.midiEvents = [];

    const bytes = options.processorOptions.wasmBytes;
    this.x = 0;

    // Receive messages from main thread
    this.port.onmessage = (event) => {
      const msg = event.data;
      if (msg.type === "midi") {
        this.midiEvents.push(msg);
      }
      if (msg.type === "param")
      {
          const ptr = this.allocCStringInWasm(msg.name);
          this.wasm_set_parameter(ptr, msg.value);
          this.free(ptr);
      }
      if (msg.type === "preset")
      {
            const result_ptr = this.wasm_load_preset(msg.index);
            const result_str = asciiCStringFromWasm(result_ptr, this.memory);
            this.port.postMessage({ type: "preset_name", result_str });
      }
    };


    console.log("Ready 1");
    this._initWasm(bytes);
    console.log("Ready 3");
  }
    

async _initWasm(bytes) {
  const importObject = {
    env: {
      // Emscripten sometimes expects these; harmless no-ops.
      abort: () => {},
        wasm_report_event: (eventId, value) => {
        const name = asciiCStringFromWasm(eventId, this.memory);
          this.port.postMessage({ type: "event", name, value });
        },
    },
    wasi_snapshot_preview1: {
      // No-op stubs to satisfy any WASI-style imports.
      fd_read: () => 0,
      fd_write: () => 0,
      fd_close: () => 0,
      fd_seek: () => 0,
      fd_fdstat_get: () => 0,
      fd_prestat_get: () => 0,
      fd_prestat_dir_name: () => 0,
      environ_get: () => 0,
      environ_sizes_get: () => 0,
      args_get: () => 0,
      args_sizes_get: () => 0,
      clock_res_get: () => 0,
      clock_time_get: () => 0,
      random_get: () => 0,
      proc_exit: () => {}
    }
  };
  console.log("Ready @1");

  try
  {
  try {
    const result = await WebAssembly.instantiate(bytes, importObject);
    this.instance = result.instance;
  }
  catch (e) {
        console.error("WASM assert / abort during init:", e);
  }

  const exports = this.instance.exports;

  this.audio_init        = exports.audio_init;
  this.audio_render      = exports.audio_render;
  this.process_midi      = exports.process_midi;
  this.get_audio_buffer  = exports.get_audio_buffer;
  this.__wasm_call_ctors = exports.__wasm_call_ctors;
  this.wasm_set_parameter = exports.wasm_set_parameter;
  this.wasm_load_preset = exports.wasm_load_preset;
  this.wasm_set_chunk =   exports.wasm_set_chunk;
  this.wasm_get_chunk =   exports.wasm_get_chunk;

  this.malloc = exports.malloc;
  this.free = exports.free;
      
  // memory is exported by the module
  this.memory = exports.memory;
  this.mem = new Float32Array(this.memory.buffer);

  this.bufferPtr = this.get_audio_buffer();
  console.log("Ready @2");

  try
  {
        this.__wasm_call_ctors();
	this.audio_init(sampleRate, this.freq, this.gain);
  }
  catch (e) {
	console.error("WASM assert / abort during init:", e);
  }
  this.ready = true;
  }
  catch (e) {
	console.error("WASM assert / abort during init:", e);
  }
  console.log("Ready @3");
}


  _handleMidiEvents() {
    // Very basic: process all queued events, keep last note on/off
    for (const msg of this.midiEvents) {
      const [status, d1, d2] = msg.data;
      const cmd = status & 0xf0;
      const ch  = status & 0x0f;
      this.process_midi(status,d1,d2);
    }

    this.midiEvents.length = 0; // clear queue
  }


  process(inputs, outputs) {
    this.x = this.x + 1;

    if (!this.ready) 
	{
        if (this.x % 1000 == 1) console.log("not ready.");
		return true;
	}

    // Apply MIDI events → update synth state
    this._handleMidiEvents();

    const output = outputs[0];
    const numChannels = output.length;
    const numFrames = output[0].length;

    this.audio_render(numFrames, numChannels);

    const base = this.bufferPtr >> 2;
    const buf = this.mem.subarray(base, base + numFrames * numChannels);

    // deinterleave
    for (let ch = 0; ch < numChannels; ch++) {
      const out = output[ch];
      for (let i = 0; i < numFrames; i++) {
        out[i] = buf[i * numChannels + ch];
      }
    }

    return true;
  }
}

registerProcessor('wasm-tone-processor', WasmToneProcessor);


