import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, Package, Download } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ROItem {
  id: number;
  item_code: string;
  item_name: string;
  category: string;
  make: string | null;
  model: string | null;
  specifications: string | null;
  unit: string;
  standard_qty: number | null;
  unit_rate: number | null;
  remarks: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  "Membrane", "Pressure Vessel", "High Pressure Pump", "Cartridge Filter",
  "Multimedia Filter", "Activated Carbon Filter", "Antiscalant Dosing",
  "Chemical Dosing", "Instrumentation", "Control Panel",
  "Piping & Valves", "RO Frame & Skid", "UV System", "Softener", "Other",
];

const EMPTY = {
  item_code: "", item_name: "", category: "Membrane",
  make: "", model: "", specifications: "",
  unit: "No.", standard_qty: "", unit_rate: "", remarks: "",
};
type FormState = typeof EMPTY;

function catColor(cat: string) {
  const map: Record<string, string> = {
    "Membrane": "bg-blue-500/20 text-blue-300",
    "Pressure Vessel": "bg-indigo-500/20 text-indigo-300",
    "High Pressure Pump": "bg-rose-500/20 text-rose-300",
    "Cartridge Filter": "bg-amber-500/20 text-amber-300",
    "Multimedia Filter": "bg-teal-500/20 text-teal-300",
    "Control Panel": "bg-violet-500/20 text-violet-300",
    "Instrumentation": "bg-cyan-500/20 text-cyan-300",
  };
  return map[cat] ?? "bg-slate-700 text-slate-300";
}

export default function ROStandardItems() {
  const { toast } = useToast();
  const [items, setItems] = useState<ROItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ROItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/api/ro-standard-items`);
      setItems(await r.json());
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

  function openEdit(item: ROItem) {
    setEditing(item);
    setForm({
      item_code: item.item_code,
      item_name: item.item_name,
      category: item.category,
      make: item.make ?? "",
      model: item.model ?? "",
      specifications: item.specifications ?? "",
      unit: item.unit,
      standard_qty: item.standard_qty != null ? String(item.standard_qty) : "",
      unit_rate: item.unit_rate != null ? String(item.unit_rate) : "",
      remarks: item.remarks ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.item_code || !form.item_name) return;
    setSaving(true);
    const body = {
      item_code: form.item_code,
      item_name: form.item_name,
      category: form.category,
      make: form.make || null,
      model: form.model || null,
      specifications: form.specifications || null,
      unit: form.unit,
      standard_qty: form.standard_qty !== "" ? Number(form.standard_qty) : null,
      unit_rate: form.unit_rate !== "" ? Number(form.unit_rate) : null,
      remarks: form.remarks || null,
    };
    try {
      const url = editing ? `${BASE}/api/ro-standard-items/${editing.id}` : `${BASE}/api/ro-standard-items`;
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Save failed");
      }
      toast({ title: editing ? "Item updated" : "Item added" });
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: e.message ?? "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function del(id: number) {
    await fetch(`${BASE}/api/ro-standard-items/${id}`, { method: "DELETE" });
    load();
  }

  function setF<K extends keyof FormState>(k: K, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function exportCSV() {
    const header = ["Item Code", "Name", "Category", "Make", "Model", "Specifications", "Unit", "Std Qty", "Unit Rate", "Remarks"];
    const rows = filtered.map(i => [
      i.item_code, i.item_name, i.category, i.make ?? "", i.model ?? "",
      i.specifications ?? "", i.unit, i.standard_qty ?? "", i.unit_rate ?? "", i.remarks ?? "",
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "ro-standard-items.csv";
    a.click();
  }

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.item_name.toLowerCase().includes(q) || i.item_code.toLowerCase().includes(q) || (i.make ?? "").toLowerCase().includes(q);
    const matchCat = catFilter === "All" || i.category === catFilter;
    return matchSearch && matchCat;
  });

  const cats = ["All", ...CATEGORIES];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            RO Standard Items
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Standard components & parts catalogue for RO systems</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCSV} className="border-slate-700 text-slate-300 hover:text-white gap-1.5 h-9">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
          <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-slate-800 border-slate-700 text-sm h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {cats.slice(0, 8).map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${catFilter === c ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}
            >
              {c}
            </button>
          ))}
          {cats.length > 8 && (
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="h-7 text-xs bg-slate-800 border-slate-700 w-32">
                <SelectValue placeholder="More…" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {cats.slice(8).map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {[["Total Items", items.length], ["Showing", filtered.length], ["Categories", new Set(items.map(i => i.category)).size]].map(([label, val]) => (
          <div key={label as string} className="bg-slate-800/60 border border-slate-700/60 rounded-lg px-4 py-2">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="text-lg font-semibold text-white">{val}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-700/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-800/60 border-slate-700/60">
              <TableHead className="text-slate-400 text-xs">Item Code</TableHead>
              <TableHead className="text-slate-400 text-xs">Name</TableHead>
              <TableHead className="text-slate-400 text-xs">Category</TableHead>
              <TableHead className="text-slate-400 text-xs">Make / Model</TableHead>
              <TableHead className="text-slate-400 text-xs">Specifications</TableHead>
              <TableHead className="text-slate-400 text-xs">Unit</TableHead>
              <TableHead className="text-slate-400 text-xs">Std Qty</TableHead>
              <TableHead className="text-slate-400 text-xs">Unit Rate (₹)</TableHead>
              <TableHead className="text-slate-400 text-xs w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-500">No items found</TableCell></TableRow>
            ) : filtered.map(item => (
              <TableRow key={item.id} className="border-slate-700/40 hover:bg-slate-800/40">
                <TableCell className="text-cyan-400 font-mono text-xs">{item.item_code}</TableCell>
                <TableCell className="font-medium text-white text-sm">{item.item_name}</TableCell>
                <TableCell>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${catColor(item.category)}`}>
                    {item.category}
                  </span>
                </TableCell>
                <TableCell className="text-slate-300 text-sm">{[item.make, item.model].filter(Boolean).join(" / ") || "—"}</TableCell>
                <TableCell className="text-slate-400 text-xs max-w-[180px] truncate">{item.specifications ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{item.unit}</TableCell>
                <TableCell className="text-slate-300 text-sm">{item.standard_qty ?? "—"}</TableCell>
                <TableCell className="text-slate-300 text-sm">{item.unit_rate != null ? `₹${Number(item.unit_rate).toLocaleString("en-IN")}` : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-white" onClick={() => openEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => del(item.id)}>
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
        <DialogContent className="bg-slate-900 border-slate-700 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit Item" : "Add RO Standard Item"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Item Code *</Label>
                <Input
                  value={form.item_code}
                  onChange={e => setF("item_code", e.target.value)}
                  placeholder="e.g. MEM-4040-BW30"
                  className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm font-mono"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Category</Label>
                <Select value={form.category} onValueChange={v => setF("category", v)}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-400">Item Name *</Label>
              <Input
                value={form.item_name}
                onChange={e => setF("item_name", e.target.value)}
                placeholder="e.g. RO Membrane 4040 BW30-400"
                className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Make / Brand</Label>
                <Input
                  value={form.make}
                  onChange={e => setF("make", e.target.value)}
                  placeholder="e.g. Filmtec, Hydranautics"
                  className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Model</Label>
                <Input
                  value={form.model}
                  onChange={e => setF("model", e.target.value)}
                  placeholder="e.g. BW30-400"
                  className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-400">Specifications</Label>
              <Textarea
                value={form.specifications}
                onChange={e => setF("specifications", e.target.value)}
                placeholder="e.g. 4 inch x 40 inch, 400 GPD, 99.5% rejection, 300 psi max"
                className="mt-1 bg-slate-800 border-slate-700 text-sm resize-none"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Unit</Label>
                <Select value={form.unit} onValueChange={v => setF("unit", v)}>
                  <SelectTrigger className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {["No.", "Set", "Meter", "Kg", "Litre", "Lot"].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-400">Standard Qty</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.standard_qty}
                  onChange={e => setF("standard_qty", e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-slate-400">Unit Rate (₹)</Label>
                <Input
                  type="number"
                  step="any"
                  value={form.unit_rate}
                  onChange={e => setF("unit_rate", e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-slate-400">Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={e => setF("remarks", e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-sm resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400">Cancel</Button>
            <Button
              onClick={save}
              disabled={!form.item_code || !form.item_name || saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {saving ? "Saving…" : editing ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
