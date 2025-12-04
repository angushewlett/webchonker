// WASM compilation:
// emcc XeSynth_Unity.cpp \
// -Os -Wl,--no-entry \
// -s STANDALONE_WASM=1 \
// -s EXPORTED_FUNCTIONS='["_audio_init","_audio_render","_get_audio_buffer", "_process_midi" ,"___wasm_call_ctors"]' -I ../.. -I../../Framework -I. -std=c++23 -DRELEASE -DWASM -DARCH_WASM -o tone.wasm -DGLOBAL_PREFIX_HEADER=\"XeSynth_buildvars.h\" -DEX_TARGET_TYPE_Static=1 -DXE_VMAJ=1  -DXE_VMIN=1  -DXE_VREV=1  -DXE_VBLD=1 -DARCH_WASM=1 -msimd128 -g -O3 -s INITIAL_HEAP=589824000

#if WASM

#include <stdint.h>
#include <stdio.h>

// Max frames per render quantum in AudioWorklet is typically 128.
#define MAX_FRAMES   128
#define MAX_CHANNELS 2

static float g_buffer[MAX_FRAMES * MAX_CHANNELS];


#ifdef __cplusplus
extern "C" {
#endif

// Scratch buffer
static char wasm_out_buf[1024];

// JS will implement this:
void wasm_report_event(const char* event_id, float value);

static XeSynth* wasmsynth = 0;

// Callback API for your plug-in
class WHost : public Pg::IHost
{
public:
    WHost() {};
    virtual void Automate(Pg::IHost::Action action, int32 index, float value)
    {
        if (action == Pg::IHost::Action::automationUpdate)     wasm_report_event(wasmsynth->AE(0)->GetParameterName(index), value); // calls back into JS

    };
    virtual void UpdateRect(int32 width, int32 height) {};
    virtual void UpdateParams()
    {
        wasm_report_event("Params.All", 0.f);
        for (int32 i = 0; i < wasmsynth->AE(0)->GetParameterCount(); i++)
        {
            const Sg::PtControlIn* port = wasmsynth->AE(0)->GetControlInPort(i);
            if (port && port->IsEnum())
            {
                // TODO: Use tinyJSON, this fugly.
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

static WHost* host = 0;
static VST::EventsStore* ev = 0;
static int ctr = 0;

extern "C" _Noreturn void __assert_fail (const char *, const char *, int, const char *)
{
    std::cout << "HALT";
    exit(1);
}

// Called once from JS to set the sample rate (AudioWorklet's `sampleRate`)
__attribute__((used))
void audio_init(double sampleRate, double freq, double gain)
{
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
}

// Returns pointer to the internal audio buffer in WASM memory
__attribute__((used))
float* get_audio_buffer(void)
{
    return g_buffer;
}

__attribute__((used))
void process_midi(unsigned int b0, unsigned int b1, unsigned int b2)
{
    ev->AddEvent((unsigned char)b0,(unsigned char)b1,(unsigned char)b2,0,0);
}


// Our "audio buffer callback":
// Fills g_buffer with `numFrames` frames of mono or stereo audio.
__attribute__((used))
void audio_render(int numFrames, int numChannels)
{
    if (numFrames > MAX_FRAMES) numFrames = MAX_FRAMES;
    if (numChannels < 1) numChannels = 1;
    if (numChannels > MAX_CHANNELS) numChannels = MAX_CHANNELS;
    
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
    
    // every 1280 samples, generate parameter outs
    if ((ctr % 10) == 1)
    {
        wasm_report_event("Lfo.Out", wasmsynth->AE(0)->GetParameterOutDisplay(11));
        wasm_report_event("Trig.Out", wasmsynth->AE(0)->GetParameterOutDisplay(3, true));
        wasm_report_event("Env.Out", wasmsynth->AE(0)->GetParameterOutDisplay(2, true));
    }
}


__attribute__((used)) const char* wasm_set_parameter(const char* param_id, float value)
{
    static char param_buffer[64];
    
    int32 pr_dx = wasmsynth->AE(0)->GetParameterIndexForName(param_id);
    if (pr_dx != -1)
    {
        const Sg::PtControlIn* port = wasmsynth->AE(0)->GetControlInPort(pr_dx);
        if (port && port->IsEnum())
        {
            float val01 = port->GetValue01FromValue(value);
            wasmsynth->GetModel().SetValue(Pg::Model::aspDsp, {{XeSynth::kScopeUnits, 0, XeSynth::kScopeUnitParams, pr_dx }}, val01);
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


__attribute__((used)) float wasm_get_parameter(const char* param_id)
{
    int32 pr_dx = wasmsynth->AE(0)->GetParameterIndexForName(param_id);
    if (pr_dx != -1)
        return wasmsynth->GetModel().GetValue(Pg::Model::aspGui, {{XeSynth::kScopeUnits, 0, XeSynth::kScopeUnitParams, pr_dx }});
    return 0.f;
}


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

__attribute__((used)) __attribute__((visibility("default"))) const char* wasm_get_chunk()
{
    static char chunk[16386];
    return chunk;
}

__attribute__((used)) __attribute__((visibility("default"))) const char* wasm_set_chunk(const char* chunk, int cb)
{
    static char preset_name[128];
    return preset_name;
}


#ifdef __cplusplus
}
#endif
#endif
