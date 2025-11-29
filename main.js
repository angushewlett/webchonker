// Webchonker - main.js

let node = null;
let activeParamName = "";
var label_text = "---";
let selected_tweak = 0;
let selected_osc_tweak = 0;
let selected_pfx_tweak = 0;

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
        
        if (key === 'synth-dropdown') {
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
        wrapper.appendChild(label);
    
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
    
    kb.style.left = "800px";
    kb.style.top  = "790px";
    kb.style.transform = "translate(-50%, -50%) scale(200%, 200%)";
    panel.appendChild(kb);
    
    kb.addEventListener('noteon', (e) => { noteOn(e.detail.note+24); });
    kb.addEventListener('noteoff', (e) => { noteOff(e.detail.note+24); });
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
    
    for (const [key, value] of Object.entries(data.tweaks)) {
        
        const parentDiv = document.createElement("div");
        parentDiv.style.position = "absolute";
        parentDiv.style.left = "10 px";
        parentDiv.style.top  = "600 px";
        parentDiv.style.display = "none";
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
            
            if (key === 'synth-dropdown') {
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
            wrapper.appendChild(label);
            
            parentDiv.appendChild(wrapper);
        }
        panel.appendChild(parentDiv);
    }
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
                          el.setAttribute('options', Object.values(jd)[0]);
                          el.setAttribute('value', el.options[Math.round(val)]);
                      }
                      
                      if (key === "Osc.Mode")
                      {
                          selected_osc_tweak = Math.round(val);
                          if (selected_tweak == 2)
                              onSelectTweak(selected_tweak, selected_osc_tweak);
                      }
                      if (key === "Xform.Mode")
                      {
                          selected_pfx_tweak = Math.round(val);
                          if (selected_tweak == 6)
                              onSelectTweak(selected_tweak, selected_pfx_tweak);
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

    };

  await initMidi();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
  onSelectPreset(2);
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


function onParameterChange(paramName, paramValue)
{
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
                    selected_osc_tweak = paramValueInt;
                    if (selected_tweak == 2)
                        onSelectTweak(selected_tweak, selected_osc_tweak);
                }
                if (paramName === "Xform.Mode")
                {
                    selected_pfx_tweak = paramValueInt;
                    if (selected_tweak == 6)
                        onSelectTweak(selected_tweak, selected_pfx_tweak);
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
     
    for (let[index0, tx] of tweak_divs.entries())
    {
        for (let[index1, ty] of tx.entries())
        {
            let el = document.getElementById(ty);
            if ((index0 == panel) && (index1 == subpanel))
                el.style.display = "flex";
            else
                el.style.display = "none";
        }
    }
    selected_tweak = panel;
    if (selected_tweak == 2)
        selected_osc_tweak = subpanel;
    if (selected_tweak == 6)
        selected_pfx_tweak = subpanel;
}

document.getElementById('start-audio-btn').addEventListener('click', () => { startAudio().catch(console.error); });
document.getElementById('bank.1').addEventListener('click', () => { onSelectBank(1); });
document.getElementById('bank.2').addEventListener('click', () => { onSelectBank(2); });
document.getElementById('bank.3').addEventListener('click', () => { onSelectBank(3); });
document.getElementById('bank.4').addEventListener('click', () => { onSelectBank(4); });
document.getElementById('bank.5').addEventListener('click', () => { onSelectBank(5); });
document.getElementById('bank.6').addEventListener('click', () => { onSelectBank(6); });
document.getElementById('bank.7').addEventListener('click', () => { onSelectBank(7); });
document.getElementById('bank.8').addEventListener('click', () => { onSelectBank(8); });
document.getElementById('preset.1').addEventListener('click', () => { onSelectPreset(1); });
document.getElementById('preset.2').addEventListener('click', () => { onSelectPreset(2); });
document.getElementById('preset.3').addEventListener('click', () => { onSelectPreset(3); });
document.getElementById('preset.4').addEventListener('click', () => { onSelectPreset(4); });
document.getElementById('preset.5').addEventListener('click', () => { onSelectPreset(5); });
document.getElementById('preset.6').addEventListener('click', () => { onSelectPreset(6); });
document.getElementById('preset.7').addEventListener('click', () => { onSelectPreset(7); });
document.getElementById('preset.8').addEventListener('click', () => { onSelectPreset(8); });

document.getElementById('nav.lfo').addEventListener('click', () => { onSelectTweak(0,0); });
document.getElementById('nav.trig').addEventListener('click', () => { onSelectTweak(1,0); });
document.getElementById('nav.vco').addEventListener('click', () => { onSelectTweak(2,selected_osc_tweak); });
document.getElementById('nav.sub').addEventListener('click', () => { onSelectTweak(3,0); });
document.getElementById('nav.noise').addEventListener('click', () => { onSelectTweak(4,0); });
document.getElementById('nav.filter').addEventListener('click', () => { onSelectTweak(5,0); });
document.getElementById('nav.pfx').addEventListener('click', () => { onSelectTweak(6,selected_pfx_tweak); });
document.getElementById('nav.vca').addEventListener('click', () => { onSelectTweak(7,0); });
document.getElementById('nav.env').addEventListener('click', () => { onSelectTweak(8,0); });
document.getElementById('nav.effects').addEventListener('click', () => { onSelectTweak(9,0); });


