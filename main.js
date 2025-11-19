// main.js or your app's JS

let node = null;

async function startAudio() {
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

async function initMidi() {

let midiAccess = null; 
let midiInput = null;
    
  if (!navigator.requestMIDIAccess) {
    console.warn("Web MIDI API not supported in this browser.");
    return;
  }
    
  midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      
  // Pick the first input for now
  const inputs = Array.from(midiAccess.inputs.values());
  if (!inputs.length) {
    console.warn("No MIDI inputs found.");
    return;
  }
    
  midiInput = inputs[0];  
  console.log("Using MIDI input:", midiInput.name);
   
  midiInput.onmidimessage = (e) => {
    // Forward raw MIDI bytes to the worklet
//    if (audioNode) {
      node.port.postMessage({
        type: "midi", 
        data: Array.from(e.data), // [status, data1, data2]
        timestamp: e.timeStamp
      });
  //  }
  };
}  

document.getElementById('start-audio-btn').addEventListener('click', () => {


  startAudio().catch(console.error);
});

