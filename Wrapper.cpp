#include <stdint.h>
#include <stdio.h>

// Max frames per render quantum in AudioWorklet is typically 128.
#define MAX_FRAMES   128
#define MAX_CHANNELS 2

// Interleaved buffer: [L0, R0, L1, R1, ...]
static float g_buffer[MAX_FRAMES * MAX_CHANNELS];

/* WASM compilation:
 emcc XeSynth_Unity.cpp \
     -Os -O3 -Wl,--no-entry -msimd128\
     -s STANDALONE_WASM=1 \
     -s INITIAL_HEAP=589824000\
     -s EXPORTED_FUNCTIONS='[  "_audio_init",
                             "_audio_render",
                              "_get_audio_buffer",
                              "_process_midi",
                              "___wasm_call_ctors",
                              "_wasm_get_parameter",
                              "_wasm_set_parameter", "_wasm_load_preset", "_wasm_request_update",
                              "_malloc",
                              "_free"]'\
     -I ../.. -I../../Framework -I. -std=c++26\
     -DRELEASE -DNDEBUG -DWASM -DARCH_WASM=1 -DGLOBAL_PREFIX_HEADER=\"XeSynth_buildvars.h\" -DEX_TARGET_TYPE_Static=1 -DXE_VMAJ=1  -DXE_VMIN=1  -DXE_VREV=1  -DXE_VBLD=1\
     -Wno-c23-extensions -sERROR_ON_UNDEFINED_SYMBOLS=0 -o tone.wasm && cp tone.wasm ~/source/webchonker/tone.wasm
 */

#if WASM

#ifdef __cplusplus
extern "C" {
#endif

// Static persisten scratch buffer that we can use to share data back to the wasm host:
static char wasm_out_buf[1024];

// JS will implement this:
void wasm_report_event(const char* event_id, float value);


// Singleton.
static XeSynth* wasmsynth = 0;

// Host wrapper class: implements libPlug's IHost interface which our plug-in expects to be loaded by.
class WHost : public Pg::IHost
{
public:
    WHost() {};
    virtual void Automate(Pg::IHost::Action action, int32 index, float value)
    {
        // Calls back to JS with parameter name and value.
        if (action == Pg::IHost::Action::automationUpdate)     wasm_report_event(wasmsynth->AE(0)->GetParameterName(index), value);
    };
    
    // No support for GUI resizing.
    virtual void UpdateRect(int32 width, int32 height) {};
    
    // Send all parameter names, values and enums to JS
    virtual void UpdateParams()
    {
        wasm_report_event("Params.All", 0.f);
        for (int32 i = 0; i < wasmsynth->AE(0)->GetParameterCount(); i++)
        {
            const Sg::PtControlIn* port = wasmsynth->AE(0)->GetControlInPort(i);
            if (port && port->IsEnum())
            {
                std::string param_json = "{";
                param_json.append("\"");
                param_json.append(wasmsynth->AE(0)->GetParameterName(i));
                param_json.append("\": [");
                int32 ec = port->EnumCount();
                for (int32 j = 0; j < ec; j++)
                {
                    Sg::ValString v;
                    port->ConvertToText((float)j, v);
                    param_json.append("\"");
                    param_json.append(v.c_str());
                    param_json.append("\"");
                    if (j != ec-1)
                        param_json.append(",");
                }
                param_json.append("]}");
                memcpy(wasm_out_buf, param_json.c_str(), param_json.size()+1);
                wasm_report_event(wasm_out_buf, port->GetValueFromValue01(wasmsynth->AE(0)->GetParameter01(i)));
            }
            else
            {
                wasm_report_event(wasmsynth->AE(0)->GetParameterName(i), wasmsynth->AE(0)->GetParameter01(i));
            }
        }
    };
    
    virtual VST::TimeInfo* GetTimeInfo() { return &m_time; }
    virtual ProcessMode GetProcessMode() { return Pg::IHost::ProcessMode::processRealtime; }
    VST::TimeInfo m_time;
};

// Singleton for hosts and events
static WHost* host = 0;
static VST::EventsStore* ev = 0;

// Override C++' assert behaviour, seems to hang in WASM
extern "C" _Noreturn void __assert_fail (const char *, const char *, int, const char *)
{
    std::cout << "HALT";
    exit(1);
}

// Called once from JS to set the sample rate (AudioWorklet's `sampleRate`)
__attribute__((used)) void audio_init(double sampleRate, double freq, double gain)
{
    // printf("initing audio\n");
    Bs::Globals::Init(0,"Chonker","0.8.0.0");
    [[maybe_unused]] Pg::Factory* factory = Pg::Factory::GetGlobalFactory();
    static Pg::TFactory<SynthEngine::XeSynth> all_synth_factory("Chonker");
    all_synth_factory.Initialize();
    Pg::IWrap::SetFactory(&all_synth_factory);
    assert(Pg::IWrap::ms_pFactory);
    host = new WHost();
    ev = new VST::EventsStore();
    wasmsynth  = dynamic_cast<XeSynth*>(Pg::IWrap::ms_pFactory->CreatePluginInstance(host));
    wasmsynth->AudioInit(128, sampleRate);
    wasmsynth->AudioStart();
    // printf("inited audio\n");
}

// Returns pointer to the internal audio buffer in WASM memory
__attribute__((used)) float* get_audio_buffer(void)
{
    return g_buffer;
}

// Handle MIDI events by adding them to the store
__attribute__((used)) void process_midi(unsigned int b0, unsigned int b1, unsigned int b2)
{
    ev->AddEvent((unsigned char)b0,(unsigned char)b1,(unsigned char)b2,0,0);
}


// Our "audio buffer callback": Fills g_buffer with `numFrames` frames of mono or stereo audio.
__attribute__((used))
void audio_render(int numFrames, int numChannels)
{
    if (numFrames > MAX_FRAMES) numFrames = MAX_FRAMES;
    if (numChannels < 1) numChannels = 1;
    if (numChannels > MAX_CHANNELS) numChannels = MAX_CHANNELS;
    
    static int ctr = 0;
    ctr++;
    
    float left[MAX_FRAMES];
    float right[MAX_FRAMES];
    float* ins[2] = {left, right};
    float* outs[2] = {left, right};
    wasmsynth->AudioProcess(ins, outs, numFrames, ev, host->GetTimeInfo());
    ev->numEvents = 0;
    if (numChannels == 1)
    {
        for (int i = 0; i < numFrames; ++i)
            g_buffer[i] = left[i];
    }
    else
    {
        for (int i = 0; i < numFrames; ++i)
        {
            g_buffer[i*2] = left[i];
            g_buffer[i*2+1] = right[i];
        }
    }
    
    // every 1280 samples => 35fps ish, generate parameter outs
    if ((ctr % 10) == 1)
    {
        wasm_report_event("Lfo.Out", wasmsynth->AE(0)->GetParameterOutDisplay(11));
        wasm_report_event("Trig.Out", wasmsynth->AE(0)->GetParameterOutDisplay(3, true));
        wasm_report_event("Env.Out", wasmsynth->AE(0)->GetParameterOutDisplay(2, true));
    }
}


// Parameter handling. Bit clunky due to voice/unison settings living outside the usual parameter space
__attribute__((used)) const char* wasm_set_parameter(const char* param_id, float value)
{
    static char param_buffer[64];
    
   
    int32 pr_dx = wasmsynth->AE(0)->GetParameterIndexForName(param_id);
    
    bool isVoices = !strcmp(param_id, "Layer.Voices");
    bool isUnison = !strcmp(param_id, "Layer.Unison");
        
    if (pr_dx != -1)
    {
        const Sg::PtControlIn* port = wasmsynth->AE(0)->GetControlInPort(pr_dx);
        if (port && port->IsEnum())
        {
            float val01 = port->GetValue01FromValue(value);
            wasmsynth->GetModel().SetValue(Pg::Model::aspDsp, {{XeSynth::kScopeUnits, 0, XeSynth::kScopeUnitParams, pr_dx }}, val01);
            if (isVoices)
            {
                wasmsynth->GetModel().SetValue(Pg::Model::aspDsp, {{XeSynth::kScopeUnits, 0, XeSynth::kScopeUnitSettings, XeSynth::kSettingVoiceCountMode }}, value);
            }
            if (isUnison)
            {
                wasmsynth->GetModel().SetValue(Pg::Model::aspDsp, {{XeSynth::kScopeUnits, 0, XeSynth::kScopeUnitSettings, XeSynth::kSettingUnisonCountMode }}, value);
            }
            value = val01;
        }
        else
        {
            wasmsynth->GetModel().SetValue(Pg::Model::aspDsp, {{XeSynth::kScopeUnits, 0, XeSynth::kScopeUnitParams, pr_dx }}, value);
        }
        
        Sg::ParamData p = wasmsynth->GetParameterInfo(0, pr_dx);
        if (p.convertPort)
        {
            Sg::ValString buffer;
            p.convertPort->ConvertToText01(value, buffer);
            strcpy(param_buffer, buffer.data());
        }
    }
    return param_buffer;
}


// Get parameter
__attribute__((used)) float wasm_get_parameter(const char* param_id)
{
    int32 pr_dx = wasmsynth->AE(0)->GetParameterIndexForName(param_id);
    if (pr_dx != -1)
        return wasmsynth->GetModel().GetValue(Pg::Model::aspGui, {{XeSynth::kScopeUnits, 0, XeSynth::kScopeUnitParams, pr_dx }});
    return 0.f;
}


// Load a preset (from an index into our predefined preset table)
__attribute__((used)) const char* wasm_load_preset(int32 index)
{
    static char preset_name[128];
    
    int prog = std::max<int32>(0, std::min<int32>(index, 63));
    // 3. convert the JSON to a dictionary preset
    std::string tmp((char*)preset_data[prog].data(), preset_data[prog].size());
    wasmsynth->SerializeJSON(tmp, wasmsynth->m_dictPreset[0], false);
    
    // 2. convert the dictionary to a floating-point preset
    wasmsynth->LoadPresetFromDictPreset(wasmsynth->m_dictPreset[0], wasmsynth->m_preset[0]);
    wasmsynth->SyncToDSP();
    strcpy(preset_name, wasmsynth->m_dictPreset[0].m_name.c_str());
    return preset_name;
}

// Save state
__attribute__((used)) __attribute__((visibility("default"))) const char* wasm_get_chunk()
{
    static char chunk[16384];
    
    // if this is incomplete, our string rep is already right & we don't need to pull from the DSP's datamodel
    if (wasmsynth->m_flFlushToEngine == XeSynth::FlushState::Completed)
    {
        wasmsynth->CopyModelToPreset(0, wasmsynth->m_preset[0]);
        wasmsynth->SavePresetToDictPreset(wasmsynth->m_preset[0], wasmsynth->m_dictPreset[0]);
    }
    std::string cnk = "";
    wasmsynth->SerializeJSON(cnk, wasmsynth->m_dictPreset[0], true);
    strncpy(chunk, cnk.c_str(), std::min((int32)cnk.size(), (int32)16383));
    return chunk;
}

// Load state
__attribute__((used)) __attribute__((visibility("default"))) const char* wasm_set_chunk(const char* chunk, int cb)
{
    static char preset_name[128];
    
    std::string tmp(chunk);
    wasmsynth->SerializeJSON(tmp, wasmsynth->m_dictPreset[0], false);
    wasmsynth->LoadPresetFromDictPreset(wasmsynth->m_dictPreset[0], wasmsynth->m_preset[0]);
    wasmsynth->SyncToDSP();
    strcpy(preset_name, wasmsynth->m_dictPreset[0].m_name.c_str());
    return preset_name;
}

// host requests parameter sync
__attribute__((used)) __attribute__((visibility("default"))) void wasm_request_update()
{
    if (host)
        host->UpdateParams();
}

#ifdef __cplusplus
}
#endif

int main()
{
    // printf("WASM says hello world.\n");
    return 1;
}
