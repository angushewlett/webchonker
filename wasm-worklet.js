
function asciiCStringFromWasm(ptr, memory) {
  const bytes = new Uint8Array(memory.buffer);
  let s = "";
  let i = ptr;
  while (bytes[i] !== 0) {
    s += String.fromCharCode(bytes[i++]);
  }
  return s;
}

function utf8BytesFromWasm(ptr, memory) {
  const bytes = new Uint8Array(memory.buffer);
  let st_len = 0;
  let i = ptr;
  while (bytes[i] !== 0) { st_len++; i++; }

  let copyBytes = new Uint8Array(st_len + 1);
  i = ptr;
  let j = 0;
    
  while (bytes[i] !== 0) {
    copyBytes[j] = bytes[i];
    i++; j++;
  }
  copyBytes[st_len] = 0;
  return copyBytes;
}


function stringFromUTF8Array(data)
{
  const extraByteMap = [ 1, 1, 1, 1, 2, 2, 3, 0 ];
  var count = data.length;
  var str = "";
  
  for (var index = 0;index < count;)
  {
    var ch = data[index++];
    if (ch & 0x80)
    {
      var extra = extraByteMap[(ch >> 3) & 0x07];
      if (!(ch & 0x40) || !extra || ((index + extra) > count))
        return null;
      
      ch = ch & (0x3F >> extra);
      for (;extra > 0;extra -= 1)
      {
        var chx = data[index++];
        if ((chx & 0xC0) != 0x80)
          return null;
        
        ch = (ch << 6) | (chx & 0x3F);
      }
    }
    if (ch == 0x0) continue;
    
    str += String.fromCharCode(ch);
  }
  
  return str;
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
          const result_ptr = this.wasm_set_parameter(ptr, msg.value);
          const result_str = asciiCStringFromWasm(result_ptr, this.memory);
          let text = result_str;
          this.port.postMessage({ type: "param_value", text });
          this.free(ptr);
      }
      if (msg.type === "preset")
      {
            const result_ptr = this.wasm_load_preset(msg.index);
            const result_str = asciiCStringFromWasm(result_ptr, this.memory);
            this.port.postMessage({ type: "preset_name", result_str });
      }
      if (msg.type === "request_update")
      {
          this.wasm_request_update();
      }
        if (msg.type === "set_chunk")
        {
              const ptr = this.allocCStringInWasm(msg.chunk);
              const result_ptr = this.wasm_set_chunk(ptr, msg.chunk.length);
              const result_str = asciiCStringFromWasm(result_ptr, this.memory);
              this.port.postMessage({ type: "preset_name", result_str });
        }
        if (msg.type === "get_chunk")
        {
              const result_ptr = this.wasm_get_chunk();
              const result_str = asciiCStringFromWasm(result_ptr, this.memory);
              this.port.postMessage({ type: "chunk_data", chunk_data: result_str });
        }
        if (msg.type === "get_mod")
        {
              const result_ptr = this.wasm_get_mod();
              const result_str = stringFromUTF8Array(utf8BytesFromWasm(result_ptr, this.memory));
              this.port.postMessage({ type: "mod_data", mod_data: result_str });
        }
        if (msg.type === "get_float_preset")
        {
              const result_ptr = this.wasm_get_preset_normalized(msg.index);
              const result_str = stringFromUTF8Array(utf8BytesFromWasm(result_ptr, this.memory));
              this.port.postMessage({ type: "float_preset_data", float_preset_data: result_str });
        }
        
        if (msg.type === "set_float_preset")
        {
            const ptr = this.allocCStringInWasm(msg.float_preset);
              this.wasm_set_preset_normalized(ptr);
        }

        if (msg.type === "modulation")
        {
            if (msg.part == 2) // depth: value is float
            {
                this.wasm_set_modulation(2, msg.index, 0, msg.value);
            }
            else
            {
                const cvt = this.allocCStringInWasm(msg.value);
                this.wasm_set_modulation(msg.part, msg.index, cvt, 0);
            }
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
  this.wasm_get_mod =   exports.wasm_get_mod;
  this.wasm_request_update =   exports.wasm_request_update;
  this.wasm_set_modulation = exports.wasm_set_modulation;
  this.wasm_get_preset_normalized = exports.wasm_get_preset_normalized;
  this.wasm_set_preset_normalized = exports.wasm_set_preset_normalized;

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
    
  const result_ptr = this.wasm_load_preset(1);
  const result_str = asciiCStringFromWasm(result_ptr, this.memory);
  this.port.postMessage({ type: "preset_name", result_str });

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


