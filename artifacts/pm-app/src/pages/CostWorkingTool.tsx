import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Calculator, TrendingUp, IndianRupee } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CostWorking {
  id: number;
  quote_no: string;
  project_name: string;
  customer: string;
  date: string;
  capacity: string | null;
  plant_type: string | null;
  equipment_cost: number;
  civil_cost: number;
  erection_cost: number;
  electrical_cost: number;
  piping_cost: number;
  commissioning_cost: number;
  others_cost: number;
  margin_pct: number;
  discount_pct: number;
  gst_pct: number;
  notes: string | null;
  status: string;
  created_at: string;
}

const EMPTY = {
  quote_no: "", project_name: "", customer: "",
  date: new Date().toISOString().slice(0, 10),
  capacity: "", plant_type: "",
  equipment_cost: "0", civil_cost: "0", erection_cost: "0",
  electrical_cost: "0", piping_cost: "0", commissioning_cost: "0", others_cost: "0",
  margin_pct: "20", discount_pct: "0", gst_pct: "18",
  notes: "", status: "Draft",
};
type FormState = typeof EMPTY;

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-slate-600 text-slate-200",
  "Under Review": "bg-amber-500/20 text-amber-300",
  Approved: "bg-emerald-500/20 text-emerald-300",
  Sent: "bg-blue-500/20 text-blue-300",
  Won: "bg-teal-500/20 text-teal-300",
  Lost: "bg-rose-500/20 text-rose-300",
};

function n(v: string) { return v === "" ? 0 : Number(v); }
function inr(v: number) { return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 0 }); }

function calcSummary(f: FormState) {
  const baseCost = n(f.equipment_cost) + n(f.civil_cost) + n(f.erection_cost) + n(f.electrical_cost) + n(f.piping_cost) + n(f.commissioning_cost) + n(f.others_cost);
  const margin = baseCost * (n(f.margin_pct) / 100);
  const priceBeforeDiscount = baseCost + margin;
  const discount = priceBeforeDiscount * (n(f.discount_pct) / 100);
  const priceAfterDiscount = priceBeforeDiscount - discount;
  const gst = priceAfterDiscount * (n(f.gst_pct) / 100);
  const totalPrice = priceAfterDiscount + gst;
  const grossMarginPct = priceAfterDiscount > 0 ? ((priceAfterDiscount - baseCost) / priceAfterDiscount) * 100 : 0;
  return { baseCost, margin, discount, priceAfterDiscount, gst, totalPrice, grossMarginPct };
}

function calcFromRecord(r: CostWorking) {
  return calcSummary({
    ...EMPTY,
    equipment_cost: String(r.equipment_cost), civil_cost: String(r.civil_cost),
    erection_cost: String(r.erection_cost), electrical_cost: String(r.electrical_cost),
    piping_cost: String(r.piping_cost), commissioning_cost: String(r.commissioning_cost),
    others_cost: String(r.others_cost), margin_pct: String(r.margin_pct),
    discount_pct: String(r.discount_pct), gst_pct: String(r.gst_pct),
  });
}

export default function CostWorkingTool() {
  const { toast } = useToast();
  const [records, setRecords] = useState<CostWorking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<CostWorking | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/cost-working`);
      setRecords(await r.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => calcSummary(form), [form]);
  const detailRecord = detailId != null ? records.find(r => r.id === detailId) : null;
  const detailSummary = detailRecord ? calcFromRecord(detailRecord) : null;

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(r: CostWorking) {
    setEditing(r);
    setForm({
      quote_no: r.quote_no, project_name: r.project_name, customer: r.customer,
      date: r.date?.slice(0, 10) ?? "", capacity: r.capacity ?? "", plant_type: r.plant_type ?? "",
      equipment_cost: String(r.equipment_cost), civil_cost: String(r.civil_cost),
      erection_cost: String(r.erection_cost), electrical_cost: String(r.electrical_cost),
      piping_cost: String(r.piping_cost), commissioning_cost: String(r.commissioning_cost),
      others_cost: String(r.others_cost), margin_pct: String(r.margin_pct),
      discount_pct: String(r.discount_pct), gst_pct: String(r.gst_pct),
      notes: r.notes ?? "", status: r.status,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.quote_no || !form.project_name || !form.customer) return;
    setSaving(true);
    const body = {
      quote_no: form.quote_no, project_name: form.project_name, customer: form.customer,
      date: form.date || null, capacity: form.capacity || null, plant_type: form.plant_type || null,
      equipment_cost: n(form.equipment_cost), civil_cost: n(form.civil_cost),
      erection_cost: n(form.erection_cost), electrical_cost: n(form.electrical_cost),
      piping_cost: n(form.piping_cost), commissioning_cost: n(form.commissioning_cost),
      others_cost: n(form.others_cost), margin_pct: n(form.margin_pct),
      discount_pct: n(form.discount_pct), gst_pct: n(form.gst_pct),
      notes: form.notes || null, status: form.status,
    };
    try {
      const url = editing ? `${BASE}/api/cost-working/${editing.id}` : `${BASE}/api/cost-working`;
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      toast({ title: editing ? "Quote updated" : "Quote saved" });
      setOpen(false);
      load();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    await fetch(`${BASE}/api/cost-working/${id}`, { method: "DELETE" });
    load();
  }

  function setF<K extends keyof FormState>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function costField(k: keyof FormState, label: string) {
    return (
      <div>
        <Label className="text-xs text-slate-400">{label}</Label>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
          <Input
            type="number"
            step="any"
            value={form[k] as string}
            onChange={e => setF(k, e.target.value)}
            className="pl-7 bg-slate-800 border-slate-700 h-8 text-sm"
          />
        </div>
      </div>
    );
  }

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return !q || r.quote_no.toLowerCase().includes(q) || r.project_name.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            Cost Working Tool
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Proposal pricing — cost + margin = selling price</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Quote
        </Button>
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search quotes…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-sm"
        />
      </div>

      <div className="rounded-xl border border-slate-700/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/60 border-slate-700/60">
              <TableHead className="text-slate-400 text-xs">Quote No.</TableHead>
              <TableHead className="text-slate-400 text-xs">Project</TableHead>
              <TableHead className="text-slate-400 text-xs">Customer</TableHead>
              <TableHead className="text-slate-400 text-xs">Date</TableHead>
              <TableHead className="text-slate-400 text-xs">Base Cost</TableHead>
              <TableHead className="text-slate-400 text-xs">Margin</TableHead>
              <TableHead className="text-slate-400 text-xs">Price (ex-GST)</TableHead>
              <TableHead className="text-slate-400 text-xs">Total (incl. GST)</TableHead>
              <TableHead className="text-slate-400 text-xs">Status</TableHead>
              <TableHead className="text-slate-400 text-xs w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-slate-500">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-10 text-slate-500">No quotes found</TableCell></TableRow>
            ) : filtered.map(r => {
              const s = calcFromRecord(r);
              return (
                <TableRow key={r.id} className="border-slate-700/40 hover:bg-slate-800/40 cursor-pointer" onClick={() => setDetailId(r.id)}>
                  <TableCell className="font-mono text-cyan-400 text-xs">{r.quote_no}</TableCell>
                  <TableCell className="font-medium text-white text-sm">{r.project_name}</TableCell>
                  <TableCell className="text-slate-300 text-sm">{r.customer}</TableCell>
                  <TableCell className="text-slate-300 text-sm">{r.date?.slice(0, 10)}</TableCell>
                  <TableCell className="text-slate-300 text-sm">{inr(s.baseCost)}</TableCell>
                  <TableCell className="text-emerald-400 text-sm">{r.margin_pct}%</TableCell>
                  <TableCell className="font-semibold text-white text-sm">{inr(s.priceAfterDiscount)}</TableCell>
                  <TableCell className="font-semibold text-sky-300 text-sm">{inr(s.totalPrice)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-slate-700 text-slate-300"}`}>
                      {r.status}
                    </span>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail panel */}
      {detailRecord && detailSummary && (
        <div className="fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <p className="font-semibold text-white text-sm">{detailRecord.quote_no}</p>
            <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-white text-sm px-1">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div><p className="text-xs text-slate-400">Project</p><p className="text-white text-sm font-medium">{detailRecord.project_name}</p></div>
            <div><p className="text-xs text-slate-400">Customer</p><p className="text-white text-sm">{detailRecord.customer}</p></div>
            {(detailRecord.plant_type || detailRecord.capacity) && (
              <div><p className="text-xs text-slate-400">Plant Type / Capacity</p><p className="text-white text-sm">{[detailRecord.plant_type, detailRecord.capacity].filter(Boolean).join(" — ")}</p></div>
            )}
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost Breakdown</p>
              {([
                ["Equipment", detailRecord.equipment_cost],
                ["Civil", detailRecord.civil_cost],
                ["Erection", detailRecord.erection_cost],
                ["Electrical", detailRecord.electrical_cost],
                ["Piping", detailRecord.piping_cost],
                ["Commissioning", detailRecord.commissioning_cost],
                ["Others", detailRecord.others_cost],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{label}</span>
                  <span className="text-slate-200">{inr(Number(val))}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-semibold border-t border-slate-700 pt-2">
                <span className="text-slate-300">Base Cost</span>
                <span className="text-white">{inr(detailSummary.baseCost)}</span>
              </div>
            </div>
            <div className="border-t border-slate-700 pt-3 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pricing</p>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Margin ({detailRecord.margin_pct}%)</span>
                <span className="text-emerald-400">+{inr(detailSummary.margin)}</span>
              </div>
              {Number(detailRecord.discount_pct) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Discount ({detailRecord.discount_pct}%)</span>
                  <span className="text-rose-400">-{inr(detailSummary.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-slate-300">Price (ex-GST)</span>
                <span className="text-white">{inr(detailSummary.priceAfterDiscount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">GST ({detailRecord.gst_pct}%)</span>
                <span className="text-slate-200">+{inr(detailSummary.gst)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold bg-emerald-500/10 rounded p-2 border border-emerald-500/20">
                <span className="text-emerald-300">Total (incl. GST)</span>
                <span className="text-emerald-300">{inr(detailSummary.totalPrice)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Gross Margin %</span>
                <span className="text-sky-400">{detailSummary.grossMarginPct.toFixed(1)}%</span>
              </div>
            </div>
            {detailRecord.notes && (
              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-300">{detailRecord.notes}</p>
              </div>
            )}
            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 gap-1.5" onClick={() => { openEdit(detailRecord); setDetailId(null); }}>
              <Pencil className="w-3.5 h-3.5" /> Edit Quote
            </Button>
          </div>
        </div>
      )}

      {/* New/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              {editing ? "Edit Quote" : "New Cost Working"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Project Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Quote No. *</Label>
                  <Input value={form.quote_no} onChange={e => setF("quote_no", e.target.value)} placeholder="e.g. CWT-2026-001" className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm font-mono" />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Date</Label>
                  <Input type="date" value={form.date} onChange={e => setF("date", e.target.value)} className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-slate-400">Project Name *</Label>
                  <Input value={form.project_name} onChange={e => setF("project_name", e.target.value)} placeholder="e.g. 100 KLD STP for XYZ Township" className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Customer *</Label>
                  <Input value={form.customer} onChange={e => setF("customer", e.target.value)} placeholder="Customer name" className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Status</Label>
                  <Select value={form.status} onValueChange={v => setF("status", v)}>
                    <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {["Draft", "Under Review", "Approved", "Sent", "Won", "Lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Plant Type</Label>
                  <Input value={form.plant_type} onChange={e => setF("plant_type", e.target.value)} placeholder="e.g. STP MBR, RO" className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Capacity</Label>
                  <Input value={form.capacity} onChange={e => setF("capacity", e.target.value)} placeholder="e.g. 100 KLD" className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5" /> Cost Components (₹)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {costField("equipment_cost", "Equipment")}
                {costField("civil_cost", "Civil Works")}
                {costField("erection_cost", "Erection")}
                {costField("electrical_cost", "Electrical")}
                {costField("piping_cost", "Piping")}
                {costField("commissioning_cost", "Commissioning")}
                {costField("others_cost", "Others")}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Pricing & Margin
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Margin %</Label>
                  <Input type="number" step="any" value={form.margin_pct} onChange={e => setF("margin_pct", e.target.value)} className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Discount %</Label>
                  <Input type="number" step="any" value={form.discount_pct} onChange={e => setF("discount_pct", e.target.value)} className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">GST %</Label>
                  <Input type="number" step="any" value={form.gst_pct} onChange={e => setF("gst_pct", e.target.value)} className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm" />
                </div>
              </div>

              {/* Live preview */}
              <div className="mt-4 bg-slate-800/60 border border-slate-700/60 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Price Preview</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between border-b border-slate-700 pb-2">
                    <span className="text-slate-400">Base Cost</span>
                    <span className="text-white font-medium">{inr(summary.baseCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">+ Margin ({form.margin_pct}%)</span>
                    <span className="text-emerald-400">+{inr(summary.margin)}</span>
                  </div>
                  {n(form.discount_pct) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">- Discount ({form.discount_pct}%)</span>
                      <span className="text-rose-400">-{inr(summary.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">+ GST ({form.gst_pct}%)</span>
                    <span className="text-slate-200">+{inr(summary.gst)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-700 pt-2 font-bold">
                    <span className="text-emerald-300">Total (incl. GST)</span>
                    <span className="text-emerald-300 text-base">{inr(summary.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Effective Gross Margin</span>
                    <span className="text-sky-400">{summary.grossMarginPct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-400">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setF("notes", e.target.value)}
                placeholder="Assumptions, exclusions, special conditions…"
                className="mt-1 bg-slate-800 border-slate-700 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400">Cancel</Button>
            <Button
              onClick={save}
              disabled={!form.quote_no || !form.project_name || !form.customer || saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Saving…" : editing ? "Update" : "Save Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
