import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fetchErpNextSiteTickets } from "../lib/erpnext";

const ERP_URL = (process.env.ERPNEXT_URL || "https://erp.wttint.com").replace(/\/$/, "");
const ERP_AUTH = () => `token ${process.env.ERPNEXT_API_KEY || ""}:${process.env.ERPNEXT_API_SECRET || ""}`;

const router = Router();

// ─── PDF Helpers ──────────────────────────────────────────────────────────────

const NAVY  = "#1e3a5f";
const LIGHT = "#f1f5f9";
const MUTED = "#64748b";
const DARK  = "#1e293b";
const W     = 515;
const L     = 40;

function fmtDTPdf(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDatePdf(s?: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function pdfBuf(fn: (doc: InstanceType<typeof PDFDocument>, addY: (n: number) => void, getY: () => number) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new (PDFDocument as any)({ size: "A4", margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    let y = 40;
    const addY = (n: number) => { y += n; };
    const getY = () => y;
    fn(doc, addY, getY);
    doc.end();
  });
}

function secHeader(doc: any, title: string, y: number): number {
  doc.rect(L, y, W, 16).fill("#dbeafe");
  doc.fillColor(NAVY).fontSize(7).font("Helvetica-Bold")
     .text(title.toUpperCase(), L + 6, y + 4, { width: W - 12 });
  return y + 20;
}

function labelVal(doc: any, label: string, value: string, x: number, y: number, colW: number) {
  doc.fillColor(MUTED).fontSize(7).font("Helvetica").text(label, x, y, { width: colW, lineBreak: false });
  doc.fillColor(DARK).fontSize(8.5).font("Helvetica-Bold").text(value || "—", x, y + 9, { width: colW });
}

function textSection(doc: any, title: string, value: string, y: number): number {
  y = secHeader(doc, title, y);
  if (value && value.trim()) {
    doc.fillColor(DARK).fontSize(8.5).font("Helvetica")
       .text(value.trim(), L + 6, y, { width: W - 12 });
    y = doc.y + 8;
  } else {
    doc.fillColor(MUTED).fontSize(8).font("Helvetica").text("—", L + 6, y);
    y = doc.y + 8;
  }
  return y;
}

function checkPageBreak(doc: any, y: number, needed = 40): number {
  if (y + needed > doc.page.height - 60) {
    doc.addPage({ size: "A4", margin: 0 });
    return 40;
  }
  return y;
}

function pdfFooter(doc: any) {
  const ph = doc.page.height;
  doc.rect(L, ph - 36, W, 26).fill("#f8fafc");
  doc.fillColor("#94a3b8").fontSize(7).font("Helvetica")
     .text("WTT International  ·  PLC & Automation  ·  Water Loving Technology", L, ph - 29, { width: W, align: "center" });
  doc.fillColor("#cbd5e1").fontSize(7)
     .text(`Generated: ${fmtDatePdf(new Date().toISOString())}`, L, ph - 20, { width: W, align: "center" });
}

async function buildSiteCallPDF(call: any): Promise<Buffer> {
  return pdfBuf((doc) => {
    const callNo   = call.call_no || `OSC-${String(call.id).padStart(4, "0")}`;
    const attended = Array.isArray(call.attended_by) ? call.attended_by.map((e: any) => e.name).join(", ") : "";
    const spares   = Array.isArray(call.spares_changed) ? call.spares_changed.filter((s: any) => s.part_name?.trim()) : [];

    // ── Header ────────────────────────────────────────────────────────
    doc.rect(L, 30, W, 72).fill(NAVY);
    doc.fillColor("white").fontSize(18).font("Helvetica-Bold").text("WTT INTERNATIONAL", L + 14, 42);
    doc.fillColor("#93c5fd").fontSize(8).font("Helvetica").text("Water Loving Technology", L + 14, 64);
    doc.fillColor("#93c5fd").fontSize(7.5).text("ONLINE SUPPORT CALL REPORT", L + 14, 76);
    doc.fillColor("white").fontSize(13).font("Helvetica-Bold")
       .text(callNo, L, 42, { width: W - 14, align: "right" });
    doc.fillColor("#93c5fd").fontSize(7.5).font("Helvetica")
       .text(fmtDatePdf(call.call_received_at || call.created_at), L, 64, { width: W - 14, align: "right" });
    const statusColor = call.status === "Closed" ? "#86efac" : call.status === "In Progress" ? "#fde68a" : "#fca5a5";
    doc.fillColor(statusColor).fontSize(7.5).font("Helvetica-Bold")
       .text(call.status || "Open", L, 76, { width: W - 14, align: "right" });

    let y = 116;

    // ── Project ───────────────────────────────────────────────────────
    y = secHeader(doc, "Project & Status", y);
    labelVal(doc, "Project No.",  call.project_number || "—", L + 6,  y, 150);
    labelVal(doc, "Project Name", call.project_name   || "—", L + 165, y, 220);
    labelVal(doc, "Status",       call.status || "Open",      L + 395, y, 126);
    y += 30;

    // ── Team ──────────────────────────────────────────────────────────
    y = secHeader(doc, "Team & Contact", y);
    labelVal(doc, "Site Coordinator", call.site_coordinator_name  || "—", L + 6,   y, 155);
    labelVal(doc, "Contact Number",   call.site_coordinator_phone || "—", L + 170, y, 155);
    labelVal(doc, "Attended By",      attended || "—",                     L + 334, y, 187);
    y += 30;

    // ── Timing ────────────────────────────────────────────────────────
    y = secHeader(doc, "Timing", y);
    labelVal(doc, "Call Received",  fmtDTPdf(call.call_received_at),  L + 6,   y, 160);
    labelVal(doc, "Work Started",   fmtDTPdf(call.work_started_at),   L + 180, y, 160);
    labelVal(doc, "Work Completed", fmtDTPdf(call.work_completed_at), L + 356, y, 165);
    y += 30;

    // ── Issue ─────────────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 60);
    y = textSection(doc, "Customer Complaint", call.issue_details, y);

    // ── Action ────────────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 60);
    y = textSection(doc, "Solution — Action Taken", call.action_taken, y);

    // ── Root Cause ────────────────────────────────────────────────────
    if (call.root_cause) {
      y = checkPageBreak(doc, y, 50);
      y = textSection(doc, "Root Cause", call.root_cause, y);
    }

    // ── Spares ────────────────────────────────────────────────────────
    if (spares.length > 0) {
      y = checkPageBreak(doc, y, 40 + spares.length * 16);
      y = secHeader(doc, "Spares / Parts Changed", y);
      doc.rect(L, y, W, 14).fill("#e2e8f0");
      ["#", "Part Name", "Part No.", "Qty", "Remarks"].forEach((h, i) => {
        const xs = [L+4, L+20, L+200, L+295, L+340];
        const ws = [16, 178, 90, 40, 180];
        doc.fillColor(MUTED).fontSize(7).font("Helvetica-Bold").text(h, xs[i], y + 3, { width: ws[i], lineBreak: false });
      });
      y += 14;
      spares.forEach((s: any, i: number) => {
        if (i % 2 === 0) doc.rect(L, y, W, 14).fill("#f8fafc");
        const xs = [L+4, L+20, L+200, L+295, L+340];
        const ws = [16, 178, 90, 40, 180];
        [String(i+1), s.part_name||"", s.part_no||"", s.qty||"", s.remarks||""].forEach((v, j) => {
          doc.fillColor(DARK).fontSize(8).font("Helvetica").text(v, xs[j], y + 3, { width: ws[j], lineBreak: false });
        });
        y += 14;
      });
      y += 8;
    }

    // ── Remarks ───────────────────────────────────────────────────────
    if (call.remarks) {
      y = checkPageBreak(doc, y, 50);
      y = textSection(doc, "Remarks", call.remarks, y);
    }

    pdfFooter(doc);
  });
}

async function buildServiceReportPDF(report: any): Promise<Buffer> {
  return pdfBuf((doc) => {
    const reportNo  = report.report_no || `SR-${String(report.id).padStart(4, "0")}`;
    const attended  = Array.isArray(report.attended_by)    ? report.attended_by.map((e: any)    => e.name).join(", ") : "";
    const elecTeam  = Array.isArray(report.electrical_team)? report.electrical_team.map((e: any) => e.name).join(", ") : "";
    const checklist = Array.isArray(report.plc_checklist)  ? report.plc_checklist  : [];
    const spares    = Array.isArray(report.spares_changed) ? report.spares_changed.filter((s: any) => s.part_name?.trim()) : [];
    const checked   = checklist.filter((c: any) => c.checked).length;

    // ── Header ────────────────────────────────────────────────────────
    doc.rect(L, 30, W, 80).fill(NAVY);
    doc.fillColor("white").fontSize(18).font("Helvetica-Bold").text("WTT INTERNATIONAL", L + 14, 42);
    doc.fillColor("#93c5fd").fontSize(8).font("Helvetica").text("Water Loving Technology", L + 14, 64);
    doc.fillColor("white").fontSize(14).font("Helvetica-Bold").text("SITE SERVICE REPORT", L + 14, 78);
    doc.fillColor("white").fontSize(13).font("Helvetica-Bold")
       .text(reportNo, L, 42, { width: W - 14, align: "right" });
    doc.fillColor("#93c5fd").fontSize(7.5).font("Helvetica")
       .text(fmtDatePdf(report.call_received_at || report.created_at), L, 64, { width: W - 14, align: "right" });
    const statusColor = report.status === "Closed" ? "#86efac" : report.status === "In Progress" ? "#fde68a" : "#fca5a5";
    doc.fillColor(statusColor).fontSize(7.5).font("Helvetica-Bold")
       .text(report.status || "Open", L, 78, { width: W - 14, align: "right" });

    let y = 126;

    // ── Project ───────────────────────────────────────────────────────
    y = secHeader(doc, "Project & Status", y);
    labelVal(doc, "Project No.",  report.project_number || "—", L + 6,   y, 150);
    labelVal(doc, "Project Name", report.project_name   || "—", L + 165, y, 220);
    labelVal(doc, "Status",       report.status || "Open",      L + 395, y, 126);
    y += 30;

    // ── Team & Contact ────────────────────────────────────────────────
    y = secHeader(doc, "Site Coordination & Team", y);
    labelVal(doc, "Site Coordinator", report.site_coordinator_name  || "—", L + 6,   y, 155);
    labelVal(doc, "Contact Number",   report.site_coordinator_phone || "—", L + 170, y, 155);
    labelVal(doc, "Attended By",      attended || "—",                       L + 334, y, 187);
    y += 30;

    // ── Timing ────────────────────────────────────────────────────────
    y = secHeader(doc, "Timing Details", y);
    const timings = [
      ["Call Received",  report.call_received_at],
      ["Departed Office",report.departed_at],
      ["Arrived at Site",report.arrived_site_at],
      ["Work Started",   report.work_started_at],
    ];
    timings.forEach(([label, val], i) => {
      labelVal(doc, label, fmtDTPdf(val), L + 6 + i * 128, y, 124);
    });
    y += 30;
    const timings2 = [
      ["Work Completed",  report.work_completed_at],
      ["Departed Site",   report.departed_site_at],
      ["Arrived Back",    report.arrived_back_at],
    ];
    timings2.forEach(([label, val], i) => {
      labelVal(doc, label, fmtDTPdf(val), L + 6 + i * 170, y, 166);
    });
    y += 30;

    // ── Issue & Service ───────────────────────────────────────────────
    y = checkPageBreak(doc, y, 80);
    y = secHeader(doc, "Customer Complaint & Service Details", y);
    doc.fillColor(MUTED).fontSize(7).font("Helvetica").text("Customer Complaint", L + 6, y);
    doc.fillColor(MUTED).fontSize(7).font("Helvetica").text("Service / Work Done", L + W/2 + 6, y);
    y += 10;
    const issueText   = (report.issue_details   || "—").trim();
    const serviceText = (report.service_details || "—").trim();
    const halfW = W/2 - 12;
    const startY = y;
    doc.fillColor(DARK).fontSize(8.5).font("Helvetica").text(issueText,   L + 6,       y, { width: halfW });
    const leftEnd = doc.y;
    doc.fillColor(DARK).fontSize(8.5).font("Helvetica").text(serviceText, L + W/2 + 6, startY, { width: halfW });
    const rightEnd = doc.y;
    y = Math.max(leftEnd, rightEnd) + 10;

    // ── Resolution ────────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 60);
    y = secHeader(doc, "Root Cause & Action Taken", y);
    doc.fillColor(MUTED).fontSize(7).font("Helvetica").text("Root Cause",  L + 6,       y);
    doc.fillColor(MUTED).fontSize(7).font("Helvetica").text("Action Taken", L + W/2 + 6, y);
    y += 10;
    const rcText  = (report.root_cause   || "—").trim();
    const atText  = (report.action_taken || "—").trim();
    const startY2 = y;
    doc.fillColor(DARK).fontSize(8.5).font("Helvetica").text(rcText, L + 6,       y, { width: halfW });
    const le2 = doc.y;
    doc.fillColor(DARK).fontSize(8.5).font("Helvetica").text(atText, L + W/2 + 6, startY2, { width: halfW });
    const re2 = doc.y;
    y = Math.max(le2, re2) + 10;

    // ── Engineer Suggestions ──────────────────────────────────────────
    if (report.engineer_suggestions) {
      y = checkPageBreak(doc, y, 50);
      y = textSection(doc, "Engineer Suggestions", report.engineer_suggestions, y);
    }

    // ── PLC Checklist ─────────────────────────────────────────────────
    if (checklist.length > 0) {
      const rowsNeeded = Math.ceil(checklist.length / 2) * 14 + 30;
      y = checkPageBreak(doc, y, rowsNeeded);
      y = secHeader(doc, `PLC Points Checklist  (${checked}/${checklist.length} verified)`, y);
      const half = Math.ceil(checklist.length / 2);
      for (let i = 0; i < half; i++) {
        y = checkPageBreak(doc, y, 14);
        const left  = checklist[i];
        const right = checklist[i + half];
        const rowColor = i % 2 === 0 ? "#f8fafc" : "white";
        doc.rect(L, y, W/2, 14).fill(rowColor);
        if (right) doc.rect(L + W/2, y, W/2, 14).fill(rowColor);
        const tickL = left.checked  ? "✓" : "○";
        const tickR = right?.checked ? "✓" : "○";
        doc.fillColor(left.checked  ? "#16a34a" : "#94a3b8").fontSize(9).font("Helvetica-Bold")
           .text(tickL, L + 5, y + 3, { width: 12, lineBreak: false });
        doc.fillColor(DARK).fontSize(7.5).font("Helvetica")
           .text(left.label, L + 20, y + 4, { width: W/2 - 26, lineBreak: false });
        if (right) {
          doc.fillColor(right.checked ? "#16a34a" : "#94a3b8").fontSize(9).font("Helvetica-Bold")
             .text(tickR, L + W/2 + 5, y + 3, { width: 12, lineBreak: false });
          doc.fillColor(DARK).fontSize(7.5).font("Helvetica")
             .text(right.label, L + W/2 + 20, y + 4, { width: W/2 - 26, lineBreak: false });
        }
        y += 14;
      }
      y += 8;
    }

    // ── Spares ────────────────────────────────────────────────────────
    if (spares.length > 0) {
      y = checkPageBreak(doc, y, 30 + spares.length * 16);
      y = secHeader(doc, "Spares / Parts Changed", y);
      doc.rect(L, y, W, 14).fill("#e2e8f0");
      ["#", "Part Name", "Part No.", "Qty", "Remarks"].forEach((h, i) => {
        const xs = [L+4, L+20, L+200, L+295, L+340];
        const ws = [16, 178, 90, 40, 180];
        doc.fillColor(MUTED).fontSize(7).font("Helvetica-Bold").text(h, xs[i], y + 3, { width: ws[i], lineBreak: false });
      });
      y += 14;
      spares.forEach((s: any, i: number) => {
        y = checkPageBreak(doc, y, 16);
        if (i % 2 === 0) doc.rect(L, y, W, 14).fill("#f8fafc");
        const xs = [L+4, L+20, L+200, L+295, L+340];
        const ws = [16, 178, 90, 40, 180];
        [String(i+1), s.part_name||"", s.part_no||"", s.qty||"", s.remarks||""].forEach((v, j) => {
          doc.fillColor(DARK).fontSize(8).font("Helvetica").text(v, xs[j], y + 3, { width: ws[j], lineBreak: false });
        });
        y += 14;
      });
      y += 8;
    }

    // ── Electrical Issue ──────────────────────────────────────────────
    if (report.electrical_issue) {
      y = checkPageBreak(doc, y, 50);
      y = secHeader(doc, "Electrical Issue", y);
      labelVal(doc, "Assigned Team", elecTeam || "—", L + 6, y, 200);
      y += 20;
      if (report.electrical_issue_desc) {
        doc.fillColor(DARK).fontSize(8.5).font("Helvetica")
           .text(report.electrical_issue_desc.trim(), L + 6, y, { width: W - 12 });
        y = doc.y + 8;
      }
    }

    // ── Customer Remarks ──────────────────────────────────────────────
    if (report.customer_remarks) {
      y = checkPageBreak(doc, y, 50);
      y = textSection(doc, "Customer Remarks", report.customer_remarks, y);
    }

    // ── Photos ────────────────────────────────────────────────────────
    const photos = Array.isArray(report.photos) ? report.photos.filter((p: any) => p?.data) : [];
    if (photos.length > 0) {
      y = checkPageBreak(doc, y, 80);
      y = secHeader(doc, `Site Photos  (${photos.length})`, y);
      const imgW = (W - 16) / 2;
      const imgH = 110;
      let col = 0;
      for (const photo of photos) {
        try {
          y = checkPageBreak(doc, y, imgH + 28);
          const base64 = photo.data.replace(/^data:[^;]+;base64,/, "");
          const imgBuf = Buffer.from(base64, "base64");
          const x = L + 4 + col * (imgW + 8);
          doc.image(imgBuf, x, y, { width: imgW, height: imgH, cover: [imgW, imgH] });
          if (photo.comment) {
            doc.fillColor(DARK).fontSize(7).font("Helvetica")
               .text(photo.comment.trim(), x, y + imgH + 3, { width: imgW, lineBreak: false });
          }
          col++;
          if (col >= 2) { col = 0; y += imgH + 20; }
        } catch {}
      }
      if (col > 0) y += imgH + 20;
      y += 4;
    }

    // ── Signatures ────────────────────────────────────────────────────
    y = checkPageBreak(doc, y, 70);
    y = secHeader(doc, "Signatures", y);
    const sigLabels = ["Customer / Site Rep.", "WTT Engineer", "WTT Supervisor"];
    const sigW = W / 3;
    sigLabels.forEach((label, i) => {
      const sx = L + i * sigW;
      doc.rect(sx + 4, y, sigW - 8, 36).stroke("#cbd5e1");
      doc.fillColor(MUTED).fontSize(7).font("Helvetica")
         .text(label, sx + 4, y + 40, { width: sigW - 8, align: "center" });
    });
    y += 52;

    pdfFooter(doc);
  });
}

(async () => {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_site_calls (
        id                      SERIAL PRIMARY KEY,
        call_no                 TEXT,
        call_type               TEXT NOT NULL DEFAULT 'Online Support',
        project_number          TEXT,
        project_name            TEXT,
        site_coordinator_name   TEXT,
        site_coordinator_phone  TEXT,
        call_received_at        TEXT,
        departed_at             TEXT,
        arrived_site_at         TEXT,
        work_started_at         TEXT,
        work_completed_at       TEXT,
        departed_site_at        TEXT,
        arrived_back_at         TEXT,
        attended_by             JSONB NOT NULL DEFAULT '[]',
        issue_details           TEXT,
        spares_changed          JSONB NOT NULL DEFAULT '[]',
        electrical_issue        BOOLEAN NOT NULL DEFAULT FALSE,
        electrical_issue_desc   TEXT,
        electrical_team         JSONB NOT NULL DEFAULT '[]',
        status                  TEXT NOT NULL DEFAULT 'Open',
        root_cause              TEXT,
        action_taken            TEXT,
        remarks                 TEXT,
        created_by              TEXT,
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS call_type TEXT NOT NULL DEFAULT 'Online Support'`);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS site_coordinator_name TEXT`);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS site_coordinator_phone TEXT`);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS customer_email TEXT`);
    await db.execute(sql`ALTER TABLE plc_site_calls ADD COLUMN IF NOT EXISTS support_ticket_id INTEGER`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_service_reports (
        id                      SERIAL PRIMARY KEY,
        report_no               TEXT,
        project_number          TEXT,
        project_name            TEXT,
        site_coordinator_name   TEXT,
        site_coordinator_phone  TEXT,
        customer_email          TEXT,
        call_received_at        TEXT,
        departed_at             TEXT,
        arrived_site_at         TEXT,
        work_started_at         TEXT,
        work_completed_at       TEXT,
        departed_site_at        TEXT,
        arrived_back_at         TEXT,
        attended_by             JSONB NOT NULL DEFAULT '[]',
        service_details         TEXT,
        issue_details           TEXT,
        spares_changed          JSONB NOT NULL DEFAULT '[]',
        plc_checklist           JSONB NOT NULL DEFAULT '[]',
        customer_remarks        TEXT,
        engineer_suggestions    TEXT,
        electrical_issue        BOOLEAN NOT NULL DEFAULT FALSE,
        electrical_issue_desc   TEXT,
        electrical_team         JSONB NOT NULL DEFAULT '[]',
        status                  TEXT NOT NULL DEFAULT 'Open',
        root_cause              TEXT,
        action_taken            TEXT,
        created_by              TEXT,
        created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE plc_service_reports ADD COLUMN IF NOT EXISTS customer_email TEXT`);
    await db.execute(sql`ALTER TABLE plc_service_reports ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'`);

    // ── PLC Programs ──────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_programs (
        id               SERIAL PRIMARY KEY,
        program_no       TEXT,
        project_number   TEXT,
        project_name     TEXT,
        controller_make  TEXT,
        controller_model TEXT,
        program_name     TEXT,
        language         TEXT NOT NULL DEFAULT 'Ladder Diagram',
        version          TEXT NOT NULL DEFAULT '1.0',
        status           TEXT NOT NULL DEFAULT 'Draft',
        description      TEXT,
        notes            TEXT,
        created_by       TEXT,
        created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE plc_programs ADD COLUMN IF NOT EXISTS updated_by TEXT`);
    await db.execute(sql`ALTER TABLE plc_programs ADD COLUMN IF NOT EXISTS revisions JSONB NOT NULL DEFAULT '[]'::jsonb`);

    // ── HMI Programs ─────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_hmi_programs (
        id            SERIAL PRIMARY KEY,
        program_no    TEXT,
        project_number TEXT,
        project_name  TEXT,
        hmi_make      TEXT,
        hmi_model     TEXT,
        software      TEXT,
        screen_count  INTEGER NOT NULL DEFAULT 0,
        version       TEXT NOT NULL DEFAULT '1.0',
        status        TEXT NOT NULL DEFAULT 'Draft',
        description   TEXT,
        notes         TEXT,
        created_by    TEXT,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE plc_hmi_programs ADD COLUMN IF NOT EXISTS updated_by TEXT`);
    await db.execute(sql`ALTER TABLE plc_hmi_programs ADD COLUMN IF NOT EXISTS revisions JSONB NOT NULL DEFAULT '[]'::jsonb`);

    // ── PID Design ───────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_pid_loops (
        id               SERIAL PRIMARY KEY,
        loop_no          TEXT,
        project_number   TEXT,
        project_name     TEXT,
        loop_tag         TEXT,
        loop_name        TEXT,
        process_variable TEXT,
        set_point        TEXT,
        unit             TEXT,
        kp               NUMERIC,
        ki               NUMERIC,
        kd               NUMERIC,
        mode             TEXT NOT NULL DEFAULT 'Auto',
        controller_type  TEXT,
        output_min       NUMERIC,
        output_max       NUMERIC,
        alarm_hh         NUMERIC,
        alarm_h          NUMERIC,
        alarm_l          NUMERIC,
        alarm_ll         NUMERIC,
        notes            TEXT,
        status           TEXT NOT NULL DEFAULT 'Draft',
        created_by       TEXT,
        created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // ── Instruments ──────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_instruments (
        id                    SERIAL PRIMARY KEY,
        tag_no                TEXT,
        project_number        TEXT,
        project_name          TEXT,
        instrument_type       TEXT,
        make                  TEXT,
        model                 TEXT,
        range_min             TEXT,
        range_max             TEXT,
        unit                  TEXT,
        signal_type           TEXT,
        process_connection    TEXT,
        installation_location TEXT,
        calibration_date      TEXT,
        next_calibration      TEXT,
        status                TEXT NOT NULL DEFAULT 'Active',
        notes                 TEXT,
        created_by            TEXT,
        created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // ── Tags ─────────────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_tags (
        id             SERIAL PRIMARY KEY,
        tag_name       TEXT NOT NULL,
        tag_type       TEXT NOT NULL DEFAULT 'AI',
        address        TEXT,
        data_type      TEXT,
        description    TEXT,
        project_number TEXT,
        project_name   TEXT,
        eu_min         NUMERIC,
        eu_max         NUMERIC,
        unit           TEXT,
        hh_limit       NUMERIC,
        h_limit        NUMERIC,
        l_limit        NUMERIC,
        ll_limit       NUMERIC,
        status         TEXT NOT NULL DEFAULT 'Active',
        notes          TEXT,
        created_by     TEXT,
        created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // ── Support Tickets ───────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plc_support_tickets (
        id              SERIAL PRIMARY KEY,
        ticket_no       TEXT,
        site_call_id    INTEGER,
        project_number  TEXT,
        project_name    TEXT,
        title           TEXT,
        priority        TEXT NOT NULL DEFAULT 'Medium',
        status          TEXT NOT NULL DEFAULT 'Open',
        assigned_to     TEXT,
        notes           TEXT,
        created_by      TEXT,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      ALTER TABLE plc_support_tickets
        ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'
    `);

    // ERP sync columns
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS erp_name TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS erp_status TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS ticket_date TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS expected_completion_date TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS root_cause TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS ticket_description TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS supplier TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS reference TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS assigned_person_name TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS assigned_person_dept TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS attach_image_1 TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS attach_image_2 TEXT`);
    await db.execute(sql`ALTER TABLE plc_support_tickets ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'local'`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS plc_support_tickets_erp_name_idx ON plc_support_tickets (erp_name) WHERE erp_name IS NOT NULL`);

    console.log("PLC site calls & service reports tables ready");
  } catch (e) {
    console.error("PLC table init error:", e);
  }
})();

// ─── Site Calls (Online Support) ─────────────────────────────────────────────

router.get("/plc/site-calls", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";

    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        WHERE status = ${status}
          AND (project_name ILIKE ${"%" + search + "%"}
            OR project_number ILIKE ${"%" + search + "%"}
            OR call_no ILIKE ${"%" + search + "%"}
            OR issue_details ILIKE ${"%" + search + "%"})
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasSearch) {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        WHERE project_name ILIKE ${"%" + search + "%"}
           OR project_number ILIKE ${"%" + search + "%"}
           OR call_no ILIKE ${"%" + search + "%"}
           OR issue_details ILIKE ${"%" + search + "%"}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasStatus) {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        WHERE status = ${status}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, call_no, project_number, project_name, attended_by,
               issue_details, status, call_received_at, electrical_issue, created_at, created_by, call_type, customer_email
        FROM plc_site_calls
        ORDER BY created_at DESC LIMIT 200
      `);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/plc/site-calls/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM plc_site_calls WHERE id = ${Number(req.params.id)}
    `);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/plc/site-calls", async (req, res) => {
  try {
    const {
      call_no, call_type, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, work_started_at, work_completed_at,
      attended_by, issue_details, spares_changed,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken, remarks, created_by,
      support_ticket_id,
    } = req.body;

    const result = await db.execute(sql`
      INSERT INTO plc_site_calls
        (call_no, call_type, project_number, project_name,
         site_coordinator_name, site_coordinator_phone, customer_email,
         call_received_at, work_started_at, work_completed_at,
         attended_by, issue_details, spares_changed,
         electrical_issue, electrical_issue_desc, electrical_team,
         status, root_cause, action_taken, remarks, created_by, support_ticket_id)
      VALUES
        (${call_no ?? null}, ${call_type ?? "Online Support"},
         ${project_number ?? null}, ${project_name ?? null},
         ${site_coordinator_name ?? null}, ${site_coordinator_phone ?? null}, ${customer_email ?? null},
         ${call_received_at ?? null}, ${work_started_at ?? null}, ${work_completed_at ?? null},
         ${JSON.stringify(attended_by ?? [])}::jsonb,
         ${issue_details ?? null},
         ${JSON.stringify(spares_changed ?? [])}::jsonb,
         ${electrical_issue ?? false},
         ${electrical_issue_desc ?? null},
         ${JSON.stringify(electrical_team ?? [])}::jsonb,
         ${status ?? "Open"},
         ${root_cause ?? null}, ${action_taken ?? null},
         ${remarks ?? null}, ${created_by ?? null},
         ${support_ticket_id ? Number(support_ticket_id) : null})
      RETURNING *
    `);
    const rows = (result as any).rows ?? result;
    const newCall = rows[0];

    // If linked to a support ticket, mark it In Progress
    if (support_ticket_id) {
      try {
        await db.execute(sql`
          UPDATE plc_support_tickets SET status = 'In Progress', updated_at = NOW()
          WHERE id = ${Number(support_ticket_id)}
        `);
      } catch (ticketErr) {
        console.error("Support ticket status update failed:", ticketErr);
      }
    }

    res.json(newCall);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/plc/site-calls/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      call_no, call_type, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, work_started_at, work_completed_at,
      attended_by, issue_details, spares_changed,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken, remarks,
    } = req.body;

    await db.execute(sql`
      UPDATE plc_site_calls SET
        call_no                 = COALESCE(${call_no ?? null}, call_no),
        call_type               = COALESCE(${call_type ?? null}, call_type),
        project_number          = COALESCE(${project_number ?? null}, project_number),
        project_name            = COALESCE(${project_name ?? null}, project_name),
        site_coordinator_name   = ${site_coordinator_name ?? null},
        site_coordinator_phone  = ${site_coordinator_phone ?? null},
        customer_email          = ${customer_email ?? null},
        call_received_at        = COALESCE(${call_received_at ?? null}, call_received_at),
        work_started_at         = COALESCE(${work_started_at ?? null}, work_started_at),
        work_completed_at       = COALESCE(${work_completed_at ?? null}, work_completed_at),
        attended_by             = COALESCE(${attended_by != null ? JSON.stringify(attended_by) : null}::jsonb, attended_by),
        issue_details           = COALESCE(${issue_details ?? null}, issue_details),
        spares_changed          = COALESCE(${spares_changed != null ? JSON.stringify(spares_changed) : null}::jsonb, spares_changed),
        electrical_issue        = COALESCE(${electrical_issue ?? null}, electrical_issue),
        electrical_issue_desc   = COALESCE(${electrical_issue_desc ?? null}, electrical_issue_desc),
        electrical_team         = COALESCE(${electrical_team != null ? JSON.stringify(electrical_team) : null}::jsonb, electrical_team),
        status                  = COALESCE(${status ?? null}, status),
        root_cause              = COALESCE(${root_cause ?? null}, root_cause),
        action_taken            = COALESCE(${action_taken ?? null}, action_taken),
        remarks                 = COALESCE(${remarks ?? null}, remarks),
        updated_at              = NOW()
      WHERE id = ${id}
    `);

    // Sync status to linked support ticket (via support_ticket_id on the site call)
    if (status) {
      try {
        const callRow = await db.execute(sql`SELECT support_ticket_id FROM plc_site_calls WHERE id = ${id}`);
        const ticketId = ((callRow as any).rows ?? callRow)[0]?.support_ticket_id;
        if (ticketId) {
          const ticketStatus = status === "Closed" ? "Closed" : status;
          await db.execute(sql`
            UPDATE plc_support_tickets SET status = ${ticketStatus}, updated_at = NOW()
            WHERE id = ${Number(ticketId)}
          `);
        }
      } catch (ticketErr) {
        console.error("Support ticket status sync failed:", ticketErr);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/plc/site-calls/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_site_calls WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ─── Support Tickets ─────────────────────────────────────────────────────────

router.get("/plc/support-tickets", async (req, res) => {
  try {
    const { search, status, priority } = req.query as { search?: string; status?: string; priority?: string };
    const conditions: string[] = [];
    if (search && search.trim()) {
      conditions.push(`(t.project_name ILIKE '%${search.replace(/'/g, "''")}%'
        OR t.ticket_no ILIKE '%${search.replace(/'/g, "''")}%'
        OR t.title ILIKE '%${search.replace(/'/g, "''")}%')`);
    }
    if (status && status !== "All") conditions.push(`t.status = '${status.replace(/'/g, "''")}'`);
    if (priority && priority !== "All") conditions.push(`t.priority = '${priority.replace(/'/g, "''")}'`);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await db.execute(sql`
      SELECT t.*,
             s.call_no, s.call_type, s.status AS call_status,
             s.attended_by AS call_attended_by
      FROM plc_support_tickets t
      LEFT JOIN plc_site_calls s ON s.id = t.site_call_id
      ${sql.raw(where)}
      ORDER BY
        CASE t.status WHEN 'Open' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END,
        t.created_at DESC
      LIMIT 300
    `);
    res.json({ data: (result as any).rows ?? result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/plc/support-tickets/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT t.*, s.call_no, s.call_type, s.issue_details AS call_issue_details,
             s.status AS call_status, s.attended_by, s.work_started_at, s.work_completed_at
      FROM plc_support_tickets t
      LEFT JOIN plc_site_calls s ON s.id = t.site_call_id
      WHERE t.id = ${Number(req.params.id)}
    `);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/plc/support-tickets", async (req, res) => {
  try {
    const { project_number, project_name, title, priority, notes, created_by, images } = req.body;
    const result = await db.execute(sql`
      INSERT INTO plc_support_tickets
        (project_number, project_name, title, priority, notes, created_by, status, images)
      VALUES
        (${project_number ?? null}, ${project_name ?? null}, ${title ?? null},
         ${priority ?? "Medium"}, ${notes ?? null}, ${created_by ?? null}, 'Open',
         ${JSON.stringify(images ?? [])}::jsonb)
      RETURNING *
    `);
    const rows = (result as any).rows ?? result;
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/plc/support-tickets/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { priority, notes, images, status } = req.body;
    await db.execute(sql`
      UPDATE plc_support_tickets SET
        priority   = COALESCE(${priority ?? null}, priority),
        status     = COALESCE(${status ?? null}, status),
        notes      = COALESCE(${notes ?? null}, notes),
        images     = COALESCE(${images != null ? JSON.stringify(images) : null}::jsonb, images),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/plc/support-tickets/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_support_tickets WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/plc/support-tickets/sync-erp  — pull IT-WTT site tickets from ERPNext
router.post("/plc/support-tickets/sync-erp", async (req, res) => {
  try {
    const tickets = await fetchErpNextSiteTickets("It - WTT");

    let inserted = 0;
    let updated  = 0;

    for (const t of tickets) {
      const mapPriority = (p: string) => {
        const l = (p || "").toLowerCase();
        if (l === "high")   return "High";
        if (l === "low")    return "Low";
        if (l === "critical") return "Critical";
        return "Medium";
      };
      const mapStatus = (s: string) => {
        if (s === "Closed") return "Closed";
        if (s === "In Progress") return "In Progress";
        return "Open";
      };

      const existing = await db.execute(sql`
        SELECT id FROM plc_support_tickets WHERE erp_name = ${t.name}
      `);
      const rows = (existing as any).rows ?? existing;

      if (rows.length > 0) {
        await db.execute(sql`
          UPDATE plc_support_tickets SET
            title                    = ${t.ticket_subject ?? null},
            priority                 = ${mapPriority(t.priority)},
            status                   = ${mapStatus(t.status)},
            erp_status               = ${t.status ?? null},
            ticket_date              = ${t.date ?? null},
            expected_completion_date = ${t.expected_completion_date ?? null},
            root_cause               = ${t.root_cause ?? null},
            ticket_description       = ${t.ticket_description ?? null},
            project_number           = ${t.project ?? null},
            project_name             = ${t.project_name ?? null},
            reference                = ${t.reference ?? null},
            assigned_person_name     = ${t.assigned_person_name ?? null},
            assigned_person_dept     = ${t.assigned_person_department ?? null},
            supplier                 = ${t.supplier ?? null},
            attach_image_1           = ${t.attach_image_1 ?? null},
            attach_image_2           = ${t.attach_image_2 ?? null},
            updated_at               = NOW()
          WHERE erp_name = ${t.name}
        `);
        updated++;
      } else {
        await db.execute(sql`
          INSERT INTO plc_support_tickets
            (erp_name, ticket_no, source,
             title, priority, status, erp_status,
             ticket_date, expected_completion_date, root_cause, ticket_description,
             project_number, project_name, reference,
             assigned_person_name, assigned_person_dept,
             supplier, attach_image_1, attach_image_2,
             images)
          VALUES
            (${t.name}, ${t.name}, 'erp',
             ${t.ticket_subject ?? null},
             ${mapPriority(t.priority)},
             ${mapStatus(t.status)},
             ${t.status ?? null},
             ${t.date ?? null},
             ${t.expected_completion_date ?? null},
             ${t.root_cause ?? null},
             ${t.ticket_description ?? null},
             ${t.project ?? null},
             ${t.project_name ?? null},
             ${t.reference ?? null},
             ${t.assigned_person_name ?? null},
             ${t.assigned_person_department ?? null},
             ${t.supplier ?? null},
             ${t.attach_image_1 ?? null},
             ${t.attach_image_2 ?? null},
             '[]'::jsonb)
        `);
        inserted++;
      }
    }

    res.json({ ok: true, synced: tickets.length, inserted, updated });
  } catch (e) {
    console.error("ERP sync error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/plc/site-calls/:id/send-email
router.post("/plc/site-calls/:id/send-email", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_site_calls WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    const call = rows[0];
    if (!call) return res.status(404).json({ error: "Not found" });

    const toEmail = req.body.to || call.customer_email;
    if (!toEmail) return res.status(400).json({ error: "No customer email address provided." });

    const smtpUser = process.env.GMAIL_USER || "noreply@wttint.com";
    const smtpPass = process.env.GMAIL_APP_PASSWORD || "";
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com", port: 587, secure: false, requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const callNo   = call.call_no || `OSC-${String(call.id).padStart(4, "0")}`;
    const attended = Array.isArray(call.attended_by) ? call.attended_by.map((e: any) => e.name).join(", ") : "";
    const dateStr  = fmtDatePdf(call.call_received_at || call.created_at);
    const pdfBuf   = await buildSiteCallPDF(call);

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#1e3a5f;padding:28px 32px;">
    <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px;">WTT INTERNATIONAL</div>
    <div style="color:#93c5fd;font-size:11px;margin-top:2px;">Water Loving Technology</div>
    <div style="margin-top:10px;color:#93c5fd;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Online Support Call Report — <span style="color:#fff;font-weight:bold;">${callNo}</span></div>
  </div>
  <div style="padding:24px 32px;">
    <p style="margin:0 0 18px;font-size:14px;color:#1e293b;">Dear Customer,</p>
    <p style="margin:0 0 18px;font-size:13px;color:#475569;line-height:1.6;">
      Please find attached the Online Support Call Report <strong>${callNo}</strong> for your reference.
      This report covers the support session handled on <strong>${dateStr}</strong>.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;width:140px;border-bottom:1px solid #e2e8f0;">Project</td><td style="padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;">${call.project_name || "—"}${call.project_number ? ` (${call.project_number})` : ""}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Status</td><td style="padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;">${call.status || "Open"}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Attended By</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${attended || "—"}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Call Received</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${fmtDTPdf(call.call_received_at)}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Work Started</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${fmtDTPdf(call.work_started_at)}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;">Work Completed</td><td style="padding:8px 14px;font-size:13px;">${fmtDTPdf(call.work_completed_at)}</td></tr>
    </table>
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Action Taken</div>
      <div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${call.action_taken || "—"}</div>
    </div>
    <p style="margin:0;font-size:12px;color:#94a3b8;">The full detailed report is attached as a PDF to this email.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <div style="color:#94a3b8;font-size:11px;">WTT International · PLC &amp; Automation</div>
    <div style="color:#cbd5e1;font-size:10px;margin-top:4px;">Generated on ${fmtDatePdf(new Date().toISOString())}</div>
  </div>
</div>
</body></html>`;

    await transporter.sendMail({
      from: `"WTT International" <${smtpUser}>`,
      to: toEmail,
      subject: `Online Support Call Report — ${callNo} | ${call.project_name || ""}`,
      html,
      attachments: [{
        filename: `${callNo}.pdf`,
        content: pdfBuf,
        contentType: "application/pdf",
      }],
    });
    res.json({ ok: true, sent_to: toEmail });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ─── Service Reports ─────────────────────────────────────────────────────────

router.get("/plc/service-reports", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";

    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        WHERE status = ${status}
          AND (project_name ILIKE ${"%" + search + "%"}
            OR project_number ILIKE ${"%" + search + "%"}
            OR report_no ILIKE ${"%" + search + "%"}
            OR service_details ILIKE ${"%" + search + "%"})
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasSearch) {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        WHERE project_name ILIKE ${"%" + search + "%"}
           OR project_number ILIKE ${"%" + search + "%"}
           OR report_no ILIKE ${"%" + search + "%"}
           OR service_details ILIKE ${"%" + search + "%"}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else if (hasStatus) {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        WHERE status = ${status}
        ORDER BY created_at DESC LIMIT 200
      `);
    } else {
      result = await db.execute(sql`
        SELECT id, report_no, project_number, project_name, attended_by,
               service_details, status, call_received_at, created_at, created_by, customer_email
        FROM plc_service_reports
        ORDER BY created_at DESC LIMIT 200
      `);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/plc/service-reports/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT * FROM plc_service_reports WHERE id = ${Number(req.params.id)}
    `);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/plc/service-reports", async (req, res) => {
  try {
    const {
      report_no, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, departed_at, arrived_site_at,
      work_started_at, work_completed_at, departed_site_at, arrived_back_at,
      attended_by, service_details, issue_details, spares_changed,
      plc_checklist, customer_remarks, engineer_suggestions,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken, created_by, photos,
    } = req.body;

    const result = await db.execute(sql`
      INSERT INTO plc_service_reports
        (report_no, project_number, project_name,
         site_coordinator_name, site_coordinator_phone, customer_email,
         call_received_at, departed_at, arrived_site_at,
         work_started_at, work_completed_at, departed_site_at, arrived_back_at,
         attended_by, service_details, issue_details, spares_changed,
         plc_checklist, customer_remarks, engineer_suggestions,
         electrical_issue, electrical_issue_desc, electrical_team,
         status, root_cause, action_taken, created_by, photos)
      VALUES
        (${report_no ?? null},
         ${project_number ?? null}, ${project_name ?? null},
         ${site_coordinator_name ?? null}, ${site_coordinator_phone ?? null}, ${customer_email ?? null},
         ${call_received_at ?? null}, ${departed_at ?? null}, ${arrived_site_at ?? null},
         ${work_started_at ?? null}, ${work_completed_at ?? null},
         ${departed_site_at ?? null}, ${arrived_back_at ?? null},
         ${JSON.stringify(attended_by ?? [])}::jsonb,
         ${service_details ?? null}, ${issue_details ?? null},
         ${JSON.stringify(spares_changed ?? [])}::jsonb,
         ${JSON.stringify(plc_checklist ?? [])}::jsonb,
         ${customer_remarks ?? null}, ${engineer_suggestions ?? null},
         ${electrical_issue ?? false},
         ${electrical_issue_desc ?? null},
         ${JSON.stringify(electrical_team ?? [])}::jsonb,
         ${status ?? "Open"},
         ${root_cause ?? null}, ${action_taken ?? null},
         ${created_by ?? null},
         ${JSON.stringify(photos ?? [])}::jsonb)
      RETURNING *
    `);
    const rows = (result as any).rows ?? result;
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.patch("/plc/service-reports/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      report_no, project_number, project_name,
      site_coordinator_name, site_coordinator_phone, customer_email,
      call_received_at, departed_at, arrived_site_at,
      work_started_at, work_completed_at, departed_site_at, arrived_back_at,
      attended_by, service_details, issue_details, spares_changed,
      plc_checklist, customer_remarks, engineer_suggestions,
      electrical_issue, electrical_issue_desc, electrical_team,
      status, root_cause, action_taken, photos,
    } = req.body;

    await db.execute(sql`
      UPDATE plc_service_reports SET
        report_no               = COALESCE(${report_no ?? null}, report_no),
        project_number          = COALESCE(${project_number ?? null}, project_number),
        project_name            = COALESCE(${project_name ?? null}, project_name),
        site_coordinator_name   = ${site_coordinator_name ?? null},
        site_coordinator_phone  = ${site_coordinator_phone ?? null},
        customer_email          = ${customer_email ?? null},
        call_received_at        = COALESCE(${call_received_at ?? null}, call_received_at),
        departed_at             = COALESCE(${departed_at ?? null}, departed_at),
        arrived_site_at         = COALESCE(${arrived_site_at ?? null}, arrived_site_at),
        work_started_at         = COALESCE(${work_started_at ?? null}, work_started_at),
        work_completed_at       = COALESCE(${work_completed_at ?? null}, work_completed_at),
        departed_site_at        = COALESCE(${departed_site_at ?? null}, departed_site_at),
        arrived_back_at         = COALESCE(${arrived_back_at ?? null}, arrived_back_at),
        attended_by             = COALESCE(${attended_by != null ? JSON.stringify(attended_by) : null}::jsonb, attended_by),
        service_details         = COALESCE(${service_details ?? null}, service_details),
        issue_details           = COALESCE(${issue_details ?? null}, issue_details),
        spares_changed          = COALESCE(${spares_changed != null ? JSON.stringify(spares_changed) : null}::jsonb, spares_changed),
        plc_checklist           = COALESCE(${plc_checklist != null ? JSON.stringify(plc_checklist) : null}::jsonb, plc_checklist),
        customer_remarks        = COALESCE(${customer_remarks ?? null}, customer_remarks),
        engineer_suggestions    = COALESCE(${engineer_suggestions ?? null}, engineer_suggestions),
        electrical_issue        = COALESCE(${electrical_issue ?? null}, electrical_issue),
        electrical_issue_desc   = COALESCE(${electrical_issue_desc ?? null}, electrical_issue_desc),
        electrical_team         = COALESCE(${electrical_team != null ? JSON.stringify(electrical_team) : null}::jsonb, electrical_team),
        status                  = COALESCE(${status ?? null}, status),
        root_cause              = COALESCE(${root_cause ?? null}, root_cause),
        action_taken            = COALESCE(${action_taken ?? null}, action_taken),
        photos                  = COALESCE(${photos != null ? JSON.stringify(photos) : null}::jsonb, photos),
        updated_at              = NOW()
      WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/plc/service-reports/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_service_reports WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/plc/service-reports/:id/send-email
router.post("/plc/service-reports/:id/send-email", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_service_reports WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    const report = rows[0];
    if (!report) return res.status(404).json({ error: "Not found" });

    const toEmail = req.body.to || report.customer_email;
    if (!toEmail) return res.status(400).json({ error: "No customer email address provided." });

    const smtpUser = process.env.GMAIL_USER || "noreply@wttint.com";
    const smtpPass = process.env.GMAIL_APP_PASSWORD || "";
    const transporter = nodemailer.createTransport({
      host: "smtp.office365.com", port: 587, secure: false, requireTLS: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const reportNo    = report.report_no || `SR-${String(report.id).padStart(4, "0")}`;
    const attended    = Array.isArray(report.attended_by)   ? report.attended_by.map((e: any)   => e.name).join(", ") : "";
    const checklist   = Array.isArray(report.plc_checklist) ? report.plc_checklist : [];
    const checkedCount = checklist.filter((c: any) => c.checked).length;
    const dateStr     = fmtDatePdf(report.call_received_at || report.created_at);
    const pdfBuffer   = await buildServiceReportPDF(report);

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
  <div style="background:#1e3a5f;padding:28px 32px;">
    <div style="color:#fff;font-size:20px;font-weight:900;letter-spacing:1px;">WTT INTERNATIONAL</div>
    <div style="color:#93c5fd;font-size:11px;margin-top:2px;">Water Loving Technology</div>
    <div style="margin-top:10px;color:#93c5fd;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Site Service Report — <span style="color:#fff;font-weight:bold;">${reportNo}</span></div>
  </div>
  <div style="padding:24px 32px;">
    <p style="margin:0 0 18px;font-size:14px;color:#1e293b;">Dear Customer,</p>
    <p style="margin:0 0 18px;font-size:13px;color:#475569;line-height:1.6;">
      Please find attached the Site Service Report <strong>${reportNo}</strong> for the visit conducted on <strong>${dateStr}</strong>.
      This report includes the service work performed, PLC checklist, and action taken by our team.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#f8fafc;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;width:140px;border-bottom:1px solid #e2e8f0;">Project</td><td style="padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;">${report.project_name || "—"}${report.project_number ? ` (${report.project_number})` : ""}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Site Coordinator</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${report.site_coordinator_name || "—"}${report.site_coordinator_phone ? ` · ${report.site_coordinator_phone}` : ""}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Status</td><td style="padding:8px 14px;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;">${report.status || "Open"}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Attended By</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${attended || "—"}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Visit Date</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${fmtDTPdf(report.call_received_at)}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;">Work Completed</td><td style="padding:8px 14px;font-size:13px;">${fmtDTPdf(report.work_completed_at)}</td></tr>
    </table>
    <div style="background:#f8fafc;border-left:4px solid #1e3a5f;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Customer Complaint</div>
      <div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${report.issue_details || "—"}</div>
    </div>
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Solution — Work Done</div>
      <div style="font-size:13px;color:#1e293b;white-space:pre-wrap;">${report.service_details || "—"}</div>
    </div>
    ${checklist.length > 0 ? `<div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:16px;"><div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">PLC Checklist — ${checkedCount}/${checklist.length} points verified</div></div>` : ""}
    <p style="margin:0;font-size:12px;color:#94a3b8;">The full detailed report with complete checklist, timing, and signatures is attached as a PDF.</p>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <div style="color:#94a3b8;font-size:11px;">WTT International · PLC &amp; Automation</div>
    <div style="color:#cbd5e1;font-size:10px;margin-top:4px;">Generated on ${fmtDatePdf(new Date().toISOString())}</div>
  </div>
</div>
</body></html>`;

    const photos = Array.isArray(report.photos) ? report.photos.filter((p: any) => p?.data) : [];
    const photoAttachments = photos.map((p: any, i: number) => {
      const base64 = p.data.replace(/^data:[^;]+;base64,/, "");
      const ext = (p.mime || "image/jpeg").split("/")[1] || "jpg";
      return {
        filename: p.filename || `photo-${i + 1}.${ext}`,
        content: Buffer.from(base64, "base64"),
        contentType: p.mime || "image/jpeg",
        cid: `photo${i}@wttint`,
      };
    });

    const photosHtml = photos.length > 0
      ? `<div style="margin-bottom:16px;">
          <div style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Site Photos (${photos.length})</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${photos.map((p: any, i: number) => `
              <div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
                <img src="cid:photo${i}@wttint" style="width:100%;height:160px;object-fit:cover;display:block;" alt="Site photo ${i+1}" />
                ${p.comment ? `<div style="padding:6px 10px;font-size:11px;color:#475569;background:#f8fafc;">${p.comment}</div>` : ""}
              </div>`).join("")}
          </div>
        </div>`
      : "";

    await transporter.sendMail({
      from: `"WTT International" <${smtpUser}>`,
      to: toEmail,
      subject: `Site Service Report — ${reportNo} | ${report.project_name || ""}`,
      html: html.replace("</div>\n</body></html>", `${photosHtml}</div>\n</body></html>`),
      attachments: [
        {
          filename: `${reportNo}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        ...photoAttachments,
      ],
    });
    res.json({ ok: true, sent_to: toEmail, photos_attached: photos.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ─── PLC Programs ─────────────────────────────────────────────────────────────

router.get("/plc/programs", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";
    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_programs WHERE status = ${status} AND (program_name ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"} OR program_no ILIKE ${"%" + search + "%"}) ORDER BY created_at DESC LIMIT 200`);
    } else if (hasSearch) {
      result = await db.execute(sql`SELECT * FROM plc_programs WHERE program_name ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"} OR program_no ILIKE ${"%" + search + "%"} ORDER BY created_at DESC LIMIT 200`);
    } else if (hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_programs WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`);
    } else {
      result = await db.execute(sql`SELECT * FROM plc_programs ORDER BY created_at DESC LIMIT 200`);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/programs/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_programs WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/programs", async (req, res) => {
  try {
    const { program_no, project_number, project_name, controller_make, controller_model, program_name, language, version, status, description, notes, created_by, rev_description } = req.body;
    const initRevision = JSON.stringify([{ rev: "R00", description: rev_description || "Initial release", by: created_by || "—", at: new Date().toISOString() }]);
    const result = await db.execute(sql`INSERT INTO plc_programs (program_no,project_number,project_name,controller_make,controller_model,program_name,language,version,status,description,notes,created_by,updated_by,revisions) VALUES (${program_no??null},${project_number??null},${project_name??null},${controller_make??null},${controller_model??null},${program_name??null},${language??"Ladder Diagram"},${version??"1.0"},${status??"Draft"},${description??null},${notes??null},${created_by??null},${created_by??null},${initRevision}::jsonb) RETURNING *`);
    res.json(((result as any).rows ?? result)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/plc/programs/:id", async (req, res) => {
  try {
    const { program_no, project_number, project_name, controller_make, controller_model, program_name, language, version, status, description, notes, updated_by, rev_code, rev_description } = req.body;
    if (rev_code) {
      const newEntry = JSON.stringify([{ rev: rev_code, description: rev_description || "—", by: updated_by || "—", at: new Date().toISOString() }]);
      await db.execute(sql`UPDATE plc_programs SET program_no=COALESCE(${program_no??null},program_no), project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), controller_make=${controller_make??null}, controller_model=${controller_model??null}, program_name=COALESCE(${program_name??null},program_name), language=COALESCE(${language??null},language), version=COALESCE(${version??null},version), status=COALESCE(${status??null},status), description=${description??null}, notes=${notes??null}, updated_by=${updated_by??null}, updated_at=NOW(), revisions=COALESCE(revisions,'[]'::jsonb) || ${newEntry}::jsonb WHERE id=${Number(req.params.id)}`);
    } else {
      await db.execute(sql`UPDATE plc_programs SET program_no=COALESCE(${program_no??null},program_no), project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), controller_make=${controller_make??null}, controller_model=${controller_model??null}, program_name=COALESCE(${program_name??null},program_name), language=COALESCE(${language??null},language), version=COALESCE(${version??null},version), status=COALESCE(${status??null},status), description=${description??null}, notes=${notes??null}, updated_by=${updated_by??null}, updated_at=NOW() WHERE id=${Number(req.params.id)}`);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/plc/programs/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_programs WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── HMI Programs ─────────────────────────────────────────────────────────────

router.get("/plc/hmi-programs", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";
    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_hmi_programs WHERE status = ${status} AND (program_no ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"} OR hmi_make ILIKE ${"%" + search + "%"}) ORDER BY created_at DESC LIMIT 200`);
    } else if (hasSearch) {
      result = await db.execute(sql`SELECT * FROM plc_hmi_programs WHERE program_no ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"} OR hmi_make ILIKE ${"%" + search + "%"} ORDER BY created_at DESC LIMIT 200`);
    } else if (hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_hmi_programs WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`);
    } else {
      result = await db.execute(sql`SELECT * FROM plc_hmi_programs ORDER BY created_at DESC LIMIT 200`);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/hmi-programs/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_hmi_programs WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/hmi-programs", async (req, res) => {
  try {
    const { program_no, project_number, project_name, hmi_make, hmi_model, software, screen_count, version, status, description, notes, created_by, rev_description } = req.body;
    const initRevision = JSON.stringify([{ rev: "R00", description: rev_description || "Initial release", by: created_by || "—", at: new Date().toISOString() }]);
    const result = await db.execute(sql`INSERT INTO plc_hmi_programs (program_no,project_number,project_name,hmi_make,hmi_model,software,screen_count,version,status,description,notes,created_by,updated_by,revisions) VALUES (${program_no??null},${project_number??null},${project_name??null},${hmi_make??null},${hmi_model??null},${software??null},${screen_count??0},${version??"1.0"},${status??"Draft"},${description??null},${notes??null},${created_by??null},${created_by??null},${initRevision}::jsonb) RETURNING *`);
    res.json(((result as any).rows ?? result)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/plc/hmi-programs/:id", async (req, res) => {
  try {
    const { program_no, project_number, project_name, hmi_make, hmi_model, software, screen_count, version, status, description, notes, updated_by, rev_code, rev_description } = req.body;
    if (rev_code) {
      const newEntry = JSON.stringify([{ rev: rev_code, description: rev_description || "—", by: updated_by || "—", at: new Date().toISOString() }]);
      await db.execute(sql`UPDATE plc_hmi_programs SET program_no=COALESCE(${program_no??null},program_no), project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), hmi_make=${hmi_make??null}, hmi_model=${hmi_model??null}, software=${software??null}, screen_count=COALESCE(${screen_count??null},screen_count), version=COALESCE(${version??null},version), status=COALESCE(${status??null},status), description=${description??null}, notes=${notes??null}, updated_by=${updated_by??null}, updated_at=NOW(), revisions=COALESCE(revisions,'[]'::jsonb) || ${newEntry}::jsonb WHERE id=${Number(req.params.id)}`);
    } else {
      await db.execute(sql`UPDATE plc_hmi_programs SET program_no=COALESCE(${program_no??null},program_no), project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), hmi_make=${hmi_make??null}, hmi_model=${hmi_model??null}, software=${software??null}, screen_count=COALESCE(${screen_count??null},screen_count), version=COALESCE(${version??null},version), status=COALESCE(${status??null},status), description=${description??null}, notes=${notes??null}, updated_by=${updated_by??null}, updated_at=NOW() WHERE id=${Number(req.params.id)}`);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/plc/hmi-programs/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_hmi_programs WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── PID Design ───────────────────────────────────────────────────────────────

router.get("/plc/pid-loops", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";
    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_pid_loops WHERE status = ${status} AND (loop_tag ILIKE ${"%" + search + "%"} OR loop_name ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"}) ORDER BY created_at DESC LIMIT 200`);
    } else if (hasSearch) {
      result = await db.execute(sql`SELECT * FROM plc_pid_loops WHERE loop_tag ILIKE ${"%" + search + "%"} OR loop_name ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"} ORDER BY created_at DESC LIMIT 200`);
    } else if (hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_pid_loops WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`);
    } else {
      result = await db.execute(sql`SELECT * FROM plc_pid_loops ORDER BY created_at DESC LIMIT 200`);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/pid-loops/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_pid_loops WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/pid-loops", async (req, res) => {
  try {
    const { loop_no, project_number, project_name, loop_tag, loop_name, process_variable, set_point, unit, kp, ki, kd, mode, controller_type, output_min, output_max, alarm_hh, alarm_h, alarm_l, alarm_ll, notes, status, created_by } = req.body;
    const result = await db.execute(sql`INSERT INTO plc_pid_loops (loop_no,project_number,project_name,loop_tag,loop_name,process_variable,set_point,unit,kp,ki,kd,mode,controller_type,output_min,output_max,alarm_hh,alarm_h,alarm_l,alarm_ll,notes,status,created_by) VALUES (${loop_no??null},${project_number??null},${project_name??null},${loop_tag??null},${loop_name??null},${process_variable??null},${set_point??null},${unit??null},${kp??null},${ki??null},${kd??null},${mode??"Auto"},${controller_type??null},${output_min??null},${output_max??null},${alarm_hh??null},${alarm_h??null},${alarm_l??null},${alarm_ll??null},${notes??null},${status??"Draft"},${created_by??null}) RETURNING *`);
    res.json(((result as any).rows ?? result)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/plc/pid-loops/:id", async (req, res) => {
  try {
    const { loop_no, project_number, project_name, loop_tag, loop_name, process_variable, set_point, unit, kp, ki, kd, mode, controller_type, output_min, output_max, alarm_hh, alarm_h, alarm_l, alarm_ll, notes, status } = req.body;
    await db.execute(sql`UPDATE plc_pid_loops SET loop_no=COALESCE(${loop_no??null},loop_no), project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), loop_tag=${loop_tag??null}, loop_name=${loop_name??null}, process_variable=${process_variable??null}, set_point=${set_point??null}, unit=${unit??null}, kp=${kp??null}, ki=${ki??null}, kd=${kd??null}, mode=COALESCE(${mode??null},mode), controller_type=${controller_type??null}, output_min=${output_min??null}, output_max=${output_max??null}, alarm_hh=${alarm_hh??null}, alarm_h=${alarm_h??null}, alarm_l=${alarm_l??null}, alarm_ll=${alarm_ll??null}, notes=${notes??null}, status=COALESCE(${status??null},status), updated_at=NOW() WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/plc/pid-loops/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_pid_loops WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Instruments ──────────────────────────────────────────────────────────────

router.get("/plc/instruments", async (req, res) => {
  try {
    const { search, status } = req.query as { search?: string; status?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";
    let result: any;
    if (hasSearch && hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_instruments WHERE status = ${status} AND (tag_no ILIKE ${"%" + search + "%"} OR instrument_type ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"} OR make ILIKE ${"%" + search + "%"}) ORDER BY created_at DESC LIMIT 200`);
    } else if (hasSearch) {
      result = await db.execute(sql`SELECT * FROM plc_instruments WHERE tag_no ILIKE ${"%" + search + "%"} OR instrument_type ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"} OR make ILIKE ${"%" + search + "%"} ORDER BY created_at DESC LIMIT 200`);
    } else if (hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_instruments WHERE status = ${status} ORDER BY created_at DESC LIMIT 200`);
    } else {
      result = await db.execute(sql`SELECT * FROM plc_instruments ORDER BY created_at DESC LIMIT 200`);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/instruments/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_instruments WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/instruments", async (req, res) => {
  try {
    const { tag_no, project_number, project_name, instrument_type, make, model, range_min, range_max, unit, signal_type, process_connection, installation_location, calibration_date, next_calibration, status, notes, created_by } = req.body;
    const result = await db.execute(sql`INSERT INTO plc_instruments (tag_no,project_number,project_name,instrument_type,make,model,range_min,range_max,unit,signal_type,process_connection,installation_location,calibration_date,next_calibration,status,notes,created_by) VALUES (${tag_no??null},${project_number??null},${project_name??null},${instrument_type??null},${make??null},${model??null},${range_min??null},${range_max??null},${unit??null},${signal_type??null},${process_connection??null},${installation_location??null},${calibration_date??null},${next_calibration??null},${status??"Active"},${notes??null},${created_by??null}) RETURNING *`);
    res.json(((result as any).rows ?? result)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/plc/instruments/:id", async (req, res) => {
  try {
    const { tag_no, project_number, project_name, instrument_type, make, model, range_min, range_max, unit, signal_type, process_connection, installation_location, calibration_date, next_calibration, status, notes } = req.body;
    await db.execute(sql`UPDATE plc_instruments SET tag_no=${tag_no??null}, project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), instrument_type=${instrument_type??null}, make=${make??null}, model=${model??null}, range_min=${range_min??null}, range_max=${range_max??null}, unit=${unit??null}, signal_type=${signal_type??null}, process_connection=${process_connection??null}, installation_location=${installation_location??null}, calibration_date=${calibration_date??null}, next_calibration=${next_calibration??null}, status=COALESCE(${status??null},status), notes=${notes??null}, updated_at=NOW() WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/plc/instruments/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_instruments WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

router.get("/plc/tags", async (req, res) => {
  try {
    const { search, status, tag_type } = req.query as { search?: string; status?: string; tag_type?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";
    const hasType   = tag_type && tag_type !== "All";
    let result: any;
    if (hasSearch) {
      result = await db.execute(sql`SELECT * FROM plc_tags WHERE (tag_name ILIKE ${"%" + search + "%"} OR description ILIKE ${"%" + search + "%"} OR address ILIKE ${"%" + search + "%"} OR project_name ILIKE ${"%" + search + "%"}) ORDER BY created_at DESC LIMIT 500`);
    } else if (hasStatus && hasType) {
      result = await db.execute(sql`SELECT * FROM plc_tags WHERE status = ${status} AND tag_type = ${tag_type} ORDER BY created_at DESC LIMIT 500`);
    } else if (hasStatus) {
      result = await db.execute(sql`SELECT * FROM plc_tags WHERE status = ${status} ORDER BY created_at DESC LIMIT 500`);
    } else if (hasType) {
      result = await db.execute(sql`SELECT * FROM plc_tags WHERE tag_type = ${tag_type} ORDER BY created_at DESC LIMIT 500`);
    } else {
      result = await db.execute(sql`SELECT * FROM plc_tags ORDER BY created_at DESC LIMIT 500`);
    }
    res.json({ data: (result as any).rows ?? result });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/tags/:id", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM plc_tags WHERE id = ${Number(req.params.id)}`);
    const rows = (result as any).rows ?? result;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/tags", async (req, res) => {
  try {
    const { tag_name, tag_type, address, data_type, description, project_number, project_name, eu_min, eu_max, unit, hh_limit, h_limit, l_limit, ll_limit, status, notes, created_by } = req.body;
    const result = await db.execute(sql`INSERT INTO plc_tags (tag_name,tag_type,address,data_type,description,project_number,project_name,eu_min,eu_max,unit,hh_limit,h_limit,l_limit,ll_limit,status,notes,created_by) VALUES (${tag_name},${tag_type??"AI"},${address??null},${data_type??null},${description??null},${project_number??null},${project_name??null},${eu_min??null},${eu_max??null},${unit??null},${hh_limit??null},${h_limit??null},${l_limit??null},${ll_limit??null},${status??"Active"},${notes??null},${created_by??null}) RETURNING *`);
    res.json(((result as any).rows ?? result)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/plc/tags/:id", async (req, res) => {
  try {
    const { tag_name, tag_type, address, data_type, description, project_number, project_name, eu_min, eu_max, unit, hh_limit, h_limit, l_limit, ll_limit, status, notes } = req.body;
    await db.execute(sql`UPDATE plc_tags SET tag_name=COALESCE(${tag_name??null},tag_name), tag_type=COALESCE(${tag_type??null},tag_type), address=${address??null}, data_type=${data_type??null}, description=${description??null}, project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), eu_min=${eu_min??null}, eu_max=${eu_max??null}, unit=${unit??null}, hh_limit=${hh_limit??null}, h_limit=${h_limit??null}, l_limit=${l_limit??null}, ll_limit=${ll_limit??null}, status=COALESCE(${status??null},status), notes=${notes??null}, updated_at=NOW() WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/plc/tags/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM plc_tags WHERE id = ${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── ERP Employees ────────────────────────────────────────────────────────────

router.get("/plc/erp-employees", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ employees: [] });
  try {
    const fields = encodeURIComponent('["name","employee_name","designation","department"]');
    const nameFilter = encodeURIComponent(`[["employee_name","like","%${q}%"],["status","=","Active"]]`);
    const r = await fetch(
      `${ERP_URL}/api/resource/Employee?filters=${nameFilter}&fields=${fields}&limit=20`,
      { headers: { Authorization: ERP_AUTH(), Accept: "application/json" } }
    );
    if (!r.ok) return res.json({ employees: [] });
    const d: any = await r.json();
    const list: any[] = d.data || [];
    res.json({
      employees: list.map(e => ({
        id: e.name,
        name: e.employee_name,
        designation: e.designation || "",
        label: `${e.employee_name}${e.designation ? " — " + e.designation : ""}`,
      })),
    });
  } catch (e: any) {
    res.status(502).json({ error: e.message, employees: [] });
  }
});

// ─── Program File Backup (shared for PLC & HMI) ──────────────────────────────

const plcFilesDir = path.join(process.cwd(), "uploads", "plc-program-files");
fs.mkdirSync(plcFilesDir, { recursive: true });

const plcFileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, plcFilesDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  },
});
const plcUpload = multer({ storage: plcFileStorage, limits: { fileSize: 50 * 1024 * 1024 } });

async function ensureFilesTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS plc_program_files (
      id           SERIAL PRIMARY KEY,
      program_id   INTEGER NOT NULL,
      program_type TEXT NOT NULL DEFAULT 'plc',
      filename     TEXT NOT NULL,
      original_name TEXT NOT NULL,
      size         INTEGER,
      uploaded_by  TEXT,
      uploaded_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}
ensureFilesTable().catch(() => {});

router.get("/plc/programs/:id/files", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM plc_program_files WHERE program_id=${Number(req.params.id)} AND program_type='plc' ORDER BY uploaded_at DESC`);
    res.json({ data: (r as any).rows ?? r });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/programs/:id/files", plcUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const { uploaded_by } = req.body;
    const r = await db.execute(sql`INSERT INTO plc_program_files (program_id,program_type,filename,original_name,size,uploaded_by) VALUES (${Number(req.params.id)},'plc',${req.file.filename},${req.file.originalname},${req.file.size},${uploaded_by??null}) RETURNING *`);
    res.json(((r as any).rows ?? r)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/hmi-programs/:id/files", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM plc_program_files WHERE program_id=${Number(req.params.id)} AND program_type='hmi' ORDER BY uploaded_at DESC`);
    res.json({ data: (r as any).rows ?? r });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/hmi-programs/:id/files", plcUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file" });
    const { uploaded_by } = req.body;
    const r = await db.execute(sql`INSERT INTO plc_program_files (program_id,program_type,filename,original_name,size,uploaded_by) VALUES (${Number(req.params.id)},'hmi',${req.file.filename},${req.file.originalname},${req.file.size},${uploaded_by??null}) RETURNING *`);
    res.json(((r as any).rows ?? r)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/files/:fileId/download", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM plc_program_files WHERE id=${Number(req.params.fileId)}`);
    const rows = (r as any).rows ?? r;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    const f = rows[0];
    const fp = path.join(plcFilesDir, f.filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ error: "File not found on disk" });
    res.download(fp, f.original_name);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/plc/files/:fileId", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM plc_program_files WHERE id=${Number(req.params.fileId)}`);
    const rows = (r as any).rows ?? r;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    const fp = path.join(plcFilesDir, rows[0].filename);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    await db.execute(sql`DELETE FROM plc_program_files WHERE id=${Number(req.params.fileId)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

// ─── Panel Inspection Before Dispatch ─────────────────────────────────────────

async function ensurePanelInspTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS panel_inspections (
      id              SERIAL PRIMARY KEY,
      inspection_no   TEXT,
      project_number  TEXT,
      project_name    TEXT,
      panel_name      TEXT,
      panel_type      TEXT,
      panel_serial_no TEXT,
      inspection_date TEXT,
      inspector_name  TEXT,
      customer_name   TEXT,
      checklist       JSONB NOT NULL DEFAULT '[]'::jsonb,
      issues          JSONB NOT NULL DEFAULT '[]'::jsonb,
      overall_result  TEXT NOT NULL DEFAULT 'Pending',
      remarks         TEXT,
      email_to        TEXT,
      status          TEXT NOT NULL DEFAULT 'Draft',
      created_by      TEXT,
      created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}
ensurePanelInspTable().catch(() => {});

router.get("/plc/panel-inspections", async (req, res) => {
  try {
    const { search, status, result } = req.query as { search?: string; status?: string; result?: string };
    const hasSearch = search && search.trim();
    const hasStatus = status && status !== "All";
    const hasResult = result && result !== "All";
    let r: any;
    if (hasSearch) {
      r = await db.execute(sql`SELECT id,inspection_no,project_number,project_name,panel_name,panel_type,panel_serial_no,inspection_date,inspector_name,overall_result,status,created_at FROM panel_inspections WHERE project_name ILIKE ${"%" + search + "%"} OR project_number ILIKE ${"%" + search + "%"} OR panel_name ILIKE ${"%" + search + "%"} OR inspection_no ILIKE ${"%" + search + "%"} ORDER BY created_at DESC LIMIT 200`);
    } else if (hasStatus && hasResult) {
      r = await db.execute(sql`SELECT id,inspection_no,project_number,project_name,panel_name,panel_type,panel_serial_no,inspection_date,inspector_name,overall_result,status,created_at FROM panel_inspections WHERE status=${status} AND overall_result=${result} ORDER BY created_at DESC LIMIT 200`);
    } else if (hasStatus) {
      r = await db.execute(sql`SELECT id,inspection_no,project_number,project_name,panel_name,panel_type,panel_serial_no,inspection_date,inspector_name,overall_result,status,created_at FROM panel_inspections WHERE status=${status} ORDER BY created_at DESC LIMIT 200`);
    } else if (hasResult) {
      r = await db.execute(sql`SELECT id,inspection_no,project_number,project_name,panel_name,panel_type,panel_serial_no,inspection_date,inspector_name,overall_result,status,created_at FROM panel_inspections WHERE overall_result=${result} ORDER BY created_at DESC LIMIT 200`);
    } else {
      r = await db.execute(sql`SELECT id,inspection_no,project_number,project_name,panel_name,panel_type,panel_serial_no,inspection_date,inspector_name,overall_result,status,created_at FROM panel_inspections ORDER BY created_at DESC LIMIT 200`);
    }
    res.json({ data: (r as any).rows ?? r });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.get("/plc/panel-inspections/:id", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM panel_inspections WHERE id=${Number(req.params.id)}`);
    const rows = (r as any).rows ?? r;
    if (!rows[0]) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/panel-inspections", async (req, res) => {
  try {
    const { inspection_no, project_number, project_name, panel_name, panel_type, panel_serial_no, inspection_date, inspector_name, customer_name, checklist, issues, overall_result, remarks, email_to, status, created_by } = req.body;
    const r = await db.execute(sql`INSERT INTO panel_inspections (inspection_no,project_number,project_name,panel_name,panel_type,panel_serial_no,inspection_date,inspector_name,customer_name,checklist,issues,overall_result,remarks,email_to,status,created_by) VALUES (${inspection_no??null},${project_number??null},${project_name??null},${panel_name??null},${panel_type??null},${panel_serial_no??null},${inspection_date??null},${inspector_name??null},${customer_name??null},${JSON.stringify(checklist??[])}::jsonb,${JSON.stringify(issues??[])}::jsonb,${overall_result??"Pending"},${remarks??null},${email_to??null},${status??"Draft"},${created_by??null}) RETURNING *`);
    res.json(((r as any).rows ?? r)[0]);
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.patch("/plc/panel-inspections/:id", async (req, res) => {
  try {
    const { inspection_no, project_number, project_name, panel_name, panel_type, panel_serial_no, inspection_date, inspector_name, customer_name, checklist, issues, overall_result, remarks, email_to, status } = req.body;
    await db.execute(sql`UPDATE panel_inspections SET inspection_no=COALESCE(${inspection_no??null},inspection_no), project_number=COALESCE(${project_number??null},project_number), project_name=COALESCE(${project_name??null},project_name), panel_name=${panel_name??null}, panel_type=${panel_type??null}, panel_serial_no=${panel_serial_no??null}, inspection_date=${inspection_date??null}, inspector_name=${inspector_name??null}, customer_name=${customer_name??null}, checklist=COALESCE(${checklist!=null?JSON.stringify(checklist):null}::jsonb,checklist), issues=COALESCE(${issues!=null?JSON.stringify(issues):null}::jsonb,issues), overall_result=COALESCE(${overall_result??null},overall_result), remarks=${remarks??null}, email_to=${email_to??null}, status=COALESCE(${status??null},status), updated_at=NOW() WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.delete("/plc/panel-inspections/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM panel_inspections WHERE id=${Number(req.params.id)}`);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e) }); }
});

router.post("/plc/panel-inspections/:id/send-email", async (req, res) => {
  try {
    const r = await db.execute(sql`SELECT * FROM panel_inspections WHERE id=${Number(req.params.id)}`);
    const rows = (r as any).rows ?? r;
    const insp = rows[0];
    if (!insp) return res.status(404).json({ error: "Not found" });
    const toEmail = req.body.email_to || insp.email_to;
    if (!toEmail) return res.status(400).json({ error: "No recipient email" });

    const smtpUser = process.env.GMAIL_USER;
    const smtpPass = process.env.GMAIL_APP_PASSWORD;
    if (!smtpUser || !smtpPass) return res.status(500).json({ error: "Email not configured" });

    const inspNo = insp.inspection_no || `PID-${String(insp.id).padStart(4, "0")}`;
    const checklist: any[] = Array.isArray(insp.checklist) ? insp.checklist : [];
    const issues: any[] = Array.isArray(insp.issues) ? insp.issues : [];

    const resultColor = insp.overall_result === "Pass" ? "#16a34a" : insp.overall_result === "Fail" ? "#dc2626" : "#d97706";

    const pdfBuffer = await pdfBuf((doc, addY, getY) => {
      let y = 40;
      doc.rect(40, y, 515, 72).fill(NAVY);
      doc.fillColor("white").fontSize(18).font("Helvetica-Bold").text("WTT INTERNATIONAL", 54, y + 12);
      doc.fillColor("#93c5fd").fontSize(8).font("Helvetica").text("Water Loving Technology", 54, y + 34);
      doc.fillColor("#93c5fd").fontSize(7.5).text("PANEL INSPECTION REPORT — PRE-DISPATCH", 54, y + 46);
      doc.fillColor("white").fontSize(13).font("Helvetica-Bold").text(inspNo, 54, y + 60, { width: 200 });
      const rColor = insp.overall_result === "Pass" ? "#22c55e" : insp.overall_result === "Fail" ? "#ef4444" : "#f59e0b";
      doc.rect(380, y + 10, 135, 40).fill(rColor);
      doc.fillColor("white").fontSize(10).font("Helvetica-Bold").text(insp.overall_result || "Pending", 380, y + 25, { width: 135, align: "center" });
      y += 90; addY(90);

      y = secHeader(doc, "Inspection Details", y); addY(20);
      const c1W = 160, c2W = 160;
      labelVal(doc, "Inspection No.", inspNo, 40, y, c1W);
      labelVal(doc, "Date", fmtDatePdf(insp.inspection_date), 210, y, c2W);
      labelVal(doc, "Project Number", insp.project_number || "—", 380, y, c2W);
      y += 28; addY(28);
      labelVal(doc, "Project Name", insp.project_name || "—", 40, y, c1W);
      labelVal(doc, "Customer", insp.customer_name || "—", 210, y, c2W);
      labelVal(doc, "Inspector", insp.inspector_name || "—", 380, y, c2W);
      y += 28; addY(28);
      labelVal(doc, "Panel Name / Tag", insp.panel_name || "—", 40, y, c1W);
      labelVal(doc, "Panel Type", insp.panel_type || "—", 210, y, c2W);
      labelVal(doc, "Serial No.", insp.panel_serial_no || "—", 380, y, c2W);
      y += 36; addY(36);

      const sections = [...new Set(checklist.map((c: any) => c.section))];
      for (const section of sections) {
        y = checkPageBreak(doc, y, 60);
        y = secHeader(doc, section, y); addY(20);
        const items = checklist.filter((c: any) => c.section === section);
        doc.fillColor(NAVY).fontSize(7).font("Helvetica-Bold")
           .text("#", 40, y, { width: 14 })
           .text("Inspection Item", 58, y, { width: 240 })
           .text("Result", 304, y, { width: 60 })
           .text("Remarks", 370, y, { width: 185 });
        y += 14; addY(14);
        items.forEach((item: any, idx: number) => {
          y = checkPageBreak(doc, y, 20);
          const bg = idx % 2 === 0 ? "#f8fafc" : "white";
          doc.rect(40, y - 2, 515, 16).fill(bg);
          const rc = item.result === "Yes" ? "#16a34a" : item.result === "No" ? "#dc2626" : "#64748b";
          doc.fillColor(DARK).fontSize(7).font("Helvetica")
             .text(String(idx + 1), 40, y, { width: 14 })
             .text(item.item || "", 58, y, { width: 240 });
          doc.fillColor(rc).font("Helvetica-Bold").text(item.result || "—", 304, y, { width: 60 });
          doc.fillColor(MUTED).font("Helvetica").text(item.remarks || "—", 370, y, { width: 185 });
          y += 16; addY(16);
        });
        y += 6; addY(6);
      }

      if (issues.length > 0) {
        y = checkPageBreak(doc, y, 50);
        y = secHeader(doc, "Issues / Findings", y); addY(20);
        doc.fillColor(NAVY).fontSize(7).font("Helvetica-Bold")
           .text("#", 40, y, { width: 14 })
           .text("Description", 58, y, { width: 220 })
           .text("Severity", 284, y, { width: 80 })
           .text("Status", 370, y, { width: 80 })
           .text("Remarks", 456, y, { width: 99 });
        y += 14; addY(14);
        issues.forEach((issue: any, idx: number) => {
          y = checkPageBreak(doc, y, 20);
          const bg = idx % 2 === 0 ? "#f8fafc" : "white";
          doc.rect(40, y - 2, 515, 16).fill(bg);
          const sc = issue.severity === "Critical" ? "#dc2626" : issue.severity === "Major" ? "#d97706" : "#64748b";
          doc.fillColor(DARK).fontSize(7).font("Helvetica")
             .text(String(idx + 1), 40, y, { width: 14 })
             .text(issue.description || "—", 58, y, { width: 220 });
          doc.fillColor(sc).font("Helvetica-Bold").text(issue.severity || "—", 284, y, { width: 80 });
          doc.fillColor(DARK).font("Helvetica").text(issue.status || "—", 370, y, { width: 80 });
          doc.fillColor(MUTED).text(issue.remarks || "—", 456, y, { width: 99 });
          y += 16; addY(16);
        });
        y += 6; addY(6);
      }

      if (insp.remarks) {
        y = checkPageBreak(doc, y, 40);
        y = textSection(doc, "Remarks / Notes", insp.remarks, y);
      }

      y = checkPageBreak(doc, y, 60);
      y += 10; addY(10);
      doc.rect(40, y, 515, 1).fill("#e2e8f0");
      y += 12; addY(12);
      const sigW = 155;
      doc.fillColor(MUTED).fontSize(7).font("Helvetica").text("Inspector Signature", 40, y, { width: sigW, align: "center" });
      doc.fillColor(MUTED).text("QC / Supervisor", 210, y, { width: sigW, align: "center" });
      doc.fillColor(MUTED).text("Customer Representative", 380, y, { width: sigW, align: "center" });
      y += 12; addY(12);
      doc.fillColor("#94a3b8").fontSize(7).text(insp.inspector_name || "—", 40, y, { width: sigW, align: "center" });
      y += 18; addY(18);
      doc.rect(40, y, sigW, 1).fill("#94a3b8");
      doc.rect(210, y, sigW, 1).fill("#94a3b8");
      doc.rect(380, y, sigW, 1).fill("#94a3b8");

      pdfFooter(doc);
      doc.end();
    });

    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: smtpUser, pass: smtpPass } });

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
  <div style="background:#1e3a5f;padding:28px 32px;">
    <div style="color:white;font-size:20px;font-weight:700;">WTT International</div>
    <div style="color:#93c5fd;font-size:12px;margin-top:4px;">Panel Inspection Report — Pre-Dispatch</div>
  </div>
  <div style="padding:28px 32px;">
    <p style="margin:0 0 16px;font-size:14px;color:#1e293b;">Please find the <strong>Pre-Dispatch Panel Inspection Report</strong> attached.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Inspection No.</td><td style="padding:8px 14px;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0;">${inspNo}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Project</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${insp.project_name || "—"} (${insp.project_number || "—"})</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;border-bottom:1px solid #e2e8f0;">Panel</td><td style="padding:8px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;">${insp.panel_name || "—"} | ${insp.panel_type || "—"}</td></tr>
      <tr><td style="padding:8px 14px;color:#64748b;font-size:12px;">Overall Result</td><td style="padding:8px 14px;font-size:13px;font-weight:700;color:${resultColor};">${insp.overall_result || "Pending"}</td></tr>
    </table>
  </div>
  <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <div style="color:#94a3b8;font-size:11px;">WTT International · PLC &amp; Automation</div>
  </div>
</div></body></html>`;

    await transporter.sendMail({
      from: `"WTT International" <${smtpUser}>`,
      to: toEmail,
      subject: `Panel Inspection Report — ${inspNo} | ${insp.project_name || ""}`,
      html,
      attachments: [{ filename: `${inspNo}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
    });
    res.json({ ok: true, sent_to: toEmail });
  } catch (e: any) { res.status(500).json({ error: e.message || String(e) }); }
});

export default router;
