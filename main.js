// Webchonker - main.js

let node = null;
let activeParamName = "";
var label_text = "---";
let selected_tweak = 0;
let selected_subpanel_tweak = [0,0,0,0,0,0,0,0,0,0,0,0]; // 12 tweaks pages (only Osc and PFX have subpanels)
let pendingPatchResolve = null;
let pendingPatchReject = null;
let pendingModResolve = null;
let pendingModReject = null;

const tweak_divs =
[
        ["lfo-controls"],
        ["trig-controls"],
        ["osc-classic-controls",
         "osc-asymmetric-controls",
         "osc-sawpw-controls",
         "osc-hardsync-controls",
         "osc-vintage-dual-controls",
         "osc-emph-sweep-controls",
         "osc-modern-stack-controls",
         "osc-chords-controls"],
        ["sub-controls"],
        ["noise-controls"],
        ["filter-controls"],
        [
            "pfx-off-controls",
            "pfx-ring-controls",
            "pfx-phase-controls",
            "pfx-snh-controls",
            "pfx-comb-controls",
            "pfx-fold-controls",
            "pfx-delay-controls",
            "pfx-pan-controls",
            "pfx-body-controls",
            "pfx-warp-controls"
        ],
        ["amp-controls"],
        ["env-controls"],
        ["effects-controls"],
        ["voices-controls"],
        ["unison-controls"]
];

const button_ids =
[
    "nav.lfo",
    "nav.trig",
    "nav.vco",
    "nav.sub",
    "nav.noise",
    "nav.filter",
    "nav.pfx",
    "nav.vca",
    "nav.env",
    "nav.effects"
];


function requestPatchFromBackend() {
  // If you don’t want overlapping requests, you can guard here:
  if (pendingPatchResolve) {
    // Either reject the old one or just throw:
    pendingPatchReject?.(new Error('Patch request already pending'));
    pendingPatchResolve = null;
    pendingPatchReject = null;
  }

  return new Promise((resolve, reject) => {
    pendingPatchResolve = resolve;
    pendingPatchReject = reject;

    // Ask the worklet for patch data
    node.port.postMessage({ type: 'get_chunk' });

    // Optional timeout so we don’t wait forever
    const timeoutId = setTimeout(() => {
      if (pendingPatchResolve === resolve) {
        pendingPatchResolve = null;
        pendingPatchReject = null;
        reject(new Error('Timed out waiting for patch data'));
      }
    }, 5000);

    // We’ll clear timeout when we resolve below
    // (we’ll reference timeoutId via closure)
    const originalResolve = resolve;
    resolve = (value) => {
      clearTimeout(timeoutId);
      originalResolve(value);
    };
  });
}


function requestModFromBackend() {
  // If there's already a refresh queued, ignore.
  if (pendingModResolve) {
    return;
      /*
    // Either reject the old one or just throw:
    pendingModReject?.(new Error('Mod request already pending'));
    pendingModResolve = null;
    pendingModReject = null;
       */
  }

  return new Promise((resolve, reject) => {
    pendingModResolve = resolve;
    pendingModReject = reject;

    // Ask the worklet for Mod data
    node.port.postMessage({ type: 'get_mod' });

    // Optional timeout so we don’t wait forever
    const timeoutId = setTimeout(() => {
      if (pendingModResolve === resolve) {
        pendingModResolve = null;
        pendingModReject = null;
        reject(new Error('Timed out waiting for Mod data'));
      }
    }, 5000);

    // We’ll clear timeout when we resolve below
    // (we’ll reference timeoutId via closure)
    const originalResolve = resolve;
    resolve = (value) => {
      clearTimeout(timeoutId);
      originalResolve(value);
    };
  });
}


async function loadPanelLayout()
{
    const response = await fetch('./Panel.json');
    if (!response.ok) {
        console.error('Failed to load Panel.json', response.status);
        return;
    }
    
    const data = await response.json();
    const panel = document.getElementById('panel');
    
    const response2 = await fetch('./Parameters.json');
    const data2 = await response2.json();
    
    if (!data || !Array.isArray(data.controls))
    {
        console.error('Panel.json missing "controls" array');
        return;
    }
    
    const paramMap = data2.parameters;
    
    for (const ctrl of data.controls)
    {
        // Expect ctrl.tag like "synth-knob-large", "synth-slider", etc.
        const key = Object.keys(ctrl)[0];
        
        
        if (!key) {
            console.warn('Control without tag, skipping:', ctrl);
            continue;
        }
        const tag = Object.keys(ctrl)[0];
        const cfg = ctrl[tag]; // control config object
        
        // Create wrapper container
        const wrapper = document.createElement("div");
        wrapper.style.position = "absolute";
        
        if (key === 'synth-dropdown' || key === 'synth-dropdown-s' ) {
            wrapper.style.zIndex = '100'; // put dropdowns on top of other controls
        }
        else
        {
            wrapper.style.zIndex = '1'; // put dropdowns on top of other controls
        }
        
        // Get centre positions from "at"
        const [xStr, yStr] = cfg.at.split(',');
        const x = parseFloat(xStr) * 2;
        const y = parseFloat(yStr) * 2;
        
        wrapper.style.position = "absolute";
        wrapper.style.left = x + "px";
        wrapper.style.top  = y + "px";
        wrapper.style.transform = "translate(-50%, -50%) scale(200%, 200%)";
        
        // Let wrapper size to fit its children
        wrapper.style.display = "flex";
        wrapper.style.flexDirection = "column";
        wrapper.style.alignItems = "center";     // horizontally centre contents
        wrapper.style.pointerEvents = "none";    // wrapper passes events through to controls
        
        
        if (key === 'tiny-label')
        {
            const el = document.createElement(key);
            
            //if (el instanceof HTMLUnknownElement) continue;
            
            el.id = cfg.id;
            el.style.pointerEvents = 'auto';

            el.textContent = cfg.label;
            wrapper.appendChild(el);
        }
        else if (key === 'svg-label')
        {
            const NS = "http://www.w3.org/2000/svg";
            const svg = document.createElementNS(NS, "svg");
            
            const [xStr, yStr] = cfg.size.split(',');
            const w = parseFloat(xStr);
            const h = parseFloat(yStr);

            svg.id = cfg.id;
            // svg.setAttribute("viewBox", "0 0 " + w + " " + h);
            svg.setAttribute("width", w);
            svg.setAttribute("height", h);
            const use = document.createElementNS(NS, "use");
            use.setAttribute("href", cfg.use);
            svg.appendChild(use);
            wrapper.appendChild(svg);
        }
        else if (cfg.bind === undefined)
        {
            const el = document.createElement(key);
            
            //if (el instanceof HTMLUnknownElement) continue;
            
            el.id = cfg.id;
            el.style.pointerEvents = 'auto';

            
            el.addEventListener('input', () => { onParameterChange(el.id, el._value); } );
            
            // === LABEL ===
            const label = document.createElement("div");
            
            const labelText = paramMap[cfg.id];
            
            label.id = cfg.id + ".label";
            label.textContent = labelText || "";
            label.style.marginTop = "1px";
            label.style.fontSize = "6px";
            label.style.textAlign = "center";
            label.style.color = "#ddd";
            label.style.pointerEvents = "none";
            
            el.addEventListener('mouseDown', () => {
                label_text = label.textContent;
            } );
            el.addEventListener('mouseUp', () => {
                label.textContent = label_text;
            } );
            
            
            // Add control + label to wrapper
            wrapper.appendChild(el);
            // skip labels for buttons
            if (key === 'synth-button-switch' || key === 'synth-button-group' || key === 'synth-switch-multi'|| key === 'synth-button-power' || key === 'synth-label' )
            {
                el.label = labelText;
            }
            else
            {
                wrapper.appendChild(label);
            }
        }
        else
        {
            const el = document.createElement(key);
            
            //if (el instanceof HTMLUnknownElement) continue;
            
            el.id = cfg.id;
            el.style.pointerEvents = 'auto';

            if (cfg.bind === "bank")
                el.addEventListener('click', () => { onSelectBank(Number(cfg.index)); });
            if (cfg.bind === "preset")
                el.addEventListener('click', () => { onSelectPreset(Number(cfg.index)); });
            if (cfg.bind === "tweak")
                el.addEventListener('click', () => { onSelectTweak(cfg.index,selected_subpanel_tweak[cfg.index]); });
            
            el.label = cfg.label;
            wrapper.appendChild(el);
        }
        
        // Copy some common attributes if present in JSON
        const attrNames = ['min', 'max', 'value', 'step', 'param', 'law'];
        //for (const name of attrNames) {
        //  if (ctrl[name] !== undefined && ctrl[name] !== null) {
        //    el.setAttribute(name, String(ctrl[name]));
        //  }
        // }
        
        panel.appendChild(wrapper);
    }
    
    // Create wrapper container
    const kb = document.createElement("piano-keyboard");
    kb.style.position = "absolute";
    
    kb.style.left = "840px";
    kb.style.top  = "800px";
    kb.style.transform = "translate(-50%, -50%) scale(180%, 180%)";
    panel.appendChild(kb);
    
    kb.addEventListener('noteon', (e) => { noteOn(e.detail.note+24); });
    kb.addEventListener('noteoff', (e) => { noteOff(e.detail.note+24); });
    
    
    ///
    // Set up the LOAD button
    const fileInput = document.getElementById('patchFileInput');
    const loadButton = document.getElementById('LoadPatchButton');
    
    // When user clicks the button, open the file picker
    loadButton.addEventListener('command', () => { fileInput.click(); });
    
    // When user picks a file, read it as text and parse JSON
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = () => {
            const text = reader.result;
            const encoder = new TextEncoder();
            
            // UTF-8 encode with explicit null terminator
            const utf8 = encoder.encode(text);
            const utf8_text = new Uint8Array(utf8.length + 1);
            utf8_text.set(utf8);
            utf8_text[utf8.length] = 0; // null-terminate
            
            // Send the chunk
            node.port.postMessage({ type: "set_chunk", chunk: utf8_text});
            // Clear the input so picking the same file again still fires 'change'
            fileInput.value = '';
        };
        
        reader.onerror = () => {
            console.error('Error reading file:', reader.error);
            alert('Error reading file.');
        };
        
        reader.readAsText(file);
    });
    
    const saveButton = document.getElementById('SavePatchButton');
    
    saveButton.addEventListener('command', async () => {
        try {
            const patch = await requestPatchFromBackend();
            
            //        const json = JSON.stringify(patch, null, 2);
            
            const blob = new Blob([patch], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            
            // Use whatever extension you like: .json, .patch, .j4p, etc.
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `Download-${date}.chonker`;
            
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Could not save patch (no data / timeout).');
        }
    });
    
}


async function loadTweaksLayout()
{
    const response = await fetch('./Tweaks.json');
    if (!response.ok) {
        console.error('Failed to load Tweaks.json', response.status);
        return;
    }
    
    const data = await response.json();
    const panel = document.getElementById('panel');
    const response2 = await fetch('./Parameters.json');
    const data2 = await response2.json();

    
    if (!data)
    {
        console.error('Tweaks.json missing "tweaks" array');
        return;
    }
    
    const paramMap = data2.parameters;
    
    // Remove all the old BEFORE we add any new, so that document.getElementById() doesn't conflict
    for (const [key, value] of Object.entries(data.tweaks)) {
        
        let el = document.getElementById(key);
        if (el)
        {
            console.log("removing: ", key);
            el.remove();
        }
    }
    
    for (let [index, btid] of button_ids.entries()) {
        let el = document.getElementById(btid);
        if (el)
        {
            el.setAttribute('value', (selected_tweak == index) ? 1 : 0);
        }
    }

        
    for (const [key, value] of Object.entries(data.tweaks))
    {
        
        if (key != tweak_divs[selected_tweak][selected_subpanel_tweak[selected_tweak]]) continue;
        
        console.log("adding: ", key);

        const parentDiv = document.createElement("div");
        parentDiv.style.position = "absolute";
        parentDiv.style.left = "10px";
        parentDiv.style.top  = "500px";
        parentDiv.style.display = "flex";
        parentDiv.id = key;

        for (const ctrl of value)
        {
            // Expect ctrl.tag like "synth-knob-large", "synth-slider", etc.
            const key = Object.keys(ctrl)[0];
            
            
            if (!key) {
                console.warn('Control without tag, skipping:', ctrl);
                continue;
            }
            const tag = Object.keys(ctrl)[0];
            const cfg = ctrl[tag]; // control config object
            
            // Create wrapper container
            const wrapper = document.createElement("div");
            wrapper.style.position = "absolute";
            
            if (key === 'synth-dropdown' || key === 'synth-dropdown-s' ) {
                wrapper.style.zIndex = '100'; // put dropdowns on top of other controls
            }
            else
            {
                wrapper.style.zIndex = '1'; // put dropdowns on top of other controls
            }
            
            // Get centre positions from "at"
            const [xStr, yStr] = cfg.at.split(',');
            const x = parseFloat(xStr) * 2;
            const y = parseFloat(yStr) * 2;
            
            // WRAPPER - Let wrapper size to fit its children
            wrapper.style.position = "absolute";
            wrapper.style.left = x + "px";
            wrapper.style.top  = y + "px";
            wrapper.style.transform = "translate(-50%, -50%) scale(200%, 200%)";
            wrapper.style.display = "flex";
            wrapper.style.flexDirection = "column";
            wrapper.style.alignItems = "center";     // horizontally centre contents
            wrapper.style.pointerEvents = "none";    // wrapper passes events through to controls
            
            // ELEMENT
            const el = document.createElement(key);
            //if (el instanceof HTMLUnknownElement) continue;
            el.id = cfg.id;
            el.style.pointerEvents = 'auto';
            el.addEventListener('input', () => { onParameterChange(el.id, el._value); } );
            
            // === LABEL ===
            const label = document.createElement("div");
            const labelText = paramMap[cfg.id];
            label.id = cfg.id + ".label";
            label.textContent = labelText || "";
            label.style.marginTop = "1px";
            label.style.fontSize = "6px";
            label.style.textAlign = "center";
            label.style.color = "#ddd";
            label.style.pointerEvents = "none";
            
            el.addEventListener('mouseDown', () => {
                label_text = label.textContent;
            } );
            el.addEventListener('mouseUp', () => {
                label.textContent = label_text;
            } );
                        
            // Add control + label to wrapper
            wrapper.appendChild(el);
            
            // skip labels for buttons
            if (key === 'synth-button-switch' || key === 'synth-button-group' || key === 'synth-button-power'|| key === 'synth-switch-multi' || key === 'synth-button-power-l')
            {
                el.label = labelText;
            }
            else if ( key === 'synth-label')
            {
                el.label = cfg.text;
            }
            else
            {
                wrapper.appendChild(label);
            }
            
            parentDiv.appendChild(wrapper);
        }
        panel.appendChild(parentDiv);
    }
    if (node)
    {
        node.port.postMessage({
            type: "request_update",
            timestamp: 0
        });
    }
    console.log("done loading tweaks");
    loadModulation();
}


function onModChange(part, index, value)
{
    if (part == 2)
    {
        node.port.postMessage({
            type: "modulation",
            part: part,
            index: index,
            value: value,
            timestamp: 0
        });
    }
    else
    {
        const encoder = new TextEncoder();
        const utf8 = encoder.encode(value);
        const bytes = new Uint8Array(utf8.length + 1);
        bytes.set(utf8);
        bytes[utf8.length] = 0; // null-terminate
        node.port.postMessage({
            type: "modulation",
            part: part,
            index: index,
            value: bytes,
            timestamp: 0
        });
    }

    // reload modulation to ensure we show one empty slot
    if (part != 2) loadModulation();
    
}


async function loadModulation()
{
    if (pendingModResolve) return;
    // 1. Fetch list of (source, via, dest, amount) , sources, destinations from WASM
    const payload = await requestModFromBackend();
    const modulation = JSON.parse(payload); // contains "entries", "sources", "destinations" sub-objects.
    
    // 2. Remove the old mod matrix
    const old = document.getElementById('modMatrix');
    if (old) old.remove();
    
    // 3. Add a new one
    const modMatrix = document.createElement("div");
    modMatrix.style.position = "absolute";
    modMatrix.style.left = "850px";
    modMatrix.style.top  = "480px";
    modMatrix.style.width  = "800px";
    modMatrix.style.height  = "200px";
    modMatrix.style.display = "flex";
    modMatrix.style.overflow = "auto";
    modMatrix.id = "modMatrix";
    
    console.log("done prep mod");
    
    let didShow1Empty = false;

    
    // 4. Create individual entries (source, via, depth, destination)
    for (let index = 0; index < modulation.entries.length; index++) // of modulation.entries)
    {
        let mod = modulation.entries[index];
        console.log(index);
        
        const modRow = document.createElement("div");
        modRow.style.position = "absolute";
        modRow.style.display = "flex";
        modRow.style.top = (index * 40) + "px";
        modRow.style.left = "0px";
        modRow.style.alignItems = "center";     // horizontally centre contents

        modRow.id = "modRow" + index;
        modRow.style.transform = "translate(-50%, -50%) scale(200%, 200%)";
        
        if (((mod.src === "Unassigned") && (mod.via === "Unassigned"))
            ||   ((mod.src === "(none)") && (mod.via === "(none)")))
        {
            if (didShow1Empty == false)
            {
                didShow1Empty = true;
            }
            else
            {
                continue;
            }
        }

        const src_dd  = document.createElement("synth-dropdown-l");
        src_dd.style.zIndex = '100'; // put dropdowns on top of other controls
        src_dd.style.position = "absolute";
        src_dd.style.left = "50px";
        src_dd.style.top  = "10px";
        src_dd.style.display = "flex";
        src_dd.setAttribute('options', modulation.sources);
        src_dd.setAttribute('value', mod.src);
        src_dd.addEventListener('input', () => { onModChange(0, index, src_dd._value); } );
        modRow.appendChild(src_dd);
        
        const via_dd  = document.createElement("synth-dropdown-l");
        via_dd.style.zIndex = '100'; // put dropdowns on top of other controls
        via_dd.style.position = "absolute";
        via_dd.style.left = "150px";
        via_dd.style.top  = "10px";
        via_dd.style.display = "flex";
        via_dd.setAttribute('options', modulation.sources);
        via_dd.setAttribute('value', mod.via);
        via_dd.addEventListener('input', () => { onModChange(1, index, via_dd._value); } );
        modRow.appendChild(via_dd);
        
        const amt_kn  = document.createElement("synth-knob-small");
        amt_kn.style.zIndex = '100'; // put dropdowns on top of other controls
        amt_kn.style.position = "absolute";
        amt_kn.style.left = "245px";
        amt_kn.style.top  = "0px";
        amt_kn.style.display = "flex";
        amt_kn.setAttribute('value', mod.depth);
        amt_kn.addEventListener('input', () => { onModChange(2, index, amt_kn._value); } );
        amt_kn.setAttribute('min', -1);
        amt_kn.setAttribute('max', 1);
        modRow.appendChild(amt_kn);
        
        const dst_dd  = document.createElement("synth-dropdown-l");
        dst_dd.style.zIndex = '100'; // put dropdowns on top of other controls
        dst_dd.style.position = "absolute";
        dst_dd.style.left = "270px";
        dst_dd.style.top  = "10px";
        dst_dd.style.display = "flex";
        dst_dd.setAttribute('options', modulation.destinations);
        dst_dd.setAttribute('value', mod.dst);
        dst_dd.addEventListener('input', () => { onModChange(3, index, dst_dd._value); } );
        modRow.appendChild(dst_dd);
        
        modMatrix.appendChild(modRow);
    }
    
    // 5.  TODO: add an Empty modulation assignment
    
    // 6. Add the new panel to the main panel
    const panel = document.getElementById('panel');
    panel.appendChild(modMatrix);

    console.log("done loading modulation");
}


async function startAudio()
{
  const audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule('wasm-worklet.js');

  // Load WASM bytes here (main thread has fetch)
  const wasmResponse = await fetch("tone.wasm");
  const wasmBytes = await wasmResponse.arrayBuffer();

  node = new AudioWorkletNode(audioContext, 'wasm-tone-processor', {
    numberOfOutputs: 1,
    outputChannelCount: [2],
    processorOptions: {
      wasmBytes: wasmBytes,   // pass the bytes directly
      freq: 440.0,
      gain: 0.2
    }
  });

  node.connect(audioContext.destination);
    
    node.port.onmessage = (event) => {
      //console.log(event);
      const msg = event.data;
      if (msg.type === "event") {
          
          if (msg.name === "Params.All")
              loadModulation();
          
          // simple message: event Param.Name value
          let el = document.getElementById(msg.name);
          if (el)
          {
              const val = msg.value;
              el.setAttribute('value', val);
          }
          else
          {
              // dropdown menu with integer value
              try
              {
                  const val = msg.value;
                  const jd = JSON.parse(msg.name);
                  const key = Object.keys(jd)[0];
                  if (key)
                  {
                      let el = document.getElementById(key);
                      if (el)
                      {
                          if (Object.hasOwn(el,"_options"))
                          {
                              el.setAttribute('value', el.options[Math.round(val)]);
                              el.setAttribute('options', Object.values(jd)[0]);
                          }
                          else
                          {
                              el.setAttribute('value', val);
                          }
                      }
                      
                      let el1 = document.getElementById(key + ".1");
                      if (el1)
                      {
                          console.log("updating combo");
                          if (Object.hasOwn(el1,"_options"))
                          {
                              el1.setAttribute('options', Object.values(jd)[0]);
                              el1.setAttribute('value', el1.options[Math.round(val)]);
                              console.log("update with option: ", Math.round(val));
                          }
                          else
                          {
                              el1.setAttribute('value', val);
                              console.log("update with value: ", Math.round(val));
                          }
                      }
                      if (key === "Osc.Mode")
                      {
                          if (selected_tweak == 2)
                              onSelectTweak(selected_tweak, Math.round(val));
                          else
                              selected_subpanel_tweak[2] = Math.round(val);
                      }
                      if (key === "Xform.Mode")
                      {
                          if (selected_tweak == 6)
                              onSelectTweak(selected_tweak, Math.round(val));
                          else
                              selected_subpanel_tweak[6] = Math.round(val);
                      }
                  }
              }
              catch(error)
              {
                  
              }
          }
      }
    else if (msg.type === "preset_name")
    {
        let el = document.getElementById("preset.name");
        el.setAttribute('label', msg.result_str);
    }
    else if (msg.type === "param_value")
    {
        let label_id = activeParamName + ".label";
        let lab = document.getElementById(label_id);
        if (lab)
        {
            let el = document.getElementById(activeParamName);
            if (el)
            {
                if (el._dragging == true)
                    lab.textContent = msg.text;
            }
        }
    }
    else if (msg.type === "chunk_data")
    {
        if (pendingPatchResolve) {
          pendingPatchResolve(msg.chunk_data);  // payload = your patch JSON/state
          pendingPatchResolve = null;
          pendingPatchReject = null;
        }
    }
    else if (msg.type === "mod_data")
    {
        if (pendingModResolve) {
          pendingModResolve(msg.mod_data);  // payload = your patch JSON/state
          pendingModResolve = null;
          pendingModReject = null;
        }
    }
        

    };

  await initMidi();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  // Don't do this here - too early, audio engine loads async.
  // onSelectPreset(2);
  console.log("Audio started, let's go!");
}

let midiAccess = null; 
let currentInput = null;


async function initMidi()
{
    
  if (!navigator.requestMIDIAccess) {
    console.warn("Web MIDI API not supported in this browser.");
    return;
  }
    
  midiAccess = await navigator.requestMIDIAccess({ sysex: false });

  // Populate the dropdown once and whenever devices change
  midiAccess.onstatechange = () => {
    populateMidiInputs();
  };
  populateMidiInputs();

  // Change handler for the dropdown
  const select = document.getElementById("midi-input-select");
  select.addEventListener("change", () => {
    selectMidiInput(select.value);
  });  
      
}  


function populateMidiInputs() {
  const select = document.getElementById("midi-input-select");
  select.innerHTML = "";

  if (!midiAccess) {
    select.innerHTML = '<option value="">(MIDI not available)</option>';
    select.disabled = true;
    return;
  }

  const inputs = Array.from(midiAccess.inputs.values());

  if (inputs.length === 0) {
    select.innerHTML = '<option value="">(No MIDI inputs)</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;

  // Add an explicit "none" option
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.textContent = "(No input selected)";
  select.appendChild(noneOption);

  for (const input of inputs) {
    const opt = document.createElement("option");
    opt.value = input.id;
    opt.textContent = input.name || `Input ${input.id}`;
    select.appendChild(opt);
  }

  // If currentInput is gone, clear it
  if (currentInput && !midiAccess.inputs.has(currentInput.id)) {
    currentInput = null;
  }

  // Auto-select first real device if nothing chosen
  if (!currentInput && inputs.length > 0) {
    select.value = inputs[0].id;
    selectMidiInput(inputs[0].id);
  } else if (currentInput) {
    select.value = currentInput.id;
  } else {
    select.value = "";
  }
}


function selectMidiInput(inputId) {
  // Detach handler from previous input
  if (currentInput) {
    currentInput.onmidimessage = null;
    currentInput = null;
  }

  if (!inputId || !midiAccess) return;

  const input = midiAccess.inputs.get(inputId);
  if (!input) {
    console.warn("Selected MIDI input not found:", inputId);
    return;
  }

  currentInput = input;
  console.log("Using MIDI input:", currentInput.name);

  currentInput.onmidimessage = (e) => {
    if (!node) return; // audio not started yet

    // Forward raw MIDI bytes to the AudioWorklet
    node.port.postMessage({
      type: "midi",
      data: Array.from(e.data),  // e.g. [status, data1, data2]
      timestamp: e.timeStamp
    });
  };
}


function noteOn(note)
{
    if (node)
        node.port.postMessage({
          type: "midi",
          data: Array.from([0x90, note, 0x7F]),  // e.g. [status, data1, data2]
          timestamp: 0
        });
}

function noteOff(note)
{
    if (node)
        node.port.postMessage({
          type: "midi",
          data: Array.from([0x80, note, 0x00]),  // e.g. [status, data1, data2]
          timestamp: 0
        });
}


let currentPreset = 0;
let currentBank = 0;


async function onSelectPreset(preset)
{
  currentPreset = preset - 1;

        if (node)
      {
        let programNumber = (currentBank * 8 + currentPreset);
      node.port.postMessage({
          type: "preset",
          index: programNumber,
        timestamp: 0
      });
      }
}


async function onSelectBank(bank)
{
  currentBank = bank - 1;

      if (node)
      {
        let programNumber = (currentBank * 8 + currentPreset);
      node.port.postMessage({
        type: "preset",
        index: programNumber,
        timestamp: 0
      });
      }  
}



function onParameterChange(paramName, paramValue)
{
    if (paramName.endsWith(".1"))
    {
        paramName = paramName.substring(0, paramName.length - 2);
    }
    // console.log("Param: ", paramName, " ; value: ", paramValue);
    if (node)
    {
        const encoder = new TextEncoder();
        
        // 1. UTF-8 encode with explicit null terminator
        const utf8 = encoder.encode(paramName);
        const bytes = new Uint8Array(utf8.length + 1);
        bytes.set(utf8);
        bytes[utf8.length] = 0; // null-terminate

        activeParamName = paramName;

        if (typeof paramValue === 'string' )
        {
            let el = document.getElementById(paramName);
            if (el)
            {
                let opts = el.options;
                let paramValueInt = opts.indexOf(paramValue);
                node.port.postMessage({
                    type: "param",
                    name: bytes,
                    value: paramValueInt
                });
                if (paramName === "Osc.Mode")
                {
                    if (selected_tweak == 2)
                        onSelectTweak(selected_tweak, paramValueInt);
                }
                if (paramName === "Xform.Mode")
                {
                    if (selected_tweak == 6)
                        onSelectTweak(selected_tweak, paramValueInt);
                }
                if (paramName === "Filter.FilterMode")
                {
                    // force update to resync combo
                    if (node) node.port.postMessage({
                      type: "request_update",
                      timestamp: 0
                    });
                }
            }
        }
        else
        {
            node.port.postMessage({
                type: "param",
                name: bytes,
                value: paramValue
            });
        }
    }
}


function onSelectTweak(panel, subpanel)
{
    if ((panel == selected_tweak) && (subpanel == selected_subpanel_tweak[selected_tweak])) return;

    selected_tweak = panel;
    selected_subpanel_tweak[selected_tweak] = subpanel;
    loadTweaksLayout();
}

document.getElementById('start-audio-btn').addEventListener('click', () => {
    startAudio().catch(console.error);
    document.getElementById('start-audio-btn').remove();
});
