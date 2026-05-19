import { useState, useEffect, useCallback } from "react";
import {
  Activity, Plus, Search, RefreshCw, Trash2, Save, ArrowLeft,
  AlertCircle, Loader2, ChevronDown, X, Download, Upload,
  FolderOpen, Cpu, Wifi, Radio, Settings2, BarChart2,
  Calendar, MapPin, Zap, CheckCircle2, Clock, AlertTriangle,
  Table2, FileText, Wrench, Database, Plus as PlusIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_CATEGORIES = [
  "Flowmeter", "Level Transmitter", "Pressure Transmitter",
  "Temperature Sensor", "pH Analyser", "DO Analyser",
  "Turbidity Analyser", "Conductivity Analyser", "Multi-Parameter Analyser",
  "VFD / Drive", "Valve Actuator", "Pump Controller",
  "Relay / Digital Output", "Sensor", "Other",
];

const PROCESS_VARIABLES = [
  "Flow", "Level", "Pressure", "Temperature", "pH", "Dissolved Oxygen",
  "Turbidity", "Conductivity", "TDS", "ORP", "Chlorine", "COD", "BOD",
  "TSS", "Speed / Frequency", "Current", "Voltage", "Power", "Position", "Other",
];

const COMM_TYPES = [
  "4-20mA", "RS485 / Modbus RTU", "Modbus TCP/IP", "TCP/IP (Generic)",
  "HART", "Profibus DP", "Pulse / Frequency", "Relay / Digital",
  "Wireless HART", "CANopen", "OPC-UA", "Other",
];

const BAUD_RATES  = ["1200","2400","4800","9600","19200","38400","57600","115200"];
const PARITIES    = ["None","Even","Odd"];
const DATA_BITS   = ["7","8"];
const STOP_BITS   = ["1","2"];
const FUNC_CODES  = ["FC01 – Read Coils","FC02 – Read Discrete Inputs","FC03 – Read Holding Registers","FC04 – Read Input Registers","FC06 – Write Single Register","FC16 – Write Multiple Registers"];
const BYTE_ORDERS = ["Big Endian (ABCD)","Little Endian (DCBA)","Byte Swap (BADC)","Word Swap (CDAB)"];
const POWER_SUPPLIES   = ["24VDC (Loop)","24VDC (External)","230VAC","110VAC","48VDC","12VDC","Battery","Other"];
const ENCLOSURES  = ["IP20","IP54","IP65","IP67","IP68","NEMA 4","NEMA 4X","NEMA 6","Explosion Proof (Ex d)","Intrinsically Safe (Ex i)","Other"];
const CAL_INTERVALS = ["Monthly","Quarterly","Half-Yearly","Annually","2 Years","3 Years","As Required"];
const STATUSES    = ["Active","Fault","Under Maintenance","Decommissioned","Spare"];
const FAIL_MODES  = ["3.6 mA (Low)","22 mA (High)","Hold Last Value","User Defined"];
const CONTROL_MODES = ["V/f (Scalar)","Sensorless Vector","Closed Loop Vector (Encoder)","DTC (Direct Torque Control)","Other"];
const SPEED_REF_SOURCES = ["Analog Input (4-20mA)","Analog Input (0-10V)","Fixed Speed (Presets)","Fieldbus (Modbus)","Keypad / Panel","PLC Digital I/O","Other"];
const FLOW_PRINCIPLES = ["Electromagnetic","Ultrasonic (Clamp-On)","Ultrasonic (Inline)","Vortex","Coriolis","Turbine","Oval Gear","Paddlewheel","Differential Pressure","Open Channel","Other"];
const SIGNAL_OUTPUTS  = ["4-20mA","0-10V","Pulse","RS485","Modbus RTU","Modbus TCP","HART","Profibus","Other"];

type Status = "Active"|"Fault"|"Under Maintenance"|"Decommissioned"|"Spare";
type CommType = typeof COMM_TYPES[number];

interface CommConfig {
  // 4-20mA
  signal_min?: string; signal_max?: string; measured_min?: string; measured_max?: string; fail_mode?: string;
  // RS485 / Modbus RTU
  baud_rate?: string; data_bits?: string; parity?: string; stop_bits?: string;
  modbus_address?: string; modbus_function?: string; register_address?: string; register_count?: string; byte_order?: string;
  // Modbus TCP / TCP/IP
  ip_address?: string; port?: string; unit_id?: string; subnet?: string; gateway?: string; tcp_protocol?: string;
  // HART
  hart_address?: string; hart_revision?: string;
  // Profibus
  profibus_address?: string; profibus_baud?: string;
  // Pulse
  pulse_factor?: string; pulse_unit?: string; max_freq?: string; logic_type?: string;
  // Relay
  contact_type?: string; rated_voltage?: string; rated_current?: string;
  // Wireless
  wireless_channel?: string; node_id?: string; network_id?: string;
  // Generic extras
  notes?: string;
}

interface Channel {
  ch_no: number; parameter: string; sensor_make?: string; sensor_model?: string;
  range_min?: string; range_max?: string; unit?: string;
  zero_point?: string; span?: string;
  alarm_low?: string; alarm_high?: string; alarm_hh?: string; alarm_ll?: string;
  signal?: string; notes?: string;
}

interface VfdParam {
  param_no: string; param_name: string; value: string; unit?: string; notes?: string;
}

interface ParamBackup {
  param_no: string; param_name: string; value: string; default_value?: string; unit?: string; notes?: string;
}

interface FieldDevice {
  id: number;
  device_no?: string; project_number?: string; project_name?: string;
  tag_no?: string; device_category?: string; make?: string; model?: string; serial_no?: string;
  location?: string; process_variable?: string;
  range_min?: string; range_max?: string; unit?: string;
  power_supply?: string; enclosure_rating?: string;
  installation_date?: string;
  last_calibration_date?: string; next_calibration_date?: string;
  calibration_by?: string; calibration_interval?: string; calibration_notes?: string;
  comm_type?: CommType;
  comm_config?: CommConfig;
  channels?: Channel[];
  vfd_params?: Record<string, string>;
  param_backup?: ParamBackup[];
  status?: Status; notes?: string; created_by?: string;
  created_at?: string; updated_at?: string;
  // flowmeter extras
  flow_principle?: string; pipe_size?: string; pipe_material?: string; liner_material?: string; electrode_material?: string; signal_output?: string;
}

type FormState = Omit<FieldDevice, "id"|"created_at"|"updated_at">;

const EMPTY: FormState = {
  device_no:"", project_number:"", project_name:"", tag_no:"",
  device_category:"Flowmeter", make:"", model:"", serial_no:"",
  location:"", process_variable:"Flow",
  range_min:"", range_max:"", unit:"",
  power_supply:"", enclosure_rating:"",
  installation_date:"",
  last_calibration_date:"", next_calibration_date:"",
  calibration_by:"", calibration_interval:"", calibration_notes:"",
  comm_type:"4-20mA", comm_config:{},
  channels:[], vfd_params:{}, param_backup:[],
  status:"Active", notes:"",
  flow_principle:"", pipe_size:"", pipe_material:"", liner_material:"", electrode_material:"", signal_output:"",
};

type Tab = "device"|"communication"|"channels"|"backup";
const ALL_TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id:"device",        label:"Device Info",   icon:Settings2   },
  { id:"communication", label:"Communication", icon:Radio        },
  { id:"channels",      label:"Channels / Params", icon:Table2  },
  { id:"backup",        label:"Config Backup", icon:Database     },
];

function fmtDate(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
}

function StatusBadge({ status }: { status?: string }) {
  const cfg: Record<string,{bg:string;text:string;dot:string}> = {
    "Active":             {bg:"bg-emerald-100",text:"text-emerald-700",dot:"bg-emerald-500"},
    "Fault":              {bg:"bg-red-100",    text:"text-red-700",    dot:"bg-red-500"},
    "Under Maintenance":  {bg:"bg-amber-100",  text:"text-amber-700",  dot:"bg-amber-500"},
    "Decommissioned":     {bg:"bg-gray-100",   text:"text-gray-600",   dot:"bg-gray-400"},
    "Spare":              {bg:"bg-blue-100",   text:"text-blue-700",   dot:"bg-blue-500"},
  };
  const c = cfg[status||"Active"] ?? cfg["Active"];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",c.bg,c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",c.dot)}/>
      {status||"Active"}
    </span>
  );
}

function CategoryBadge({ cat }: { cat?: string }) {
  const colors: Record<string,string> = {
    "Flowmeter":"bg-blue-100 text-blue-700",
    "VFD / Drive":"bg-violet-100 text-violet-700",
    "pH Analyser":"bg-emerald-100 text-emerald-700",
    "DO Analyser":"bg-cyan-100 text-cyan-700",
    "Turbidity Analyser":"bg-amber-100 text-amber-700",
    "Pressure Transmitter":"bg-orange-100 text-orange-700",
    "Level Transmitter":"bg-indigo-100 text-indigo-700",
    "Multi-Parameter Analyser":"bg-teal-100 text-teal-700",
  };
  const cls = colors[cat||""] ?? "bg-gray-100 text-gray-700";
  return <span className={cn("px-2 py-0.5 rounded text-xs font-medium",cls)}>{cat||"—"}</span>;
}

// ── Form Field Primitives ──────────────────────────────────────────────────────
function Field({ label,value,onChange,type="text",placeholder="",span2=false,options,textarea,rows=4 }:{
  label:string; value:string; onChange:(v:string)=>void;
  type?:string; placeholder?:string; span2?:boolean;
  options?:string[]; textarea?:boolean; rows?:number;
}) {
  const base = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400";
  return (
    <div className={cn("flex flex-col gap-1", span2 && "col-span-2")}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {options ? (
        <select value={value} onChange={e=>onChange(e.target.value)} className={base}>
          <option value="">— Select —</option>
          {options.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? (
        <textarea rows={rows} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={cn(base,"resize-none")}/>
      ) : (
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className={base}/>
      )}
    </div>
  );
}

function SectionHead({ icon:Icon, title }: { icon:typeof Activity; title:string }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
      <Icon size={15} className="text-blue-600"/>
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
  );
}

// ─── Communication Config Section ─────────────────────────────────────────────
function CommConfigSection({ commType, config, onChange }: {
  commType: string; config: CommConfig; onChange: (c:CommConfig)=>void;
}) {
  const set = (k: keyof CommConfig, v: string) => onChange({ ...config, [k]: v });
  const base = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400";
  const Fld = ({ label, fkey, opts, ph, type="text" }: { label:string; fkey:keyof CommConfig; opts?:string[]; ph?:string; type?:string }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {opts ? (
        <select value={(config as any)[fkey]||""} onChange={e=>set(fkey,e.target.value)} className={base}>
          <option value="">— Select —</option>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={(config as any)[fkey]||""} onChange={e=>set(fkey,e.target.value)} placeholder={ph||""} className={base}/>
      )}
    </div>
  );

  if (commType === "4-20mA") return (
    <div className="space-y-6">
      <div>
        <SectionHead icon={Activity} title="Analog Signal"/>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Fld label="Signal Min (mA)" fkey="signal_min" ph="e.g. 4"/>
          <Fld label="Signal Max (mA)" fkey="signal_max" ph="e.g. 20"/>
          <Fld label="Measured Min" fkey="measured_min" ph="e.g. 0"/>
          <Fld label="Measured Max" fkey="measured_max" ph="e.g. 1000"/>
          <Fld label="Fail-Safe Mode" fkey="fail_mode" opts={FAIL_MODES}/>
          <Fld label="Notes" fkey="notes" ph="Wiring, loop resistor, etc."/>
        </div>
      </div>
    </div>
  );

  if (commType === "RS485 / Modbus RTU") return (
    <div className="space-y-6">
      <div>
        <SectionHead icon={Radio} title="RS485 Port Settings"/>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <Fld label="Baud Rate" fkey="baud_rate" opts={BAUD_RATES}/>
          <Fld label="Data Bits" fkey="data_bits" opts={DATA_BITS}/>
          <Fld label="Parity" fkey="parity" opts={PARITIES}/>
          <Fld label="Stop Bits" fkey="stop_bits" opts={STOP_BITS}/>
          <Fld label="Byte Order" fkey="byte_order" opts={BYTE_ORDERS}/>
        </div>
      </div>
      <div>
        <SectionHead icon={Database} title="Modbus RTU Parameters"/>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <Fld label="Slave Address" fkey="modbus_address" ph="e.g. 1"/>
          <Fld label="Function Code" fkey="modbus_function" opts={FUNC_CODES}/>
          <Fld label="Register Address" fkey="register_address" ph="e.g. 40001"/>
          <Fld label="Register Count" fkey="register_count" ph="e.g. 10"/>
          <div className="col-span-2">
            <Fld label="Notes" fkey="notes" ph="Wiring notes, termination, etc."/>
          </div>
        </div>
      </div>
    </div>
  );

  if (commType === "Modbus TCP/IP") return (
    <div className="space-y-6">
      <div>
        <SectionHead icon={Wifi} title="TCP/IP Connection"/>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Fld label="IP Address" fkey="ip_address" ph="e.g. 192.168.1.10"/>
          <Fld label="Port" fkey="port" ph="502"/>
          <Fld label="Subnet Mask" fkey="subnet" ph="255.255.255.0"/>
          <Fld label="Gateway" fkey="gateway" ph="192.168.1.1"/>
        </div>
      </div>
      <div>
        <SectionHead icon={Database} title="Modbus TCP Parameters"/>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          <Fld label="Unit ID" fkey="unit_id" ph="e.g. 1"/>
          <Fld label="Register Address" fkey="register_address" ph="e.g. 40001"/>
          <Fld label="Register Count" fkey="register_count" ph="e.g. 10"/>
          <Fld label="Function Code" fkey="modbus_function" opts={FUNC_CODES}/>
          <Fld label="Byte Order" fkey="byte_order" opts={BYTE_ORDERS}/>
          <Fld label="Notes" fkey="notes" ph=""/>
        </div>
      </div>
    </div>
  );

  if (commType === "TCP/IP (Generic)") return (
    <div>
      <SectionHead icon={Wifi} title="TCP/IP Settings"/>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fld label="IP Address" fkey="ip_address" ph="e.g. 192.168.1.10"/>
        <Fld label="Port" fkey="port" ph="e.g. 502"/>
        <Fld label="Subnet Mask" fkey="subnet" ph="255.255.255.0"/>
        <Fld label="Gateway" fkey="gateway" ph="192.168.1.1"/>
        <Fld label="Protocol (TCP/UDP)" fkey="tcp_protocol" opts={["TCP","UDP"]}/>
        <Fld label="Notes" fkey="notes" ph=""/>
      </div>
    </div>
  );

  if (commType === "HART") return (
    <div>
      <SectionHead icon={Radio} title="HART Settings"/>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fld label="HART Address (0–63)" fkey="hart_address" ph="e.g. 0"/>
        <Fld label="HART Revision" fkey="hart_revision" opts={["HART 5","HART 6","HART 7"]}/>
        <Fld label="Signal Min (mA)" fkey="signal_min" ph="4"/>
        <Fld label="Signal Max (mA)" fkey="signal_max" ph="20"/>
        <div className="col-span-2"><Fld label="Notes" fkey="notes" ph=""/></div>
      </div>
    </div>
  );

  if (commType === "Profibus DP") return (
    <div>
      <SectionHead icon={Radio} title="Profibus DP Settings"/>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fld label="Node Address (0–126)" fkey="profibus_address" ph="e.g. 3"/>
        <Fld label="Baud Rate" fkey="profibus_baud" opts={["9.6 kbps","19.2 kbps","93.75 kbps","187.5 kbps","500 kbps","1.5 Mbps","3 Mbps","6 Mbps","12 Mbps"]}/>
        <div className="col-span-2"><Fld label="Notes" fkey="notes" ph="GSD file, slot/module info etc."/></div>
      </div>
    </div>
  );

  if (commType === "Pulse / Frequency") return (
    <div>
      <SectionHead icon={Activity} title="Pulse / Frequency Settings"/>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fld label="Pulse Factor" fkey="pulse_factor" ph="e.g. 1 pulse = 1 litre"/>
        <Fld label="Unit per Pulse" fkey="pulse_unit" opts={["L","m³","kg","gal","lb"]}/>
        <Fld label="Max Frequency (Hz)" fkey="max_freq" ph="e.g. 1000"/>
        <Fld label="Logic Type" fkey="logic_type" opts={["NPN (Sinking)","PNP (Sourcing)","Open Collector","Push-Pull","Reed Switch"]}/>
        <div className="col-span-2"><Fld label="Notes" fkey="notes" ph=""/></div>
      </div>
    </div>
  );

  if (commType === "Relay / Digital") return (
    <div>
      <SectionHead icon={Zap} title="Relay / Digital Settings"/>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fld label="Contact Type" fkey="contact_type" opts={["NO (Normally Open)","NC (Normally Closed)","SPDT","DPDT"]}/>
        <Fld label="Rated Voltage" fkey="rated_voltage" ph="e.g. 230VAC / 24VDC"/>
        <Fld label="Rated Current" fkey="rated_current" ph="e.g. 5A"/>
        <div className="col-span-2"><Fld label="Notes" fkey="notes" ph=""/></div>
      </div>
    </div>
  );

  if (commType === "Wireless HART") return (
    <div>
      <SectionHead icon={Wifi} title="WirelessHART Settings"/>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <Fld label="Network ID" fkey="network_id" ph="e.g. 1234"/>
        <Fld label="Node ID" fkey="node_id" ph="e.g. 001"/>
        <Fld label="Channel" fkey="wireless_channel" ph="e.g. 11 (IEEE 802.15.4)"/>
        <Fld label="Join Key" fkey="notes" ph="Network join key"/>
      </div>
    </div>
  );

  // Fallback / Other
  return (
    <div>
      <SectionHead icon={Settings2} title="Communication Settings"/>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="col-span-2">
          <Field label="Communication Notes" value={config.notes||""} onChange={v=>set("notes",v)} textarea rows={4} placeholder="Describe the communication interface, parameters, and wiring details…"/>
        </div>
      </div>
    </div>
  );
}

// ─── Channels Table (Analyser) ────────────────────────────────────────────────
function ChannelsSection({ channels, onChange }: { channels: Channel[]; onChange:(c:Channel[])=>void }) {
  const addRow = () => onChange([...channels, { ch_no: channels.length + 1, parameter:"", sensor_make:"", range_min:"0", range_max:"", unit:"", alarm_low:"", alarm_high:"", signal:"4-20mA", notes:"" }]);
  const delRow = (i:number) => onChange(channels.filter((_,j)=>j!==i));
  const setRow = (i:number, k:keyof Channel, v:string) => {
    const next = channels.map((c,j)=> j===i ? {...c,[k]:v} : c);
    onChange(next);
  };
  const inp = "border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <SectionHead icon={Table2} title="Analyser Channels"/>
        <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
          <PlusIcon size={12}/> Add Channel
        </button>
      </div>
      {channels.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Table2 size={28} className="mb-2 opacity-40"/>
          <p className="text-sm">No channels added yet</p>
          <button onClick={addRow} className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Add Channel</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Ch","Parameter","Sensor Make","Range Min","Range Max","Unit","Alarm L","Alarm H","Signal","Notes",""].map(h=>(
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch,i)=>(
                <tr key={i} className="border-b border-gray-100 last:border-0">
                  <td className="px-2 py-2 w-10"><input className={inp} value={ch.ch_no||""} onChange={e=>setRow(i,"ch_no",e.target.value)} style={{width:40}}/></td>
                  <td className="px-2 py-2"><input className={inp} value={ch.parameter||""} onChange={e=>setRow(i,"parameter",e.target.value)} placeholder="pH / DO…" style={{minWidth:90}}/></td>
                  <td className="px-2 py-2"><input className={inp} value={ch.sensor_make||""} onChange={e=>setRow(i,"sensor_make",e.target.value)} placeholder="Make" style={{minWidth:80}}/></td>
                  <td className="px-2 py-2 w-20"><input className={inp} value={ch.range_min||""} onChange={e=>setRow(i,"range_min",e.target.value)} placeholder="0"/></td>
                  <td className="px-2 py-2 w-20"><input className={inp} value={ch.range_max||""} onChange={e=>setRow(i,"range_max",e.target.value)} placeholder="14"/></td>
                  <td className="px-2 py-2 w-16"><input className={inp} value={ch.unit||""} onChange={e=>setRow(i,"unit",e.target.value)} placeholder="pH"/></td>
                  <td className="px-2 py-2 w-20"><input className={inp} value={ch.alarm_low||""} onChange={e=>setRow(i,"alarm_low",e.target.value)} placeholder="Lo"/></td>
                  <td className="px-2 py-2 w-20"><input className={inp} value={ch.alarm_high||""} onChange={e=>setRow(i,"alarm_high",e.target.value)} placeholder="Hi"/></td>
                  <td className="px-2 py-2">
                    <select className={inp} value={ch.signal||""} onChange={e=>setRow(i,"signal",e.target.value)} style={{minWidth:100}}>
                      {SIGNAL_OUTPUTS.map(o=><option key={o}>{o}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2"><input className={inp} value={ch.notes||""} onChange={e=>setRow(i,"notes",e.target.value)} placeholder="Notes" style={{minWidth:80}}/></td>
                  <td className="px-2 py-2"><button onClick={()=>delRow(i)} className="p-1 rounded hover:bg-red-50 text-red-400"><X size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Parameter Backup Table ────────────────────────────────────────────────────
function ParamBackupSection({ params, onChange }: { params: ParamBackup[]; onChange:(p:ParamBackup[])=>void }) {
  const addRow = () => onChange([...params, { param_no:"", param_name:"", value:"", default_value:"", unit:"", notes:"" }]);
  const delRow = (i:number) => onChange(params.filter((_,j)=>j!==i));
  const setRow = (i:number, k:keyof ParamBackup, v:string) => onChange(params.map((p,j)=>j===i?{...p,[k]:v}:p));
  const inp = "border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full";

  const exportCsv = () => {
    const rows = [["Param No","Parameter Name","Current Value","Default Value","Unit","Notes"],...params.map(p=>[p.param_no,p.param_name,p.value,p.default_value||"",p.unit||"",p.notes||""])];
    const csv = rows.map(r=>r.map(c=>`"${(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="param_backup.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <SectionHead icon={Database} title="Parameter Backup / Config Store"/>
        <div className="flex gap-2 mb-3">
          <button onClick={exportCsv} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors">
            <Download size={12}/> Export CSV
          </button>
          <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
            <PlusIcon size={12}/> Add Row
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4 -mt-2">Store all device parameters here so they can be quickly restored after a factory reset or replacement.</p>
      {params.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Database size={28} className="mb-2 opacity-40"/>
          <p className="text-sm">No parameters saved yet</p>
          <button onClick={addRow} className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold">Add Parameter</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Param No","Parameter Name","Current Value","Default Value","Unit","Notes",""].map(h=>(
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {params.map((p,i)=>(
                <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-2 py-2"><input className={inp} value={p.param_no||""} onChange={e=>setRow(i,"param_no",e.target.value)} placeholder="P-01" style={{width:64}}/></td>
                  <td className="px-2 py-2"><input className={inp} value={p.param_name||""} onChange={e=>setRow(i,"param_name",e.target.value)} placeholder="Parameter name" style={{minWidth:140}}/></td>
                  <td className="px-2 py-2"><input className={inp} value={p.value||""} onChange={e=>setRow(i,"value",e.target.value)} placeholder="Value" style={{minWidth:80}}/></td>
                  <td className="px-2 py-2"><input className={inp} value={p.default_value||""} onChange={e=>setRow(i,"default_value",e.target.value)} placeholder="Default" style={{minWidth:70}}/></td>
                  <td className="px-2 py-2"><input className={inp} value={p.unit||""} onChange={e=>setRow(i,"unit",e.target.value)} placeholder="Unit" style={{width:56}}/></td>
                  <td className="px-2 py-2"><input className={inp} value={p.notes||""} onChange={e=>setRow(i,"notes",e.target.value)} placeholder="Notes" style={{minWidth:100}}/></td>
                  <td className="px-2 py-2"><button onClick={()=>delRow(i)} className="p-1 rounded hover:bg-red-50 text-red-400"><X size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── VFD Params Section ────────────────────────────────────────────────────────
function VfdSection({ form, sf }: { form: FormState; sf:(k:keyof FormState,v:any)=>void }) {
  const vfd = (form.vfd_params || {}) as Record<string,string>;
  const set = (k:string, v:string) => sf("vfd_params", {...vfd,[k]:v});

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400";
  const sel = (label:string, key:string, opts:string[]) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <select value={vfd[key]||""} onChange={e=>set(key,e.target.value)} className={inp}>
        <option value="">— Select —</option>
        {opts.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );
  const txt = (label:string, key:string, ph="") => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      <input value={vfd[key]||""} onChange={e=>set(key,e.target.value)} placeholder={ph} className={inp}/>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <SectionHead icon={Cpu} title="Motor / Drive Nameplate"/>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          {txt("Rated Power","rated_power","e.g. 7.5 kW")}
          {txt("Rated Current","rated_current","e.g. 16.5 A")}
          {txt("Rated Voltage","rated_voltage","e.g. 415V 3Ph")}
          {txt("Motor Speed (RPM)","motor_rpm","e.g. 1450")}
          {txt("Motor Frequency (Hz)","motor_freq","e.g. 50")}
          {txt("Motor Poles","motor_poles","e.g. 4")}
        </div>
      </div>
      <div>
        <SectionHead icon={Settings2} title="Drive Configuration"/>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          {sel("Control Mode","control_mode",CONTROL_MODES)}
          {sel("Speed Reference Source","speed_ref",SPEED_REF_SOURCES)}
          {txt("Min Frequency (Hz)","freq_min","e.g. 0")}
          {txt("Max Frequency (Hz)","freq_max","e.g. 50")}
          {txt("Acceleration Time (s)","accel_time","e.g. 5")}
          {txt("Deceleration Time (s)","decel_time","e.g. 5")}
          {txt("Carrier Frequency (kHz)","carrier_freq","e.g. 4")}
          {txt("Motor Overload (%)","overload","e.g. 100")}
          {txt("4-20mA Min Speed (Hz)","analog_min","e.g. 0")}
          {txt("4-20mA Max Speed (Hz)","analog_max","e.g. 50")}
        </div>
      </div>
      <div>
        <SectionHead icon={Radio} title="VFD Communication"/>
        <div className="grid grid-cols-3 gap-x-6 gap-y-4">
          {txt("Modbus Address","vfd_modbus_addr","e.g. 1")}
          {txt("Baud Rate","vfd_baud","e.g. 9600")}
          {txt("Parity","vfd_parity","e.g. None / Even")}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PLCFieldDevices() {
  const { user } = useAuth();
  const userName = (user as any)?.fullName || (user as any)?.email || "";

  const [items, setItems]         = useState<FieldDevice[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [stFilter, setStFilter]   = useState("All");
  const [selected, setSelected]   = useState<FieldDevice|null>(null);
  const [isNew, setIsNew]         = useState(false);
  const [form, setForm]           = useState<FormState>({...EMPTY});
  const [activeTab, setActiveTab] = useState<Tab>("device");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [stats, setStats]         = useState({total:0,active:0,fault:0,calDue:0});

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search.trim()) p.set("search",search.trim());
      if (catFilter!=="All") p.set("category",catFilter);
      if (stFilter!=="All") p.set("status",stFilter);
      const r = await fetch(`${BASE}/api/plc/field-devices?${p}`);
      setItems(await r.json());
    } catch { setError("Failed to load devices."); }
    finally { setLoading(false); }
  }, [search,catFilter,stFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/plc/field-devices/stats`);
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  useEffect(() => { fetchItems(); fetchStats(); }, [fetchItems,fetchStats]);

  function openNew() {
    setForm({...EMPTY, created_by:userName});
    setSelected(null); setIsNew(true); setActiveTab("device"); setError("");
  }
  function openEdit(item: FieldDevice) {
    const f = {...EMPTY} as any;
    (Object.keys(EMPTY) as (keyof FormState)[]).forEach(k=>{ f[k]=(item as any)[k]??EMPTY[k]; });
    f.comm_config  = typeof item.comm_config  === "string" ? JSON.parse(item.comm_config)  : (item.comm_config  || {});
    f.channels     = typeof item.channels     === "string" ? JSON.parse(item.channels)     : (item.channels     || []);
    f.vfd_params   = typeof item.vfd_params   === "string" ? JSON.parse(item.vfd_params)   : (item.vfd_params   || {});
    f.param_backup = typeof item.param_backup === "string" ? JSON.parse(item.param_backup) : (item.param_backup || []);
    setForm(f); setSelected(item); setIsNew(false); setActiveTab("device"); setError("");
  }
  function closeDetail() { setSelected(null); setIsNew(false); setError(""); }

  const sf = (k: keyof FormState, v: any) => setForm(p=>({...p,[k]:v}));

  async function handleSave() {
    if (!form.tag_no?.trim() && !form.project_name?.trim()) { setError("Tag No or Project Name is required."); return; }
    setSaving(true); setError("");
    try {
      const body = {...form};
      const url  = isNew ? `${BASE}/api/plc/field-devices` : `${BASE}/api/plc/field-devices/${selected!.id}`;
      const r = await fetch(url,{method:isNew?"POST":"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if (!r.ok) throw new Error(await r.text());
      await fetchItems(); fetchStats();
      if (isNew) { closeDetail(); } else {
        const upd = await fetch(`${BASE}/api/plc/field-devices/${selected!.id}`);
        if (upd.ok) setSelected(await upd.json());
      }
    } catch(e) { setError(String(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id:number) {
    if (!confirm("Delete this device record? This cannot be undone.")) return;
    await fetch(`${BASE}/api/plc/field-devices/${id}`,{method:"DELETE"});
    await fetchItems(); fetchStats(); closeDetail();
  }

  const inDetail = isNew || selected !== null;

  // Which tabs to show
  const isVfd       = (form.device_category||"").toLowerCase().includes("vfd") || (form.device_category||"").toLowerCase().includes("drive");
  const isAnalyser  = (form.device_category||"").toLowerCase().includes("analyser") || (form.device_category||"").toLowerCase().includes("analyzer");
  const tabs = ALL_TABS.filter(t => {
    if (t.id === "channels") return isAnalyser || isVfd;
    return true;
  });

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">

        {/* ── Top bar ───────────────────────────────────────────────────── */}
        <div className="flex-none bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {inDetail && (
                <button onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
                  <ArrowLeft size={16}/>
                </button>
              )}
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Activity size={16} className="text-blue-700"/>
              </div>
              <div>
                <h1 className="text-base font-bold text-gray-900">Field Instrument & Device Config</h1>
                <p className="text-xs text-gray-500">
                  {inDetail
                    ? (isNew ? "New Device" : `${selected?.tag_no||selected?.device_no||`#${selected?.id}`} — ${selected?.project_name||"—"}`)
                    : `${items.length} device${items.length!==1?"s":""}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!inDetail && (
                <>
                  <div className="relative">
                    <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="All">All Categories</option>
                      {DEVICE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                  <div className="relative">
                    <select value={stFilter} onChange={e=>setStFilter(e.target.value)}
                      className="appearance-none pl-3 pr-7 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="All">All Statuses</option>
                      {STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchItems()}
                      placeholder="Tag, project, make…"
                      className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"/>
                  </div>
                  <button onClick={fetchItems} className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-colors">
                    <RefreshCw size={14} className={loading?"animate-spin":""}/>
                  </button>
                  <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                    <Plus size={14}/> New Device
                  </button>
                </>
              )}
              {inDetail && (
                <>
                  {!isNew && selected && (
                    <button onClick={()=>handleDelete(selected.id)} disabled={saving}
                      className="flex items-center gap-2 px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                      <Trash2 size={14}/> Delete
                    </button>
                  )}
                  <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                    <Save size={14}/> {saving?"Saving…":"Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} className="flex-none"/> {error}
            <button onClick={()=>setError("")} className="ml-auto"><X size={13}/></button>
          </div>
        )}

        {/* ── List View ─────────────────────────────────────────────────── */}
        {!inDetail && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                {label:"Total Devices",  value:stats.total,  icon:Activity,      color:"text-blue-600",    bg:"bg-blue-50",    border:"border-blue-200"},
                {label:"Active",         value:stats.active, icon:CheckCircle2,  color:"text-emerald-600", bg:"bg-emerald-50", border:"border-emerald-200"},
                {label:"Fault",          value:stats.fault,  icon:AlertTriangle, color:"text-red-600",     bg:"bg-red-50",     border:"border-red-200"},
                {label:"Cal Due (30d)",  value:stats.calDue, icon:Calendar,      color:"text-amber-600",   bg:"bg-amber-50",   border:"border-amber-200"},
              ].map(s=>(
                <div key={s.label} className={cn("bg-white border rounded-xl p-4 flex items-center gap-3",s.border)}>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",s.bg)}>
                    <s.icon size={18} className={s.color}/>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-40 text-gray-400">
                <Loader2 size={22} className="animate-spin mr-2"/> Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-gray-400">
                <Activity size={40} className="mb-3 opacity-30"/>
                <p className="text-sm text-gray-500">No field devices configured yet</p>
                <p className="text-xs text-gray-400 mt-1">Add flowmeters, analysers, VFDs, sensors with full communication configs</p>
                <button onClick={openNew} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
                  <Plus size={14}/> Add First Device
                </button>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Device No","Tag No","Category","Make / Model","Project","Communication","Process Var.","Cal. Due","Status"].map(h=>(
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item=>(
                      <tr key={item.id} onClick={()=>openEdit(item)}
                        className="border-b border-gray-100 last:border-0 hover:bg-blue-50 cursor-pointer transition-colors group">
                        <td className="px-4 py-3 font-mono text-xs text-blue-600 font-bold">{item.device_no||"—"}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{item.tag_no||"—"}</p>
                          {item.location && <p className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin size={9}/>{item.location}</p>}
                        </td>
                        <td className="px-4 py-3"><CategoryBadge cat={item.device_category}/></td>
                        <td className="px-4 py-3">
                          <p className="text-gray-800">{item.make||"—"}</p>
                          {item.model && <p className="text-xs text-gray-500">{item.model}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-700 truncate max-w-[130px]">{item.project_name||"—"}</p>
                          {item.project_number && <p className="text-xs text-blue-600 font-mono">{item.project_number}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{item.comm_type||"—"}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {item.process_variable||"—"}
                          {(item.range_min||item.range_max) && <span className="text-gray-400 ml-1">({item.range_min||"0"}–{item.range_max||"?"} {item.unit||""})</span>}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {item.next_calibration_date ? (
                            <span className={cn(
                              "font-medium",
                              new Date(item.next_calibration_date) <= new Date(Date.now()+30*864e5) ? "text-amber-600" : "text-gray-500"
                            )}>{fmtDate(item.next_calibration_date)}</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={item.status}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Detail / Edit View ────────────────────────────────────────── */}
        {inDetail && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tabs */}
            <div className="flex-none bg-white border-b border-gray-200 px-6">
              <div className="flex gap-0 overflow-x-auto">
                {tabs.map(t=>{
                  const Icon=t.icon; const active=activeTab===t.id;
                  return (
                    <button key={t.id} onClick={()=>setActiveTab(t.id)}
                      className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                        active ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300")}>
                      <Icon size={14}/>{t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl">

              {/* DEVICE INFO ─────────────────────────────────────────────── */}
              {activeTab === "device" && (
                <div className="space-y-8">
                  <div>
                    <SectionHead icon={FolderOpen} title="Project & Identification"/>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Project Number" value={form.project_number||""} onChange={v=>sf("project_number",v)} placeholder="e.g. WTT-2024-001"/>
                      <Field label="Project Name"   value={form.project_name||""}   onChange={v=>sf("project_name",v)}   placeholder="Site / Customer name"/>
                      <Field label="Tag No"          value={form.tag_no||""}          onChange={v=>sf("tag_no",v)}          placeholder="e.g. FIT-001, pH-101"/>
                      <Field label="Location"        value={form.location||""}        onChange={v=>sf("location",v)}        placeholder="e.g. Feed Inlet, MBR Tank 1"/>
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={Activity} title="Device Details"/>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Device Category"   value={form.device_category||"Flowmeter"} onChange={v=>sf("device_category",v)} options={DEVICE_CATEGORIES}/>
                      <Field label="Process Variable"  value={form.process_variable||""}          onChange={v=>sf("process_variable",v)}  options={PROCESS_VARIABLES}/>
                      <Field label="Make / Brand"      value={form.make||""}      onChange={v=>sf("make",v)}      placeholder="e.g. Endress+Hauser, ABB"/>
                      <Field label="Model"             value={form.model||""}     onChange={v=>sf("model",v)}     placeholder="e.g. Promag 50W"/>
                      <Field label="Serial Number"     value={form.serial_no||""} onChange={v=>sf("serial_no",v)} placeholder="Device serial no."/>
                      <Field label="Status"            value={form.status||"Active"} onChange={v=>sf("status",v)} options={STATUSES}/>
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={BarChart2} title="Measurement Range"/>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                      <Field label="Range Min"  value={form.range_min||""}  onChange={v=>sf("range_min",v)}  placeholder="e.g. 0"/>
                      <Field label="Range Max"  value={form.range_max||""}  onChange={v=>sf("range_max",v)}  placeholder="e.g. 1000"/>
                      <Field label="Unit"       value={form.unit||""}       onChange={v=>sf("unit",v)}       placeholder="e.g. m³/h, pH, NTU"/>
                    </div>
                  </div>

                  {/* Flowmeter-specific */}
                  {(form.device_category||"").toLowerCase().includes("flow") && (
                    <div>
                      <SectionHead icon={Activity} title="Flowmeter Specifics"/>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <Field label="Flow Principle" value={(form as any).flow_principle||""} onChange={v=>sf("flow_principle" as any,v)} options={FLOW_PRINCIPLES}/>
                        <Field label="Signal Output"  value={(form as any).signal_output||""}  onChange={v=>sf("signal_output" as any,v)}  options={SIGNAL_OUTPUTS}/>
                        <Field label="Pipe Size (DN)" value={(form as any).pipe_size||""}  onChange={v=>sf("pipe_size" as any,v)}  placeholder="e.g. DN50, DN100"/>
                        <Field label="Pipe Material"  value={(form as any).pipe_material||""}  onChange={v=>sf("pipe_material" as any,v)}  placeholder="SS304, MS, uPVC"/>
                        <Field label="Liner Material" value={(form as any).liner_material||""} onChange={v=>sf("liner_material" as any,v)} placeholder="e.g. Hard Rubber, PTFE"/>
                        <Field label="Electrode Material" value={(form as any).electrode_material||""} onChange={v=>sf("electrode_material" as any,v)} placeholder="e.g. SS316, Hastelloy C"/>
                      </div>
                    </div>
                  )}

                  <div>
                    <SectionHead icon={Zap} title="Power & Enclosure"/>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Power Supply"     value={form.power_supply||""}     onChange={v=>sf("power_supply",v)}     options={POWER_SUPPLIES}/>
                      <Field label="Enclosure Rating" value={form.enclosure_rating||""} onChange={v=>sf("enclosure_rating",v)} options={ENCLOSURES}/>
                      <Field label="Installation Date" value={form.installation_date||""} onChange={v=>sf("installation_date",v)} type="date"/>
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={Calendar} title="Calibration"/>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <Field label="Last Calibration"  value={form.last_calibration_date||""} onChange={v=>sf("last_calibration_date",v)} type="date"/>
                      <Field label="Next Calibration"  value={form.next_calibration_date||""} onChange={v=>sf("next_calibration_date",v)} type="date"/>
                      <Field label="Calibrated By"     value={form.calibration_by||""}        onChange={v=>sf("calibration_by",v)}        placeholder="Engineer / Agency name"/>
                      <Field label="Cal. Interval"     value={form.calibration_interval||""} onChange={v=>sf("calibration_interval",v)} options={CAL_INTERVALS}/>
                      <div className="col-span-2">
                        <Field label="Calibration Notes" value={form.calibration_notes||""} onChange={v=>sf("calibration_notes",v)} textarea rows={3} placeholder="Calibration procedure notes, certificate ref, etc."/>
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionHead icon={FileText} title="Additional Notes"/>
                    <Field label="Notes" value={form.notes||""} onChange={v=>sf("notes",v)} textarea rows={3} placeholder="Any additional remarks about this device…"/>
                  </div>
                </div>
              )}

              {/* COMMUNICATION ──────────────────────────────────────────── */}
              {activeTab === "communication" && (
                <div className="space-y-6">
                  <div>
                    <SectionHead icon={Radio} title="Communication Interface"/>
                    <div className="max-w-sm">
                      <Field label="Communication Type" value={form.comm_type||"4-20mA"} onChange={v=>{ sf("comm_type",v as CommType); sf("comm_config",{}); }} options={COMM_TYPES}/>
                    </div>
                  </div>
                  <CommConfigSection
                    commType={form.comm_type||"4-20mA"}
                    config={form.comm_config||{}}
                    onChange={c=>sf("comm_config",c)}
                  />
                </div>
              )}

              {/* CHANNELS / VFD PARAMS ──────────────────────────────────── */}
              {activeTab === "channels" && (
                isVfd
                  ? <VfdSection form={form} sf={sf}/>
                  : <ChannelsSection channels={form.channels||[]} onChange={c=>sf("channels",c)}/>
              )}

              {/* CONFIG BACKUP ──────────────────────────────────────────── */}
              {activeTab === "backup" && (
                <ParamBackupSection params={form.param_backup||[]} onChange={p=>sf("param_backup",p)}/>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
