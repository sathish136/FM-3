import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Droplets, Gauge, FlaskConical } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StartupRecord {
  id: number;
  site_name: string;
  startup_date: string;
  plant_type: string;
  capacity_m3_per_day: number | null;
  feed_flow_lph: number | null;
  permeate_flow_lph: number | null;
  reject_flow_lph: number | null;
  feed_pressure_bar: number | null;
  op_pressure_bar: number | null;
  feed_tds_ppm: number | null;
  permeate_tds_ppm: number | null;
  feed_ph: number | null;
  permeate_ph: number | null;
  antiscalant_dose_ppm: number | null;
  chlorine_dose_ppm: number | null;
  chemical_notes: string | null;
  remarks: string | null;
  operator: string | null;
  created_at: string;
}

const EMPTY = {
  site_name: "",
  startup_date: new Date().toISOString().slice(0, 10),
  plant_type: "RO",
  capacity_m3_per_day: "" as string,
  feed_flow_lph: "" as string,
  permeate_flow_lph: "" as string,
  reject_flow_lph: "" as string,
  feed_pressure_bar: "" as string,
  op_pressure_bar: "" as string,
  feed_tds_ppm: "" as string,
  permeate_tds_ppm: "" as string,
  feed_ph: "" as string,
  permeate_ph: "" as string,
  antiscalant_dose_ppm: "" as string,
  chlorine_dose_ppm: "" as string,
  chemical_notes: "",
  remarks: "",
  operator: "",
};

type FormState = typeof EMPTY;

const PLANT_TYPE_COLOR: Record<string, string> = {
  RO: "bg-blue-500/20 text-blue-300",
  MBR: "bg-teal-500/20 text-teal-300",
  STP: "bg-amber-500/20 text-amber-300",
  ETP: "bg-rose-500/20 text-rose-300",
  UF: "bg-violet-500/20 text-violet-300",
};

export default function StartupSheet() {
  const { toast } = useToast();
  const [records, setRecords] = useState<StartupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<StartupRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/startup-sheets`);
      setRecords(await r.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(r: StartupRecord) {
    setEditing(r);
    setForm({
      site_name: r.site_name,
      startup_date: r.startup_date?.slice(0, 10) ?? "",
      plant_type: r.plant_type,
      capacity_m3_per_day: r.capacity_m3_per_day != null ? String(r.capacity_m3_per_day) : "",
      feed_flow_lph: r.feed_flow_lph != null ? String(r.feed_flow_lph) : "",
      permeate_flow_lph: r.permeate_flow_lph != null ? String(r.permeate_flow_lph) : "",
      reject_flow_lph: r.reject_flow_lph != null ? String(r.reject_flow_lph) : "",
      feed_pressure_bar: r.feed_pressure_bar != null ? String(r.feed_pressure_bar) : "",
      op_pressure_bar: r.op_pressure_bar != null ? String(r.op_pressure_bar) : "",
      feed_tds_ppm: r.feed_tds_ppm != null ? String(r.feed_tds_ppm) : "",
      permeate_tds_ppm: r.permeate_tds_ppm != null ? String(r.permeate_tds_ppm) : "",
      feed_ph: r.feed_ph != null ? String(r.feed_ph) : "",
      permeate_ph: r.permeate_ph != null ? String(r.permeate_ph) : "",
      antiscalant_dose_ppm: r.antiscalant_dose_ppm != null ? String(r.antiscalant_dose_ppm) : "",
      chlorine_dose_ppm: r.chlorine_dose_ppm != null ? String(r.chlorine_dose_ppm) : "",
      chemical_notes: r.chemical_notes ?? "",
      remarks: r.remarks ?? "",
      operator: r.operator ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.site_name) return;
    setSaving(true);
    const body = {
      site_name: form.site_name,
      startup_date: form.startup_date || null,
      plant_type: form.plant_type,
      capacity_m3_per_day: form.capacity_m3_per_day !== "" ? Number(form.capacity_m3_per_day) : null,
      feed_flow_lph: form.feed_flow_lph !== "" ? Number(form.feed_flow_lph) : null,
      permeate_flow_lph: form.permeate_flow_lph !== "" ? Number(form.permeate_flow_lph) : null,
      reject_flow_lph: form.reject_flow_lph !== "" ? Number(form.reject_flow_lph) : null,
      feed_pressure_bar: form.feed_pressure_bar !== "" ? Number(form.feed_pressure_bar) : null,
      op_pressure_bar: form.op_pressure_bar !== "" ? Number(form.op_pressure_bar) : null,
      feed_tds_ppm: form.feed_tds_ppm !== "" ? Number(form.feed_tds_ppm) : null,
      permeate_tds_ppm: form.permeate_tds_ppm !== "" ? Number(form.permeate_tds_ppm) : null,
      feed_ph: form.feed_ph !== "" ? Number(form.feed_ph) : null,
      permeate_ph: form.permeate_ph !== "" ? Number(form.permeate_ph) : null,
      antiscalant_dose_ppm: form.antiscalant_dose_ppm !== "" ? Number(form.antiscalant_dose_ppm) : null,
      chlorine_dose_ppm: form.chlorine_dose_ppm !== "" ? Number(form.chlorine_dose_ppm) : null,
      chemical_notes: form.chemical_notes || null,
      remarks: form.remarks || null,
      operator: form.operator || null,
    };
    try {
      const url = editing ? `${BASE}/api/startup-sheets/${editing.id}` : `${BASE}/api/startup-sheets`;
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      toast({ title: editing ? "Record updated" : "Record saved" });
      setOpen(false);
      load();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    await fetch(`${BASE}/api/startup-sheets/${id}`, { method: "DELETE" });
    load();
  }

  function setF(k: keyof FormState, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function numField(k: keyof FormState, label: string, unit?: string) {
    return (
      <div>
        <Label className="text-xs text-slate-400">
          {label}{unit && <span className="ml-1 text-slate-500">({unit})</span>}
        </Label>
        <Input
          type="number"
          step="any"
          value={form[k] as string}
          onChange={e => setF(k, e.target.value)}
          className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
        />
      </div>
    );
  }

  const filtered = records.filter(r =>
    r.site_name.toLowerCase().includes(search.toLowerCase()) ||
    r.plant_type.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Droplets className="w-5 h-5 text-cyan-400" />
            Startup Sheet
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Plant startup parameters log — flow, pressure, chemical doses</p>
        </div>
        <Button onClick={openNew} className="bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Record
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search site or plant type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-sm"
        />
      </div>

      <div className="rounded-xl border border-slate-700/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/60 border-slate-700/60">
              <TableHead className="text-slate-400 text-xs">Site</TableHead>
              <TableHead className="text-slate-400 text-xs">Date</TableHead>
              <TableHead className="text-slate-400 text-xs">Type</TableHead>
              <TableHead className="text-slate-400 text-xs">Capacity (m³/d)</TableHead>
              <TableHead className="text-slate-400 text-xs">Feed Flow (LPH)</TableHead>
              <TableHead className="text-slate-400 text-xs">Perm. Flow (LPH)</TableHead>
              <TableHead className="text-slate-400 text-xs">Feed TDS (ppm)</TableHead>
              <TableHead className="text-slate-400 text-xs">Perm. TDS (ppm)</TableHead>
              <TableHead className="text-slate-400 text-xs">Feed pH</TableHead>
              <TableHead className="text-slate-400 text-xs">Operator</TableHead>
              <TableHead className="text-slate-400 text-xs w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-10 text-slate-500">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-10 text-slate-500">No startup records found</TableCell></TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.id} className="border-slate-700/40 hover:bg-slate-800/40">
                <TableCell className="font-medium text-white text-sm">{r.site_name}</TableCell>
                <TableCell className="text-slate-300 text-sm">{r.startup_date?.slice(0, 10)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${PLANT_TYPE_COLOR[r.plant_type] ?? "bg-slate-700 text-slate-300"}`}>
                    {r.plant_type}
                  </span>
                </TableCell>
                <TableCell className="text-slate-300 text-sm">{r.capacity_m3_per_day ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{r.feed_flow_lph ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{r.permeate_flow_lph ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{r.feed_tds_ppm ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{r.permeate_tds_ppm ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{r.feed_ph ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{r.operator ?? "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => del(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit Startup Record" : "New Startup Record"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5" /> Site Info
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Site Name *</Label>
                  <Input
                    value={form.site_name}
                    onChange={e => setF("site_name", e.target.value)}
                    placeholder="e.g. Rajkot STP Phase 2"
                    className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Startup Date</Label>
                  <Input
                    type="date"
                    value={form.startup_date}
                    onChange={e => setF("startup_date", e.target.value)}
                    className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Plant Type</Label>
                  <Select value={form.plant_type} onValueChange={v => setF("plant_type", v)}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {["RO", "MBR", "STP", "ETP", "UF", "Other"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Operator / Engineer</Label>
                  <Input
                    value={form.operator}
                    onChange={e => setF("operator", e.target.value)}
                    placeholder="Name"
                    className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" /> Flow & Pressure Parameters
              </p>
              <div className="grid grid-cols-3 gap-3">
                {numField("capacity_m3_per_day", "Capacity", "m³/day")}
                {numField("feed_flow_lph", "Feed Flow", "LPH")}
                {numField("permeate_flow_lph", "Permeate Flow", "LPH")}
                {numField("reject_flow_lph", "Reject Flow", "LPH")}
                {numField("feed_pressure_bar", "Feed Pressure", "bar")}
                {numField("op_pressure_bar", "Op. Pressure", "bar")}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" /> Water Quality
              </p>
              <div className="grid grid-cols-3 gap-3">
                {numField("feed_tds_ppm", "Feed TDS", "ppm")}
                {numField("permeate_tds_ppm", "Permeate TDS", "ppm")}
                {numField("feed_ph", "Feed pH")}
                {numField("permeate_ph", "Permeate pH")}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Chemical Doses</p>
              <div className="grid grid-cols-2 gap-3">
                {numField("antiscalant_dose_ppm", "Antiscalant", "ppm")}
                {numField("chlorine_dose_ppm", "Chlorine Dose", "ppm")}
              </div>
              <div className="mt-3">
                <Label className="text-xs text-slate-400">Chemical Notes</Label>
                <Textarea
                  value={form.chemical_notes}
                  onChange={e => setF("chemical_notes", e.target.value)}
                  placeholder="Dosing schedule, chemical names, etc."
                  className="mt-1 bg-slate-800 border-slate-700 text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-400">Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={e => setF("remarks", e.target.value)}
                placeholder="Any observations or issues during startup…"
                className="mt-1 bg-slate-800 border-slate-700 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400">Cancel</Button>
            <Button
              onClick={save}
              disabled={!form.site_name || saving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {saving ? "Saving…" : editing ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
