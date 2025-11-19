// Webchonker - main.js

let node = null;

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

  await initMidi();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  console.log("Audio started, let's go!");
}

async function initMidi()
{
let midiAccess = null; 
let midiInput = null;
    
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
      
  // Pick the first input for now
  //const inputs = Array.from(midiAccess.inputs.values());
  //if (!inputs.length) {
  //  console.warn("No MIDI inputs found.");
  //  return;
  //}
    
  //midiInput = inputs[0];  
  //console.log("Using MIDI input:", midiInput.name);
   /*
  midiInput.onmidimessage = (e) => {
      if (node)
      {
      node.port.postMessage({
        type: "midi", 
        data: Array.from(e.data), // [status, data1, data2]
        timestamp: e.timeStamp
      });
      }
  };*/
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

let currentPreset = 0;
let currentBank = 0;

async function onSelectBank(bank)
{
  currentBank = bank - 1;

      if (node)
      {
        let programNumber = (currentBank * 8 + currentPreset);
      node.port.postMessage({
        type: "midi", 
        data: [0xC0, programNumber, 0], // [status, data1, data2]
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
        type: "midi", 
        data: [0xC0, programNumber, 0], // [status, data1, data2]
        timestamp: 0
      });
      }  
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

