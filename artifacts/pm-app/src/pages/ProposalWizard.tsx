import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  Building2, Droplets, ChevronLeft, ChevronRight, CheckCircle2,
  Download, Send, Loader2, FileSpreadsheet, FileText, Mail,
  User, Phone, MessageSquare, ArrowLeft, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

type Step = 1 | 2 | 3;

interface FileInfo {
  filename: string;
  label: string;
  ext: string;
}

function FileIcon({ ext }: { ext: string }) {
  if (ext === "XLSX" || ext === "XLS") {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  return <FileText className="w-5 h-5 text-blue-600" />;
}

function FileCard({
  file,
  flowRate,
  customerName,
  onDownload,
}: {
  file: FileInfo;
  flowRate: string;
  customerName: string;
  onDownload: (f: FileInfo) => void;
}) {
  const renamedFilename = file.filename.replace(/COMPANY NAME/gi, customerName.toUpperCase().trim() || "CUSTOMER");

  const bgColor = file.label === "Technical Spec"
    ? "bg-emerald-50 border-emerald-200"
    : file.label === "OPEX"
    ? "bg-amber-50 border-amber-200"
    : "bg-blue-50 border-blue-200";

  const badgeColor = file.label === "Technical Spec"
    ? "bg-emerald-100 text-emerald-700"
    : file.label === "OPEX"
    ? "bg-amber-100 text-amber-700"
    : "bg-blue-100 text-blue-700";

  return (
    <div className={cn("rounded-2xl border p-4 flex items-start gap-3", bgColor)}>
      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
        <FileIcon ext={file.ext} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", badgeColor)}>
            {file.label}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">{file.ext}</span>
        </div>
        <p className="text-xs text-gray-700 font-medium leading-tight break-all">{renamedFilename}</p>
      </div>
      <button
        onClick={() => onDownload(file)}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </button>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Customer Details" },
    { n: 2, label: "Select Flow Rate" },
    { n: 3, label: "Files & Send" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
              step > s.n ? "bg-green-500 border-green-500 text-white"
                : step === s.n ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-gray-300 text-gray-400"
            )}>
              {step > s.n ? <Check className="w-4 h-4" /> : s.n}
            </div>
            <span className={cn("text-[11px] font-medium whitespace-nowrap", step === s.n ? "text-indigo-600" : "text-gray-400")}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={cn("w-16 h-0.5 mb-4 mx-1 transition-all", step > s.n ? "bg-green-400" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ProposalWizard() {
  const [step, setStep] = useState<Step>(1);
  const [customerName, setCustomerName] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [toName, setToName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [flowRates, setFlowRates] = useState<string[]>([]);
  const [selectedFlowRate, setSelectedFlowRate] = useState("");
  const [loadingRates, setLoadingRates] = useState(false);

  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setLoadingRates(true);
    fetch(`${API}/proposal-wizard/flow-rates`)
      .then((r) => r.json())
      .then((d) => setFlowRates(d.flowRates || []))
      .catch(() => {})
      .finally(() => setLoadingRates(false));
  }, []);

  useEffect(() => {
    if (!selectedFlowRate) return;
    setLoadingFiles(true);
    setFiles([]);
    fetch(`${API}/proposal-wizard/files?flowRate=${encodeURIComponent(selectedFlowRate)}`)
      .then((r) => r.json())
      .then((d) => setFiles(d.files || []))
      .catch(() => {})
      .finally(() => setLoadingFiles(false));
  }, [selectedFlowRate]);

  const canNext = () => {
    if (step === 1) return customerName.trim().length > 0;
    if (step === 2) return selectedFlowRate !== "";
    return true;
  };

  const handleDownload = (file: FileInfo) => {
    const url = `${API}/proposal-wizard/download?`
      + `flowRate=${encodeURIComponent(selectedFlowRate)}`
      + `&filename=${encodeURIComponent(file.filename)}`
      + `&customerName=${encodeURIComponent(customerName)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.filename.replace(/COMPANY NAME/gi, customerName.toUpperCase().trim());
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    files.forEach((f, i) => {
      setTimeout(() => handleDownload(f), i * 400);
    });
  };

  const handleSend = async () => {
    if (!toEmail.trim()) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(`${API}/proposal-wizard/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowRate: selectedFlowRate,
          customerName,
          toEmail: toEmail.trim(),
          toName: toName.trim() || customerName,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSendResult({ ok: true, msg: `Email sent to ${toEmail}` });
    } catch (e: any) {
      setSendResult({ ok: false, msg: e.message });
    } finally {
      setSending(false);
    }
  };

  function kldLabel(folder: string) {
    const match = folder.match(/(\d+)\s*KLD/i);
    return match ? `${match[1]} KLD` : folder;
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Proposal Wizard</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and send Bangladesh proposal documents for a customer</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <StepIndicator step={step} />

          {/* ── Step 1: Customer Details ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Customer Details</h2>
                <p className="text-sm text-gray-500 mt-1">Enter the customer name — it will appear in all file names</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Customer / Company Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. ABC Garments Ltd"
                    className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Person</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={toName}
                    onChange={(e) => setToName(e.target.value)}
                    placeholder="Full name"
                    className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email (for sending)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      placeholder="customer@company.com"
                      className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+88017..."
                      className="w-full pl-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requirements or message for the email..."
                    rows={3}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Flow Rate Selection ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Select Flow Rate</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Preparing proposal for <span className="font-semibold text-indigo-600">{customerName}</span>
                </p>
              </div>

              {loadingRates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {flowRates.map((fr) => (
                    <button
                      key={fr}
                      onClick={() => setSelectedFlowRate(fr)}
                      className={cn(
                        "relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 font-semibold transition-all",
                        selectedFlowRate === fr
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md"
                          : "border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/30"
                      )}
                    >
                      {selectedFlowRate === fr && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        selectedFlowRate === fr ? "bg-indigo-100" : "bg-gray-100"
                      )}>
                        <Droplets className={cn("w-5 h-5", selectedFlowRate === fr ? "text-indigo-600" : "text-gray-500")} />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-bold">{kldLabel(fr)}</p>
                        <p className="text-[11px] text-gray-400 font-normal">STP</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedFlowRate && (
                <div className="mt-3 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  Selected: <strong>{selectedFlowRate}</strong>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Files & Send ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-gray-900">Files & Send</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-semibold text-indigo-600">{customerName}</span> · <span className="font-semibold text-gray-700">{selectedFlowRate}</span>
                </p>
              </div>

              {loadingFiles ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No files found for this flow rate.</div>
              ) : (
                <div className="space-y-3">
                  {files.map((f) => (
                    <FileCard
                      key={f.filename}
                      file={f}
                      flowRate={selectedFlowRate}
                      customerName={customerName}
                      onDownload={handleDownload}
                    />
                  ))}

                  <button
                    onClick={handleDownloadAll}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors mt-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All 3 Files
                  </button>
                </div>
              )}

              {/* Email send section */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  Send via Email
                </p>

                {!toEmail ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                    No email address entered. Go back to Step 1 to add a customer email.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600">Sending to: <strong className="text-gray-800">{toEmail}</strong></span>
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-colors"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {sending ? "Sending…" : "Send All Files to Customer"}
                    </button>

                    {sendResult && (
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm",
                        sendResult.ok
                          ? "bg-green-50 border border-green-200 text-green-700"
                          : "bg-red-50 border border-red-200 text-red-700"
                      )}>
                        {sendResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : null}
                        {sendResult.msg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={() => setStep((s) => (s > 1 ? (s - 1) as Step : s))}
              disabled={step === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-0 transition"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={!canNext()}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => { setStep(1); setCustomerName(""); setSelectedFlowRate(""); setFiles([]); setSendResult(null); setToEmail(""); setToName(""); setPhone(""); setNotes(""); }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-50 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                New Proposal
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
