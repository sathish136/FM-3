import PDFDocument from "pdfkit";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = join(__dir, "../assets/wtt-logo.png");

// ─── Page geometry (A4) ────────────────────────────────────────────────────
const PW = 595.28;
const PH = 841.89;
const ML = 57;          // left margin
const MR = 57;          // right margin
const MT_BODY = 110;    // top of body content (below header)
const MB_BODY = 55;     // bottom margin (above footer)
const CW = PW - ML - MR; // content width

// ─── Colours ──────────────────────────────────────────────────────────────
const TEAL   = "#0D4B6E";
const ORANGE = "#E87A26";
const NAVY   = "#0A2F4A";
const LGRAY  = "#E5E5E5";

// ─── Date helpers ─────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtCoverDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}
function fmtRefDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}.${MONTHS[d.getMonth()]}.${d.getFullYear()}`;
}

// ─── Draw decorative page header ─────────────────────────────────────────
function drawPageHeader(doc: PDFKit.PDFDocument) {
  const hh = 75; // header height

  // left teal block (trapezoid-ish using polygon)
  doc.save()
    .polygon([0, 0], [PW * 0.40, 0], [PW * 0.35, hh], [0, hh])
    .fill(TEAL).restore();

  // right orange block
  doc.save()
    .polygon([PW, 0], [PW * 0.60, 0], [PW * 0.65, hh], [PW, hh])
    .fill(ORANGE).restore();

  // center white band
  doc.save()
    .rect(PW * 0.35, 0, PW * 0.30, hh)
    .fill("#FFFFFF").restore();

  // WTT logo
  if (existsSync(LOGO_PATH)) {
    const logoW = 54, logoH = 60;
    const lx = (PW - logoW) / 2;
    doc.image(LOGO_PATH, lx, 7, { width: logoW, height: logoH });
  }

  // company text in white bands
  doc.save()
    .fillColor("#FFFFFF").fontSize(6.5).font("Helvetica-Bold")
    .text("WTT INTERNATIONAL", ML, 18, { width: PW * 0.33, align: "center" })
    .fontSize(5).font("Helvetica")
    .text("Water Loving Technology", ML, 27, { width: PW * 0.33, align: "center" })
    .restore();

  // thin separator line below header
  doc.save()
    .moveTo(0, hh).lineTo(PW, hh)
    .lineWidth(1).strokeColor(NAVY).stroke()
    .restore();
}

// ─── Draw page footer ────────────────────────────────────────────────────
function drawPageFooter(doc: PDFKit.PDFDocument, pageNum: number, propRef: string) {
  const fy = PH - 38;
  doc.save()
    .moveTo(ML, fy).lineTo(PW - MR, fy)
    .lineWidth(0.5).strokeColor("#000000").stroke();
  doc.font("Helvetica").fontSize(8).fillColor("#000000")
    .text(`Page | ${pageNum}`, ML, fy + 4, { width: 60 })
    .text(propRef, ML + 60, fy + 4, { width: CW - 60, align: "center" })
    .restore();
}

// ─── Add a new page ──────────────────────────────────────────────────────
function addPage(doc: PDFKit.PDFDocument, pageNum: number, propRef: string): number {
  doc.addPage({ size: "A4", margins: { top: MT_BODY, bottom: MB_BODY, left: ML, right: MR } });
  drawPageHeader(doc);
  drawPageFooter(doc, pageNum, propRef);
  return MT_BODY; // return starting y
}

// ─── Thin horizontal rule ─────────────────────────────────────────────────
function hRule(doc: PDFKit.PDFDocument, y: number, x = ML, w = CW) {
  doc.save().moveTo(x, y).lineTo(x + w, y).lineWidth(0.5).strokeColor("#000000").stroke().restore();
}

// ─── Simple cell drawing for tables ──────────────────────────────────────
function cell(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number, y: number, w: number, h: number,
  opts: { bold?: boolean; center?: boolean; bg?: string; fontSize?: number; wrap?: boolean } = {}
) {
  const fs = opts.fontSize ?? 9;
  if (opts.bg) {
    doc.save().rect(x, y, w, h).fill(opts.bg).restore();
  }
  doc.save().rect(x, y, w, h).lineWidth(0.4).strokeColor("#000000").stroke().restore();
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fs).fillColor("#000000");
  const pad = 3;
  const align = opts.center ? "center" : "left";
  if (opts.wrap !== false) {
    doc.text(text, x + pad, y + pad, { width: w - pad * 2, align, lineBreak: true });
  } else {
    doc.text(text, x + pad, y + pad, { width: w - pad * 2, align, lineBreak: false, ellipsis: true });
  }
  doc.restore();
}

// ─── Check if there's enough space, add page if not ──────────────────────
function ensureSpace(
  doc: PDFKit.PDFDocument,
  y: number, needed: number,
  pageNum: { n: number }, propRef: string
): number {
  const maxY = PH - MB_BODY - 40;
  if (y + needed > maxY) {
    pageNum.n++;
    y = addPage(doc, pageNum.n, propRef);
    y += 4;
  }
  return y;
}

// ═══════════════════════════════════════════════════════════════════════════
//   MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════
export function generateProposalPdf(proposal: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      autoFirstPage: false,
      bufferPages: true,
      margins: { top: MT_BODY, bottom: MB_BODY, left: ML, right: MR },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const coverDate = fmtCoverDate(proposal.created_at || new Date().toISOString());
    const refDate   = fmtRefDate(proposal.created_at || new Date().toISOString());
    const flow      = String(proposal.flow_rate || "");
    const company   = String(proposal.company_name || "").toUpperCase();
    const city      = String(proposal.city || "").toUpperCase();
    const country   = String(proposal.country || "BANGLADESH").toUpperCase();
    const propNo    = String(proposal.proposal_no || "WTT-BAN-0001");
    const propRef   = `${refDate}/${propNo}/NP-STP/${flow}K/R0/TCP`;

    const pg = { n: 0 };

    // ──────────────────────────────────────────────────────────────────────
    // PAGE 1 — COVER LETTER
    // ──────────────────────────────────────────────────────────────────────
    pg.n = 1;
    let y = addPage(doc, pg.n, propRef);
    y += 2;

    // Date (right-aligned)
    doc.font("Helvetica").fontSize(10).fillColor("#000000")
      .text(coverDate, ML, y, { width: CW, align: "right" });
    y += 20;

    // To block
    doc.font("Helvetica").fontSize(10).text("To", ML, y);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(10)
      .text(`M/S. ${company},`, ML + 72, y);
    y += 14;
    if (proposal.address) {
      doc.font("Helvetica").fontSize(10).text(proposal.address + ",", ML + 72, y);
      y += 14;
    }
    doc.font("Helvetica-Bold").fontSize(10).text(`${city},`, ML + 72, y);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(10).text(`${country}.`, ML + 72, y);
    y += 20;

    // Proposal No
    doc.font("Helvetica").fontSize(10)
      .text(`[Proposal No: ${propRef}]`, ML, y);
    y += 20;

    // Dear Sir
    doc.font("Helvetica").fontSize(10).text("Dear Sir,", ML, y);
    y += 16;

    // Para 1
    const p1 = `            WTT International Private Limited (WTT) is pleased to provide M/s. ${proposal.company_name} with the Techno Commercial Proposal for supply of engineering & materials for Sewage Treatment Plant of capacity ${flow} M3/Day. In developing this offer WTT worked with you in an effort to understand your project and business needs. The attached proposal outlines the solutions we feel will best meet these objectives.`;
    doc.font("Helvetica").fontSize(10)
      .text(p1, ML, y, { width: CW, align: "justify" });
    y = doc.y + 10;

    // Para 2
    const p2 = `            We greatly appreciate your consideration of WTT for this project. Our measure of success is how well we deliver solutions that help our client to meet their critical business objectives. We hope to have the opportunity to demonstrate this with your good selves.`;
    doc.font("Helvetica").fontSize(10)
      .text(p2, ML, y, { width: CW, align: "justify" });
    y = doc.y + 22;

    // Signature
    doc.font("Helvetica").fontSize(10).text("Yours Sincerely,", ML, y);
    y += 40;
    doc.font("Helvetica-Bold").fontSize(10).text("D. Venkatesh", ML, y);
    y += 14;
    doc.font("Helvetica").fontSize(10).text("Managing Director", ML, y);
    y += 20;

    // Cover review table
    const tW = CW, snoW = 45, prepW = 90, appW = 90, descW = tW - snoW - prepW - appW;
    const rh = 14;
    // header row
    cell(doc, "S.NO",        ML,                   y, snoW,  rh, { bold: true, center: true, bg: "#D8E4EF" });
    cell(doc, "DESCRIPTION", ML + snoW,            y, descW, rh, { bold: true, center: true, bg: "#D8E4EF" });
    cell(doc, "PREPARED",    ML + snoW + descW,     y, prepW, rh, { bold: true, center: true, bg: "#D8E4EF" });
    cell(doc, "APPROVED",    ML + snoW + descW + prepW, y, appW, rh, { bold: true, center: true, bg: "#D8E4EF" });
    y += rh;
    // data row
    const rowH = 40;
    cell(doc, "1.",     ML,                   y, snoW,  rowH, { center: true });
    cell(doc, `Techno Commercial Proposal for –\n"Sewage Treatment Plant of capacity ${flow} M3/Day".`, ML + snoW, y, descW, rowH, { fontSize: 8.5 });
    cell(doc, "CS – GET\n\nAR – AGM",         ML + snoW + descW,     y, prepW, rowH, { center: true, fontSize: 9 });
    cell(doc, "DV – MD",                      ML + snoW + descW + prepW, y, appW,  rowH, { center: true });
    y += rowH + 16;

    // CONFIDENTIALITY
    doc.font("Helvetica-Bold").fontSize(10).text("CONFIDENTIALITY", ML, y);
    y += 14;
    const conf = "            All details, specifications, drawings, images, and all other information submitted by us are only intended to the person/organization to which it is addressed and contains proprietary, confidential and or privileged material. Any review, retransmission, dissemination, or other use of, or of taking action in reliance upon this information by person or entities other than the intended recipient is prohibited. All or part information contained in the document is solely intended to the person or entity addresses and sharing this document in part or in whole is prohibited.";
    doc.font("Helvetica").fontSize(9.5).text(conf, ML, y, { width: CW, align: "justify" });

    // ──────────────────────────────────────────────────────────────────────
    // PAGE 2 — TOC (part 1)
    // ──────────────────────────────────────────────────────────────────────
    pg.n = 2;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Oblique").fontSize(11)
      .text("We feel delighted to present our Patented Systems", ML, y, { width: CW, align: "center" });
    y += 20;
    doc.font("Helvetica-Bold").fontSize(13)
      .text("CONTENT", ML, y, { width: CW, align: "center" });
    y += 20;

    const tocEntries: [string, string, string][] = [
      ["1.","Technical and Engineering Details","4"],
      ["1.1.","INFLUENT FLOW DATA","4"],
      ["1.2.","INFLUENT QUALITY","5"],
      ["2.","Design Basis","5"],
      ["2.1.","DESIGN SYSTEM CHOSEN","5"],
      ["2.2.","PROCESS COMPATIBILITY","6"],
      ["2.3.","EXPECTED TREATED WATER QUALITY","10"],
      ["3.","Equipment Details for Proposed Systems","12"],
      ["3.1.","ROTARY BRUSH SCREENER","12"],
      ["3.2.","DISSOLVED AIR FLOTATION (DAF) SYSTEM","12"],
      ["3.3.","EQUALIZATION SYSTEM","13"],
      ["3.4.","NEUTRALIZATION SYSTEM","13"],
      ["3.5.","DENITRIFICATION SYSTEM","13"],
      ["3.6.","BIOLOGICAL OXIDATION SYSTEM","14"],
      ["3.7.","LAMELLA SETTLER","14"],
      ["3.8.","ULTRA VIOLET SYSTEMS","14"],
      ["3.9.","SCREW PRESS SYSTEM","15"],
      ["3.10.","SUBMERGED CERAMIC MBR SYSTEM","15"],
      ["4.","Equipment Scope of Supply – BY WTT","16"],
      ["5.","Scope of Supply & Installation - BY CLIENT","20"],
      ["6.","Typical Equipment Vendor List","23"],
      ["7.","Pricing Detail","24"],
      ["8.","Happy Customers","26"],
      ["9.","Channel Partners","26"],
      ["10.","Process Description Video","26"],
      ["11.","Commercial Terms and Conditions","27"],
      ["11.1.","TAXES","27"],
      ["11.2.","FREIGHT","27"],
      ["11.3.","INVOICING AND PAYMENT TERMS","27"],
      ["11.4.","EQUIPMENT SHIPMENT","27"],
      ["11.5.","FORCE MAJEURE","27"],
      ["11.6.","PRICING NOTES","28"],
      ["12.","Client Scope of Supply","28"],
      ["12.1.","SAFETY AND ENVIRONMENTAL","28"],
      ["12.2.","JOBSITE AND INSTALLATION REVIEW","29"],
      ["12.3.","START-UP AND COMMISSIONING","30"],
      ["12.4.","FACILITY MANAGEMENT","30"],
      ["12.5.","CONDITIONAL OFFERING","31"],
      ["13.","Appendix","31"],
      ["13.1.","APPENDIX A: CLARIFICATIONS","31"],
      ["13.2.","APPENDIX C: WARRANTY","31"],
    ];

    doc.font("Helvetica").fontSize(9.5);
    for (const [num, title, pg2] of tocEntries) {
      if (y > PH - MB_BODY - 50) {
        pg.n++;
        y = addPage(doc, pg.n, propRef);
      }
      const nx = ML, nw = 32, pgw = 22, tw = CW - nw - pgw;
      doc.text(num, nx, y, { width: nw });
      // dots
      const titleX = nx + nw, titleEnd = titleX + tw;
      doc.text(title, titleX, y, { width: tw - 20 });
      // dot leaders
      const usedW = doc.widthOfString(title);
      let dotX = titleX + usedW + 2;
      while (dotX < titleEnd - pgw - 5) { doc.text(".", dotX, y, { lineBreak: false }); dotX += 4.5; }
      doc.text(pg2, PW - MR - pgw, y, { width: pgw, align: "right" });
      y += 13;
    }

    // ──────────────────────────────────────────────────────────────────────
    // PAGE 3 — Technical Details (influent flow + quality)
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000")
      .text("1. Technical and Engineering Details", ML, y);
    y += 18;

    doc.font("Helvetica-Bold").fontSize(10)
      .text("1.1. INFLUENT FLOW DATA", ML + 14, y);
    y += 14;

    // Influent flow table
    const fw1 = CW / 3;
    const fRh = 16;
    ["STREAM","FEED FLOW RATE","UNIT"].forEach((h, i) => {
      cell(doc, h, ML + i * fw1, y, fw1, fRh, { bold: true, center: true, bg: "#D8E4EF" });
    });
    y += fRh;
    cell(doc, "STP INLET", ML,          y, fw1, fRh, { center: true });
    cell(doc, flow,         ML + fw1,    y, fw1, fRh, { bold: true, center: true });
    cell(doc, "M3/DAY",     ML + fw1*2,  y, fw1, fRh, { center: true });
    y += fRh + 14;

    doc.font("Helvetica-Bold").fontSize(10).text("1.2. INFLUENT QUALITY", ML + 14, y);
    y += 14;

    const iq = [
      ["pH","--","8 – 9"],["BOD","mg/L","300"],["COD","mg/L","700"],
      ["TDS","mg/L","1500"],["TSS","mg/L","200"],["REACTIVE SILICA","mg/l","10"],
      ["TKN","mg/L","60"],["PVA","mg/L","NIL"],["IRON","mg/L","NIL"],
      ["SULPHATE *","mg/L","380"],["CHLORIDE *","mg/L","380"],
      ["HARDNESS","mg/L of CaCO3","200"],["ALKALINITY","mg/L of CaCO3","200"],
      ["TEMPERATURE","ºC","30 – 35"],["OIL & GREASE","mg/L","10"],
      ["OTHER HEAVY METALS *","mg/L","NIL"],
    ];
    const iqSno = 28, iqPar = CW * 0.35, iqUn = CW * 0.25, iqVal = CW - iqSno - iqPar - iqUn;
    const iqRh = 13;
    cell(doc,"S.NO",ML,y,iqSno,iqRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,"PARAMETER",ML+iqSno,y,iqPar,iqRh,{bold:true,bg:"#D8E4EF"});
    cell(doc,"UNIT",ML+iqSno+iqPar,y,iqUn,iqRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,"STP INLET",ML+iqSno+iqPar+iqUn,y,iqVal,iqRh,{bold:true,center:true,bg:"#D8E4EF"});
    y += iqRh;
    iq.forEach(([param, unit, val], i) => {
      cell(doc,`${i+1}.`,ML,y,iqSno,iqRh,{center:true});
      cell(doc,param,ML+iqSno,y,iqPar,iqRh,{fontSize:8.5});
      cell(doc,unit,ML+iqSno+iqPar,y,iqUn,iqRh,{center:true,fontSize:8.5});
      cell(doc,val,ML+iqSno+iqPar+iqUn,y,iqVal,iqRh,{center:true,fontSize:8.5});
      y += iqRh;
    });
    y += 6;
    doc.font("Helvetica").fontSize(8.5).text("The *Parametrical values have been considered for the purpose of designing the treatment system. Any change in these values will impact design & cost of the STP.", ML, y, { width: CW, align: "justify" });
    y = doc.y + 6;
    doc.font("Helvetica").fontSize(8.5).text("The design solution proposed is based on the values as presented in the table above at STP Inlet. All concentrations refer to max concentrations to be used for the system's design. Any change in the actual inlet parameters will have impact on Process Design, Engineering Design, Cost and Performance.", ML, y, { width: CW, align: "justify" });
    y = doc.y + 14;

    doc.font("Helvetica-Bold").fontSize(11).text("2. Design Basis", ML, y);
    y += 16;
    doc.font("Helvetica-Bold").fontSize(10).text("2.1. DESIGN SYSTEM CHOSEN", ML + 14, y);
    y += 14;

    // ──────────────────────────────────────────────────────────────────────
    // PAGE 4 — Design System Chosen table
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    const dsW1=28,dsW2=CW*0.26,dsW3=60,dsW4=CW-dsW1-dsW2-dsW3;
    const dsRh=13;
    cell(doc,"S.NO",ML,y,dsW1,dsRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,"SYSTEM/EQUIPMENT",ML+dsW1,y,dsW2,dsRh,{bold:true,bg:"#D8E4EF"});
    cell(doc,"CAPACITY\n(M3/DAY)",ML+dsW1+dsW2,y,dsW3,dsRh,{bold:true,center:true,bg:"#D8E4EF",fontSize:8});
    cell(doc,"PURPOSE OF THE SYSTEM/EQUIPMENT PROPOSED",ML+dsW1+dsW2+dsW3,y,dsW4,dsRh,{bold:true,bg:"#D8E4EF",fontSize:8.5});
    y += dsRh;
    cell(doc,"OPTION – 1",ML,y,CW,dsRh,{bold:true,center:true,bg:"#EEF3F8"});
    y += dsRh;

    const dsRows: [string,string][] = [
      ["ROTARY BRUSH SCREENER","TO REMOVE COARSE PARTICLES FROM THE EFFLUENT WATER"],
      ["LIFTING PUMP","TO TRANSFER THE EFFLUENT FROM A LOWER ELEVATION TO THE DAF SYSTEM"],
      ["DISSOLVED AIR FLOTATION (DAF) SYSTEM","TO REMOVE FREE OIL & GREASE FROM THE EFFLUENT WATER"],
      ["EQUALIZATION SYSTEM","TO BALANCE FLOW AND LOAD VARIATIONS BEFORE FURTHER TREATMENT"],
      ["NEUTRALIZATION SYSTEM","TO MAINTAIN OPTIMUM pH IN THE BIOLOGICAL OXIDATION SYSTEM"],
      ["DE-NITRIFICATION SYSTEM","TO CONVERT AMMONIACAL NITROGEN INTO NITROGEN GAS"],
      ["BIOLOGICAL OXIDATION SYSTEM","TO BIOLOGICALLY DEGRADE ORGANIC POLLUTANTS USING MICRO-ORGANISMS"],
      ["LAMELLA SETTLER","FOR EFFICIENT SEPARATION OF SOLIDS FROM THE TREATED EFFLUENT WATER"],
      ["UV SYSTEM","TO ELIMINATE HARMFUL MICRO-ORGANISMS FROM THE TREATED EFFLUENT WATER"],
      ["SCREW PRESS SYSTEM","TO DEWATER SLUDGE BY COMPRESSING AND SEPARATING WATER FROM SOLIDS"],
    ];
    dsRows.forEach(([sys, purpose], i) => {
      const rh2 = 22;
      y = ensureSpace(doc, y, rh2, pg, propRef);
      cell(doc,`${i+1}.`,ML,y,dsW1,rh2,{center:true,fontSize:8.5});
      cell(doc,sys,ML+dsW1,y,dsW2,rh2,{fontSize:8});
      cell(doc,flow,ML+dsW1+dsW2,y,dsW3,rh2,{bold:true,center:true,fontSize:8.5});
      cell(doc,purpose,ML+dsW1+dsW2+dsW3,y,dsW4,rh2,{fontSize:8});
      y += rh2;
    });
    y = ensureSpace(doc, y, dsRh * 2, pg, propRef);
    cell(doc,"ADDITIONAL SYSTEMS FOR OPTION – 2",ML,y,CW,dsRh,{bold:true,center:true,bg:"#EEF3F8"});
    y += dsRh;
    const mbr2Rh = 28;
    y = ensureSpace(doc, y, mbr2Rh, pg, propRef);
    cell(doc,"11.",ML,y,dsW1,mbr2Rh,{center:true});
    cell(doc,"SUBMERGED CERAMIC MBR SYSTEM",ML+dsW1,y,dsW2,mbr2Rh,{fontSize:8});
    cell(doc,flow,ML+dsW1+dsW2,y,dsW3,mbr2Rh,{bold:true,center:true});
    cell(doc,"TO REDUCE FOULING POTENTIAL OF RO FEED WATER",ML+dsW1+dsW2+dsW3,y,dsW4,mbr2Rh,{fontSize:8});
    y += mbr2Rh + 8;
    y = ensureSpace(doc, y, 20, pg, propRef);
    doc.font("Helvetica").fontSize(8.5).text("NOTE: System capacities mentioned above are based on STP influent flow Rate and the Actual capacities may vary.", ML, y, { width: CW });
    y = doc.y + 14;

    // 2.2 Process Compatibility
    y = ensureSpace(doc, y, 40, pg, propRef);
    doc.font("Helvetica-Bold").fontSize(10).text("2.2. PROCESS COMPATIBILITY", ML + 14, y);
    y += 14;
    const pcItems = [
      "The incoming raw wastewater shall not contain any substance incompatible with the MOC of the Equipment supplied & inhibitory substances that sufficiently affect the biological treatment stage so as to compromise the operation of any of the system.",
      "The biological treatment is operated and maintained in accordance with good industry practice for wastewater treatment systems.",
      "The Rotary Brush Screener at the plant inlet are installed and operated in such a way that fibrous material and floatable particles are removed reliably and any bypasses of the screens are impossible.",
    ];
    pcItems.forEach((txt, i) => {
      y = ensureSpace(doc, y, 35, pg, propRef);
      doc.font("Helvetica").fontSize(9.5).text(`${i+1}. ${txt}`, ML + 14, y, { width: CW - 14, align: "justify" });
      y = doc.y + 10;
    });

    // OPTION 1 and OPTION 2 flow diagram placeholders
    y = ensureSpace(doc, y, 30, pg, propRef);
    doc.font("Helvetica-Bold").fontSize(10).text("OPTION – 1:", ML, y);
    y += 14;
    doc.save().rect(ML, y, CW, 120).lineWidth(0.5).strokeColor("#AAAAAA").stroke().restore();
    doc.font("Helvetica").fontSize(9).fillColor("#888888").text("[Option 1 – Process Flow Diagram]", ML, y + 55, { width: CW, align: "center" }).fillColor("#000000");
    y += 130;

    y = ensureSpace(doc, y, 150, pg, propRef);
    doc.font("Helvetica-Bold").fontSize(10).text("OPTION – 2:", ML, y);
    y += 14;
    doc.save().rect(ML, y, CW, 120).lineWidth(0.5).strokeColor("#AAAAAA").stroke().restore();
    doc.font("Helvetica").fontSize(9).fillColor("#888888").text("[Option 2 – Process Flow Diagram]", ML, y + 55, { width: CW, align: "center" }).fillColor("#000000");
    y += 130;

    // ──────────────────────────────────────────────────────────────────────
    // PAGE (next) — 2.3 EXPECTED TREATED WATER QUALITY
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(10).text("2.3. EXPECTED TREATED WATER QUALITY", ML + 14, y);
    y += 14;
    doc.font("Helvetica").fontSize(9.5).text("The following performance parameters are expected under standard operating conditions after equipment start-up based on the data and assumptions listed above and in Appendix, Warranties. In case of conflicting numbers, the ones listed under Appendix take precedence:", ML, y, { width: CW, align: "justify" });
    y = doc.y + 12;

    const drawQualTable = (title: string, outHdr: string, rows: string[][], yn: number) => {
      doc.font("Helvetica-Bold").fontSize(9.5).text(title, ML, yn, { width: CW, align: "center" });
      yn += 14;
      const p1w = CW * 0.28, p2w = CW * 0.18, p3w = CW * 0.22, p4w = CW - p1w - p2w - p3w;
      const qRh = 13;
      cell(doc,"PARAMETER",ML,yn,p1w,qRh,{bold:true,center:true,bg:"#D8E4EF"});
      cell(doc,"UNIT",ML+p1w,yn,p2w,qRh,{bold:true,center:true,bg:"#D8E4EF"});
      cell(doc,"STP INLET",ML+p1w+p2w,yn,p3w,qRh,{bold:true,center:true,bg:"#D8E4EF"});
      cell(doc,outHdr,ML+p1w+p2w+p3w,yn,p4w,qRh,{bold:true,center:true,bg:"#D8E4EF",fontSize:8});
      yn += qRh;
      rows.forEach(([param,unit,inlet,outlet]) => {
        cell(doc,param,ML,yn,p1w,qRh,{fontSize:8.5});
        cell(doc,unit,ML+p1w,yn,p2w,qRh,{center:true,fontSize:8.5});
        cell(doc,inlet,ML+p1w+p2w,yn,p3w,qRh,{center:true,fontSize:8.5});
        cell(doc,outlet,ML+p1w+p2w+p3w,yn,p4w,qRh,{center:true,fontSize:8.5});
        yn += qRh;
      });
      return yn;
    };

    const opt1Rows: string[][] = [
      ["pH","--","8 – 9","6 – 7"],["BOD","mg/L","300","< 30 *"],
      ["COD","mg/L","700","< 70 *"],["TDS","mg/L","1500","SAME AS INLET"],
      ["TSS","mg/L","200","< 50 *"],["REACTIVE SILICA","mg/l","10","SAME AS INLET"],
      ["TKN","mg/L","60","< 6 *"],["PVA","mg/L","NIL","NIL"],
      ["IRON","mg/L","NIL","NIL"],["SULPHATE","mg/L","380","SAME AS INLET"],
      ["CHLORIDE","mg/L","380","SAME AS INLET"],["HARDNESS","mg/L of CaCO3","200","SAME AS INLET"],
      ["ALKALINITY","mg/L of CaCO3","200","SAME AS INLET"],["TEMPERATURE","ºC","30 – 35","30 – 35"],
      ["OIL & GREASE","mg/L","10","< 1"],["OTHER HEAVY METALS","mg/L","NIL","NIL"],
    ];
    y = drawQualTable("STP – STAGEWISE PARAMETER (OPTION – 1)","LAMELLA SETTLER\nOUTLET", opt1Rows, y);
    y += 6;
    doc.font("Helvetica").fontSize(8).text("BDL – below detectable limit, NA – not applicable; Values are system generated which may vary with variation in inlet & on operational basis", ML, y, { width: CW });
    y = doc.y + 5;
    doc.font("Helvetica").fontSize(8).text("* Depends on the Biological Degradability of the Effluent, dosage of Disinfectant considering 12 Hours of Retention time for Biological Treatment with 8 meters of water depth and available form of solubility.", ML, y, { width: CW, align: "justify" });
    y = doc.y + 16;

    y = ensureSpace(doc, y, 250, pg, propRef);
    const opt2Rows: string[][] = [
      ["pH","--","8 – 9","6 – 7"],["BOD","mg/L","300","< 25 *"],
      ["COD","mg/L","700","< 60 *"],["TDS","mg/L","1500","SAME AS INLET@"],
      ["TSS","mg/L","200","< 5 *"],["REACTIVE SILICA","mg/l","10","SAME AS INLET"],
      ["TKN","mg/L","60","< 3 *"],["PVA","mg/L","NIL","NIL"],
      ["IRON","mg/L","NIL","NIL"],["SULPHATE","mg/L","380","SAME AS INLET"],
      ["CHLORIDE","mg/L","380","SAME AS INLET"],["HARDNESS","mg/L of CaCO3","200","SAME AS INLET"],
      ["ALKALINITY","mg/L of CaCO3","200","SAME AS INLET"],["TEMPERATURE","ºC","30 – 35","30 – 35"],
      ["OIL & GREASE","mg/L","10","BDL *"],["OTHER HEAVY METALS","mg/L","NIL","NIL"],
    ];
    y = drawQualTable("STP – STAGEWISE PARAMETER (OPTION – 2)","SUBMERGED\nCERAMIC MBR", opt2Rows, y);
    y += 6;
    doc.font("Helvetica").fontSize(8).text("BDL – below detectable limit, NA – not applicable; Values are system generated which may vary with variation in inlet & on operational basis", ML, y, { width: CW });
    y = doc.y + 5;
    doc.font("Helvetica").fontSize(8).text("* Depends on the Biological Degradability of the Effluent, considering 12 Hours of Retention time for Biological Treatment with 6 meters of water depth and available form of solubility.", ML, y, { width: CW, align: "justify" });
    y = doc.y + 10;
    doc.font("Helvetica-Bold").fontSize(9).text("Notes:", ML, y);
    y += 12;
    const notes = [
      "All influent quality parameters are based on daily average values of a minimum of four (4) Nos. of hourly composite samples collected at regular intervals over a day, with testing performed to applicable industry-approved standards.",
      "The treated water parameters could take 2 months for attaining specified values as per above table after successful commissioning.",
      "The above recovery water quality expectation is based on WTT supplying the system and scope Equipment as per the scope of supply table described in section 4 below.",
    ];
    notes.forEach((n) => {
      y = ensureSpace(doc, y, 30, pg, propRef);
      doc.font("Helvetica").fontSize(9).text(`\u2022 ${n}`, ML + 8, y, { width: CW - 8, align: "justify" });
      y = doc.y + 6;
    });

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 3 — Equipment Details
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("3. Equipment Details for Proposed Systems", ML, y);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(10).text("OPTION – 1", ML, y);
    y += 14;

    const eqSections: [string, string][] = [
      ["3.1. ROTARY BRUSH SCREENER",
       "Automated Brush Screener separates coarse & medium fine solids of size above 2 mm from influent. This process is a predetermined stage where escaping of solids is completely avoided, where by clogging of pumps & machinery in subsequent steps gets nullified. The collected wastes have to be disposed periodically and the screener is attached with brush."],
      ["3.2. DISSOLVED AIR FLOTATION (DAF) SYSTEM",
       "DAF system used to remove total suspended solids (TSS) and oils & greases (O&G) from effluent water; this effectively reduces the pollutant load in biological system. Circulation pump provided for the recirculation of Effluent into the DAF system along with Customer provided compressed air for flotation of suspends and oils. Scrapping mechanism provided for highly efficient separation of floating suspends and Oils & Greases."],
      ["3.3. EQUALIZATION SYSTEM",
       "Equalization system used to homogenize different wastewater characteristics to achieve uniform pollutant load. The continuous mixing and water movement maintained by diffused aeration to avoid the dead zone, solids sedimentation and anaerobic fermentation."],
      ["3.4. NEUTRALIZATION SYSTEM",
       "The Biological oxidation system requires a neutral or slightly alkaline pH value for the optimum performance. Neutralization is carried out automatically depending on the pH of the inlet water."],
      ["3.5. DENITRIFICATION SYSTEM",
       "Anoxic digestion is a series of biological processes that occur in the absence of oxygen, where microorganisms break down biodegradable materials. A key component of this process is denitrification, which is the conversion of nitrate nitrogen into nitrogen gas in the absence of oxygen. The transformation follows a specific reduction pathway: Ammoniacal nitrogen is oxidized in Biological tank to nitrite and then into nitrate form. This nitrate (NO₃⁻) is reduced to nitrite (NO₂⁻), then to nitric oxide (NO), followed by nitrous oxide (N₂O), and finally to nitrogen gas (N₂) upon recirculating the Aerated treated water from Biological Tank to De-Nitrification Tank. This stepwise reduction is carried out by specialized bacteria that use nitrogen compounds as electron acceptors instead of oxygen. The end product, nitrogen gas, is released into the atmosphere, effectively removing nitrogen from wastewater."],
      ["3.6. BIOLOGICAL OXIDATION SYSTEM",
       "In the biological oxidation system, microorganisms are used to degrade organic pollutants in the wastewater. The system is designed to maintain an optimum environment for the growth of microorganisms. The microorganisms consume the organic matter in the wastewater and convert it into carbon dioxide, water, and new cell biomass. The system is equipped with fine bubble diffusers for aeration and mixing. The diffusers are designed to provide a uniform distribution of air in the biological tank."],
      ["3.7. LAMELLA SETTLER",
       "Lamella settlers used for efficient separation of solids from the treated effluent water. The lamella plates create a large settling area for the solids to settle down. The settled solids are collected in the sludge hopper and are pumped to the sludge thickener."],
      ["3.8. ULTRA VIOLET SYSTEMS",
       "Ultraviolet (UV) disinfection system is designed to eliminate harmful micro-organisms from the treated effluent water. The UV system is equipped with low pressure UV lamps that emit UV light at a wavelength of 254 nm. The UV light damages the DNA of the micro-organisms and prevents them from reproducing. The system is equipped with a conductivity sensor to monitor the quality of the treated water."],
      ["3.9. SCREW PRESS SYSTEM",
       "Screw press system is designed to dewater sludge by compressing and separating water from solids. The screw press is equipped with a poly dosing system to enhance the dewatering efficiency. The dewatered sludge cake is collected and disposed of as per local regulations."],
      ["3.10. SUBMERGED CERAMIC MBR SYSTEM",
       "Submerged Ceramic MBR system is designed to reduce the fouling potential of RO feed water. The ceramic membranes have a higher membrane life and auto cleaning capabilities. The system is equipped with a backwash pump to clean the membranes periodically. The MBR system is designed to operate in a submerged configuration to minimize energy consumption."],
    ];
    eqSections.forEach(([heading, body]) => {
      y = ensureSpace(doc, y, 50, pg, propRef);
      doc.font("Helvetica-Bold").fontSize(10).text(heading, ML + 14, y);
      y += 13;
      doc.font("Helvetica").fontSize(9.5).text(body, ML + 14, y, { width: CW - 14, align: "justify" });
      y = doc.y + 14;
    });

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 4 — Equipment Scope of Supply BY WTT
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("4. Equipment Scope of Supply – BY WTT", ML, y);
    y += 16;

    const drawEqTable = (letter: string, header: string, groups: Array<{sno: number; desc: string; specs: [string,string][]}>) => {
      const etW1=30, etW2=CW*0.22, etW3=CW-etW1-etW2-CW*0.22, etW4=CW*0.22;
      const etHdr = 14;
      y = ensureSpace(doc, y, 20, pg, propRef);
      cell(doc,`${letter}    ${header}`, ML, y, CW*0.7, etHdr, {bold:true, bg:"#EEF3F8"});
      cell(doc,`${flow} M3/DAY`, ML+CW*0.7, y, CW*0.3, etHdr, {bold:true, center:true, bg:"#EEF3F8"});
      y += etHdr;
      cell(doc,"S.NO",ML,y,etW1,etHdr,{bold:true,center:true,bg:"#D8E4EF"});
      cell(doc,"DESCRIPTION",ML+etW1,y,etW2,etHdr,{bold:true,bg:"#D8E4EF"});
      cell(doc,"SPECIFICATION",ML+etW1+etW2,y,etW3,etHdr,{bold:true,bg:"#D8E4EF"});
      cell(doc,"QUANTITY",ML+etW1+etW2+etW3,y,etW4,etHdr,{bold:true,center:true,bg:"#D8E4EF"});
      y += etHdr;
      groups.forEach(({sno,desc,specs}) => {
        const rowH = specs.length * 13;
        y = ensureSpace(doc, y, rowH, pg, propRef);
        cell(doc,`${sno}.`,ML,y,etW1,rowH,{center:true});
        cell(doc,desc,ML+etW1,y,etW2,rowH,{fontSize:8});
        const specH = rowH / specs.length;
        specs.forEach(([spec,qty],si) => {
          cell(doc,spec,ML+etW1+etW2,y+si*specH,etW3,specH,{fontSize:8});
          cell(doc,qty,ML+etW1+etW2+etW3,y+si*specH,etW4,specH,{center:true,fontSize:8});
        });
        y += rowH;
      });
    };

    drawEqTable("A","BIOLOGICAL SYSTEM (OPTION – 1)",[
      {sno:1,desc:"SCREENER\n& LIFTING PUMP",specs:[["ROTARY BRUSH SCREENER","1 No."],["MESH SIZE","2MM"],["MOC","SS316"],["LIFTING PUMP","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI / CI"],["PUMP TYPE","SUBMERSIBLE"]]},
      {sno:2,desc:"DISSOLVED AIR\nFLOTATION (DAF)\nSYSTEM",specs:[["DAF SYSTEM","1 No."],["DAF SCRAPPER MOC","NON-METALLIC"],["DAF CIRCULATION PUMP","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI / SS"],["PUMP TYPE","AIR-WATER SUCTIONING TYPE\n(NANO BUBBLE GENERATION PUMP)"],["SLUDGE PUMP","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI / CI"],["PUMP TYPE","SURFACE MOUNTED"]]},
      {sno:3,desc:"EQUALIZATION\nTANK",specs:[["DIFFUSER","1 LOT"],["DIFFUSER SIZE",'11"'],["DIFFUSER PORES SIZE","80 MICRON"],["DIFFUSER TYPE","FINE BUBBLE"],["DIFFUSER MOC","PP-GF disc with SILICON membrane"],["DIFFUSER GRID PIPING MOC","SS316L"]]},
      {sno:4,desc:"BIOLOGICAL\nFEED SYSTEM",specs:[["BIOLOGICAL FEED PUMPS","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI / CI"],["PUMP TYPE","SUBMERSIBLE"],["LEVEL TRANSMITTER","1 No."],["pH SENSOR","1 No."],["pH SENSOR RANGE","0 – 14"],["NEUTRALIZATION DOSING PUMPS","1W + 1SS"],["PUMP MOC","TEFLON"],["ELECTROMAGNETIC FLOWMETER","1 No."]]},
      {sno:5,desc:"DENITRIFICATION\nSYSTEM",specs:[["DENITRIFICATION PUMP","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI/CI"],["PUMP TYPE","SUBMERSIBLE"],["FLOW MIXER FOR DENITRIFICATION SYSTEM","1"]]},
      {sno:6,desc:"BIOLOGICAL\nSYSTEM",specs:[["BLOWER FOR BIOLOGICAL &\nEQUALIZATION TANK AERATION","1W + 1S"],["BLOWER TYPE","LOBE"],["DO SENSOR","1"],["DO SENSOR RANGE","0 – 5 PPM"],["DIFFUSER","1 LOT"],["DIFFUSER SIZE",'11"'],["DIFFUSER PORES SIZE","80 MICRON"],["DIFFUSER TYPE","FINE BUBBLE"],["DIFFUSER MOC","PP-GF disc with SILICON membrane"],["DIFFUSER GRID PIPING MOC","SS316L / PP-GF"]]},
      {sno:7,desc:"LAMELLA SETTLER\n& SLUDGE\nRECIRCULATION\nSYSTEM",specs:[["LAMELLA SETTLER","1 LOT"],["LAMELLA SETTLER FRAME MOC","SS316"],["LAMELLA PACKS MOC","PVC"],["SLUDGE RECIRCULATION PUMP","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI / CI"],["PUMP TYPE","SUBMERSIBLE"]]},
      {sno:8,desc:"SLUDGE THICKENER\n& SCREW PRESS",specs:[["PIPING FOR SLUDGE THICKENER","1 LOT"],["PIPING MOC","SS316L"],["SCREW PRESS SYSTEM","1"],["SCREW PRESS FEED PUMPS","1W + 1S"],["SCREW PRESS POLY DOSING PUMPS","1W + 1SS"],["POLY PREPARATORY UNIT","1"]]},
    ]);

    y = ensureSpace(doc, y, 20, pg, propRef);
    y += 6;

    drawEqTable("B","ULTRA VIOLET SYSTEM",[
      {sno:9,desc:"ULTRA VIOLET\nSYSTEM @",specs:[["TOTAL NUMBER OF UNITS","1 No's"],["FEED PUMP","1W"],["PUMP MOC (CASING/IMPELLER)","CI/CI"],["PUMP TYPE","SURFACE MOUNTED"],["UV LAMPS","1 LOT"],["TYPE OF LAMP","LOW PRESSURE – 254 nm"],["UV CHAMBER MATERIAL","SS316L"],["INTERNAL / EXTERNAL FINISH","0.4 Ra / ELECTRO POLISH"],["PANEL PROTECTION","IP54"],["CONDUCTIVITY SENSOR","2"]]},
    ]);

    y = ensureSpace(doc, y, 10, pg, propRef);
    doc.font("Helvetica").fontSize(8.5).text("@ The disinfection system proposed in Option 1 will be utilized for disinfection of MBR permeate during Option-2.", ML, y + 4, { width: CW });
    y = doc.y + 10;

    drawEqTable("B","SUBMERGED CERAMIC MBR SYSTEM (OPTION – 2)",[
      {sno:10,desc:"SUBMERGED\nCERAMIC MBR\nSYSTEM",specs:[["NO. OF MODULES","1 LOT"],["NO. OF TRAINS","1"],["MOC OF MODULE","CERAMIC"],["PERMEATE/BACKWASH PUMP","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI / CI"],["TYPE OF PUMP","SURFACE MOUNTED"],["SLUDGE TRANSFER PUMP","1W + 1S"],["PUMP MOC (CASING/IMPELLER)","CI / CI"],["PUMP TYPE","SURFACE MOUNTED"],["DOSING PUMP","2W"],["DOSING PUMP MOC","PP"],["ELECTROMAGNETIC FLOW METER","PERMEATE"]]},
    ]);

    y = ensureSpace(doc, y, 30, pg, propRef);
    doc.font("Helvetica").fontSize(8.5).text("W – Working; S – Standby; SS – Store Standby", ML, y + 8);
    y = doc.y + 6;
    doc.font("Helvetica").fontSize(8.5).text("Specification and quantity details mentioned above are preliminary and may be revised to optimize the performance of the system.", ML, y, { width: CW });
    y = doc.y + 14;

    // OTHER GENERAL ITEMS
    y = ensureSpace(doc, y, 30, pg, propRef);
    doc.font("Helvetica-Bold").fontSize(10).text("OTHER GENERAL ITEMS IN WTT's SCOPE:", ML, y);
    y += 14;
    const generalItems = [
      "Piping in SS, UPVC and its associated items",
      "All other related valves and puddle flanges required",
      "Electrical control panel for proposed system with standard automation",
      "Power cable and control cable within the electrical panel",
      "Power cable and control cable from electrical panel to proposed equipment",
      "General layout & civil detailed drawing for proposed systems",
    ];
    generalItems.forEach(item => {
      y = ensureSpace(doc, y, 14, pg, propRef);
      doc.font("Helvetica").fontSize(9.5).text(`\u2022 ${item}`, ML + 8, y, { width: CW - 8 });
      y = doc.y + 4;
    });

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 5 — Scope BY CLIENT
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("5. Scope of Supply & Installation - BY CLIENT", ML, y);
    y += 16;
    const clientItems = [
      "Installation of supplied Equipment.",
      "Transfer of Influent up to proposed Screener system.",
      "All civil related and excavation works, civil structural drawings, underground piping & piping for electrical cabling during civil works.",
      "Chemical supply and Bulk chemical storage tanks (with fume absorber for acid tanks) for proposed systems based on the available optimum level of chemical procurement",
      "Raw / Permeate water transfer for cleaning of Proposed Filtration system",
      "Raw water supply for whole plant and treated water transfer",
      "Compressed air for DAF and pneumatic panel for proposed systems",
      "Air conditioning Systems for Panel room & Personal Computers",
      "Optimum Bacteria for biological tanks during commissioning & operation",
      "All loading & unloading @ site",
      "Sludge disposal during plant commissioning & operation",
      "Utilities like Power, Steam, Welding gas, Hot water etc., if Required",
      "Separate panel, wiring with fans & lights for whole plant & its power supply",
      "Incomer cable & its connections with WTT supplied electrical panel and stabilized power supply",
      "All Necessary Earthing & Safety/Protective Earthing shall be provided for individual Instruments, Motor/Pump, Other Electrical Equipment & Panel as per requirement Input power to individual WTT supplied electrical panel",
      "Pre-Shipment Inspection requested by the local authorities.",
      "All license fees and / or custom duties.",
      "Provide Food (3 meals a day), Accommodation with attached sanitary facility (Hotel/Guest House) and Local transport to the team of WTT during all kinds of deputations",
      "Installation consumables (such as welding electrodes, cutting disk and others).",
      "Supply and assembly of all drainage lines for rain water, sewers, etc.",
      "Any construction approval from local Authorities.",
      "Supply of any hoisting and/or laying equipment (cranes forklift, etc.) both truck mounted or not.",
      "Construction of site fencing/railing.",
      "Protection for all field instruments, local switches, motors, etc.,",
      "Safety handrails for all tanks, safety items like life buoy rings, eye washer, life-jackets, etc.",
      "Removal of all residual debris after construction and thorough cleaning of all tanks before plant start-up.",
      "Any further item not described in our offer.",
    ];
    clientItems.forEach(item => {
      y = ensureSpace(doc, y, 16, pg, propRef);
      doc.font("Helvetica").fontSize(9.5).text(`\u2022 ${item}`, ML + 8, y, { width: CW - 8, align: "justify" });
      y = doc.y + 4;
    });

    y = ensureSpace(doc, y, 20, pg, propRef);
    y += 8;
    doc.font("Helvetica-Bold").fontSize(10).text("HIGHLIGHTS", ML, y);
    y += 14;
    const highlights = [
      "Our scope of supplies is of SS316L pipes for Airline, MBR & RO pipe line materials like UPVC are used only in areas where SS316L is not compatible.",
      "Rotary Brush Screener fabricated at a world class manufacturing facility with SS316 having sturdy axial rotating brush arm with long-lasting Nylon Bristles enables screening by employing punched hole sheets up to mesh size of 2mm.",
      "DO Sensor based Automation for Biological Aeration to maintain balanced F/M ratio.",
      "Diffusers made of long-lasting PP-GF Silicon membrane and enables utmost mixing by fine bubbles.",
      "Submerged CERAMIC MBR system with a higher membrane life and auto cleaning capabilities",
      "Rapid Filtration & Backwash Sequence with automatic valves for pre-filtration.",
      "All part of the plant has Level sensors and floats to have complete data on volume of water in each tank.",
      "Electrical panel supplied by WTT with necessary cooling technologies and easy operative switch for Automatic & Manual operations.",
      "PC controlled HMI panel provided with complete automation and acknowledgement & warnings for cleaning necessities based on the operating conditions.",
    ];
    highlights.forEach(h => {
      y = ensureSpace(doc, y, 20, pg, propRef);
      doc.font("Helvetica").fontSize(9.5).text(`\u2022 ${h}`, ML + 8, y, { width: CW - 8, align: "justify" });
      y = doc.y + 5;
    });

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 6 — Vendor List
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("6. Typical Equipment Vendor List", ML, y);
    y += 16;

    const vendors = [
      ["DIFFUSER","OTT / GEOTIERRE"],["BLOWER","ROBUSCHI"],
      ["SUBMERSIBLE PUMP","GRUNDFOS / XYLEM / EBARA"],
      ["SURFACE MOUNTED PUMP","EBARA / LOWARA"],
      ["DOSING PUMP","PROMINENT / MILTON ROY"],
      ["VARIABLE FREQUENCY DRIVE","YASKAWA"],
      ["ELECTROMAGNETIC FLOWMETER","E+H / SIEMENS"],
      ["INLINE ANALYZERS","E+H / HACH / PROMNENT"],
      ["LEVEL TRANSMITTER","E+H / PUNE TECTROL"],
      ["LEVEL FLOAT","FAES"],
      ["PRESSURE TRANSMITTER","DANFOSS"],
      ["PRESSURE GAUGE","FORBES MARSHALL"],
      ["AUTOMATION","BECKHOFF / SIEMENS"],
      ["ELECTRICAL PANEL","RITTAL / HOFFMAN"],
      ["ELECTRICAL CABLE","LAPP"],
      ["SCREENER",""],["DAF SYSTEM",""],
      ["LAMELLA SETTLER","WTT INTERNATIONAL"],
      ["UV SYSTEM",""],["SCREW PRESS",""],
    ];
    const vW1=32, vW2=CW*0.40, vW3=CW-vW1-vW2;
    const vRh=14;
    cell(doc,"S.NO",ML,y,vW1,vRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,"EQUIPMENT",ML+vW1,y,vW2,vRh,{bold:true,bg:"#D8E4EF"});
    cell(doc,"VENDORS",ML+vW1+vW2,y,vW3,vRh,{bold:true,bg:"#D8E4EF"});
    y += vRh;
    vendors.forEach(([eq,vnd],i) => {
      y = ensureSpace(doc, y, vRh, pg, propRef);
      cell(doc,`${i+1}.`,ML,y,vW1,vRh,{center:true,fontSize:8.5});
      cell(doc,eq,ML+vW1,y,vW2,vRh,{fontSize:8.5});
      cell(doc,vnd,ML+vW1+vW2,y,vW3,vRh,{fontSize:8.5});
      y += vRh;
    });
    y += 8;
    doc.font("Helvetica").fontSize(9).text("The above-mentioned vendors are subjected to change based on the delivery terms for an equivalent vendor without compromising the quality and WTT reserves the right to change the vendor without any prior intimation.", ML, y, { width: CW, align: "justify" });
    y = doc.y + 20;

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 7 — Pricing Detail
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("7. Pricing Detail", ML, y);
    y += 16;
    doc.font("Helvetica-Bold").fontSize(10).text(`PRICE FOR PROPOSED SYSTEMS – (OPTION – 1)`, ML, y, { width: CW, align: "center" });
    y += 14;
    const prW1=32, prW2=CW-prW1-100, prW3=100;
    cell(doc,"S.NO",ML,y,prW1,vRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,`SYSTEM/EQUIPMENT - ${flow} M3/DAY`,ML+prW1,y,prW2,vRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,"PRICE IN USD",ML+prW1+prW2,y,prW3,vRh,{bold:true,center:true,bg:"#D8E4EF"});
    y += vRh;
    const pr1H=42;
    cell(doc,"1.",ML,y,prW1,pr1H,{center:true});
    cell(doc,"BIOLOGICAL SYSTEM\n(WHICH INCLUDES SCREENER, LIFTING PUMP, DAF, EQUALIZATION SYSTEM, NEUTRALIZATION SYSTEM, DENITRIFICATION SYSTEM, BIOLOGICAL SYSTEM, LAMELLA SETTLER, SRS & SCREW PRESS) & UV SYSTEM",ML+prW1,y,prW2,pr1H,{fontSize:8});
    cell(doc,"$",ML+prW1+prW2,y,prW3,pr1H,{center:true});
    y += pr1H;
    cell(doc,"TOTAL PRICE FOR PROPOSED SYSTEMS",ML,y,prW1+prW2,vRh,{bold:true,center:true,bg:"#EEF3F8"});
    cell(doc,"$",ML+prW1+prW2,y,prW3,vRh,{bold:true,center:true});
    y += vRh + 20;

    doc.font("Helvetica-Bold").fontSize(10).text(`PRICE FOR PROPOSED SYSTEMS – (OPTION – 2)`, ML, y, { width: CW, align: "center" });
    y += 14;
    cell(doc,"S.NO",ML,y,prW1,vRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,`SYSTEM/EQUIPMENT - ${flow} M3/DAY`,ML+prW1,y,prW2,vRh,{bold:true,center:true,bg:"#D8E4EF"});
    cell(doc,"PRICE IN USD",ML+prW1+prW2,y,prW3,vRh,{bold:true,center:true,bg:"#D8E4EF"});
    y += vRh;
    cell(doc,"1.",ML,y,prW1,vRh,{center:true});
    cell(doc,"SUBMERGED CERAMIC MBR SYSTEM",ML+prW1,y,prW2,vRh,{fontSize:9});
    cell(doc,"$",ML+prW1+prW2,y,prW3,vRh,{center:true});
    y += vRh;
    cell(doc,"TOTAL PRICE FOR PROPOSED SYSTEMS",ML,y,prW1+prW2,vRh,{bold:true,center:true,bg:"#EEF3F8"});
    cell(doc,"$",ML+prW1+prW2,y,prW3,vRh,{bold:true,center:true});
    y += vRh + 16;

    doc.font("Helvetica").fontSize(9.5).text("All above mentioned prices given for the proposed systems with complete automation", ML, y, { width: CW });
    y += 16;
    const priceNotes = [
      "Pricing provided herein does not include any duties and taxes",
      "Pricing provided herein is on Ex-Works basis & does not include the insurance charges",
      "Supervision of erection and commissioning of WTT supplied system shall be extra",
      "Payment/commercial terms & conditions as per WTT's General Terms & Conditions of sale",
      "Price valid for 15 days from the date of proposal due to market volatility",
    ];
    priceNotes.forEach(n => {
      doc.font("Helvetica").fontSize(9.5).text(`\u2022 ${n}`, ML + 8, y, { width: CW - 8 });
      y = doc.y + 4;
    });

    // ──────────────────────────────────────────────────────────────────────
    // SECTIONS 8-10 — Happy Customers, Channel Partners, Video
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("8. Happy Customers", ML, y);
    y += 14;
    doc.save().rect(ML, y, CW, 80).lineWidth(0.5).strokeColor("#AAAAAA").stroke().restore();
    doc.font("Helvetica").fontSize(9).fillColor("#888888").text("[Customer References / Photos]", ML, y+35, { width: CW, align: "center" }).fillColor("#000000");
    y += 90;

    doc.font("Helvetica-Bold").fontSize(11).text("9. Channel Partners", ML, y);
    y += 14;
    doc.save().rect(ML, y, CW, 80).lineWidth(0.5).strokeColor("#AAAAAA").stroke().restore();
    doc.font("Helvetica").fontSize(9).fillColor("#888888").text("[Channel Partner Logos / Information]", ML, y+35, { width: CW, align: "center" }).fillColor("#000000");
    y += 90;

    doc.font("Helvetica-Bold").fontSize(11).text("10. Process Description Video", ML, y);
    y += 14;
    doc.save().rect(ML, y, CW, 60).lineWidth(0.5).strokeColor("#AAAAAA").stroke().restore();
    doc.font("Helvetica").fontSize(9).fillColor("#888888").text("[Process Video Link / QR Code]", ML, y+25, { width: CW, align: "center" }).fillColor("#000000");

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 11 — Commercial Terms
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("11. Commercial Terms and Conditions", ML, y);
    y += 16;

    const commercialSections: [string, string][] = [
      ["11.1. TAXES",
       "Taxes and Duties shall be extra as applicable. Pricing provided herein does not include any taxes of destination country.\n\nIf Tax Exemption is applicable, customer has to provide a copy to WTT of any applicable tax exemption certificates as issued by an approved taxation authority for the specific project location. Without an approved tax exemption certificate received by WTT all submitted invoices will include applicable tax. However, we reserve the right to revise our price in case of tax exemption."],
      ["11.2. FREIGHT",
       "All the Equipment and components foresee Ex-works delivery as per I.C.C. Incoterms-2010."],
      ["11.3. INVOICING AND PAYMENT TERMS",
       "The pricing quoted in this proposal is based on the following payment terms, in principally agreed.\n\n(1) 30% Advance Payment along with PI.\n(2) 70% by irrevocable Letter of Credit payable at sight against Shipment documents.\n\nEquipment shipment is contingent on receipt of earlier milestone payments."],
      ["11.4. EQUIPMENT SHIPMENT",
       "Client and WTT will arrange a kick off meeting after contract acceptance to develop firm shipment schedule. This estimated delivery schedule assumes no more than 1 week for Client review of submittal drawings. Any delays in Client approvals or requested changes may result in additional charges and/or a delay to the schedule.\n\nMaterial supply for the proposed plant in 5 - 6 months is expected. The delivery schedule excludes the months of August & December, the delivery schedule is subject to review and adjustment. Partial shipments are allowed. In case of modifications to the volume of the supply after the emission of the order confirmation, WTT reserves the right to modify the delivery time and the agreed price."],
      ["11.5. FORCE MAJEURE",
       "Please be advised that force majeure is applicable to the quotation provided. The unforeseen and uncontrollable events as defined in our terms and conditions, such as natural disasters, wars or pandemics & other events that prevent the parties from fulfilling their contractual commitments have occurred, impacting our ability to honor the terms outlined in this quotation. We will diligently review the situation and promptly communicate any necessary adjustments or potential delays in fulfilling the quoted services or products in compliance with the force majeure provisions outlined in our agreement."],
      ["11.6. PRICING NOTES",
       "All prices are quoted in USD. Any applicable tax of destination country is not included. Client will pay all applicable Local, State / Provincial, or Federal taxes & Duties. WTT may manufacture and source the Equipment and any part thereof globally in the country or countries of its choosing, provided that the Equipment complies with all of the requirements specified in this Agreement.\n\nThe Equipment delivery date, start date, and date of commencement of operations are to be negotiated. Title and risk of loss will transfer upon delivery in accordance with the INCOTERMS 2010. Commercial Terms and Conditions shall be in accordance with WTT's General Terms and Conditions of Sale as included in Appendix."],
    ];

    commercialSections.forEach(([heading, body]) => {
      y = ensureSpace(doc, y, 50, pg, propRef);
      doc.font("Helvetica-Bold").fontSize(10).text(heading, ML + 14, y);
      y += 13;
      doc.font("Helvetica").fontSize(9.5).text(body, ML + 14, y, { width: CW - 14, align: "justify" });
      y = doc.y + 14;
    });

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 12 — Client Scope
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("12. Client Scope of Supply", ML, y);
    y += 16;

    const clientSections: [string, string][] = [
      ["12.1. SAFETY AND ENVIRONMENTAL",
       "First aid, emergency medical response, eyewash & safety showers in the water treatment area. Chemical spill response, security & fire protection systems as per local codes. Environmental use and discharge permits for all chemicals at Client facility either listed in this document or proposed for use at a later date. Any special permits required for WTT's or Client employees to perform work related to the water treatment system at the facility. All site testing, including soil, ground and surface water, and air emissions, etc. Disposal of all solid & liquid waste from WTT's system including waste materials generated during construction, startup and operation.\n\nProvide appropriate protection of the environment & local community, the health and safety of all workers and visitors at the site and the security of the facility. Provide safety related equipment & services such as site security, fire systems, lifting equipment and its operation, fall protection, adequate floor grating, ventilation, and safe access to equipment & electrical systems areas.\n\nEquipment and trained support personnel for any confined space entry required during equipment installation/startup/commissioning/servicing. For permit-required confined space entry, a qualified rescue team on stand-by and available to respond within 4 minutes of an emergency.\n\nClient will identify and inform WTT's personnel of any hazards present in the work place that could impact the delivery of WTT's scope of supply and agrees to work with WTT to remove, monitor, and control the hazards to a practical level. Client will provide training to WTT's personnel on all relevant & standard company operating procedures and practices for performing work on site."],
      ["12.2. JOBSITE AND INSTALLATION REVIEW",
       "Review of WTT's supplied equipment drawings and specifications. All easements, licenses and permits required by governmental or regulatory authorities in Connection with the supply, erection and operation of the system.\n\nOverall plant design, detail drawings of all termination points where WTT's equipment or Materials tie into equipment or materials supplied by others Stamping, signing or Sealing General drawings as per State, or local regulations or codes. All applicable civil design and works, including any building, site preparation, grading, excavations, foundations and trenches and accessories.\n\nAll electrical Labor and supplies leading up to jobsite including fittings, conduit, supports, cable trays, wire and hardware, air-conditioning of panels required to appropriately ground / earth the equipment as required for installation and ongoing operations.\n\nAll mechanical Labor and supplies leading up to jobsite including interconnecting piping, heat tracing (if required), fittings, conduit, pipe supports, and hardware as required for installation and ongoing operations. All instrumentation and automatic pneumatic valves including but not limited to; air/sample line tubing, fittings, conduit, supports, isolating valves as required for installation and ongoing operations. Loading, unloading and transportation of equipment, materials required for WTT to perform duties outlined in WTT's Scope of Supply to the jobsite and/or warehouse.\n\nClient will provide all access structures (scaffolding), mechanical lifting equipment (cranes, forklifts, scissor lifts, etc.), suitable site/shelter for placement of the proposed equipment, either inside appropriate housing, or outdoors.\n\nPrecaution: electrical equipment including the PLC may require air-conditioned rooms to prevent overheating of sensitive electronic equipment depending on climatic conditions. Bulk chemical storage and tanks, including secondary containment in accordance with local codes."],
      ["12.3. START-UP AND COMMISSIONING",
       "Installation & removal of temporary screens on all process lines Flushing and disinfection of all piping and tanks (including process equipment tanks) and verification of removal of all residual debris from construction. Alignments & required materials for rotating equipment MEG testing of all field motor power wiring (as required). Continuity checks for all electrical field wiring as per Installation Checklist, Hydro-testing of all field installed piping. Supply raw materials, oil/lubricants chemicals and utilities during start-up and operation. Electrical & Mechanical support labor for commissioning activities, loading of membranes, stacks, modules, etc."],
      ["12.4. FACILITY MANAGEMENT",
       "Client will provide such warehouse storage space and facilities, as are available at the site, and are reasonably appropriate to store parts, consumables, tools, etc. in accordance with manufacturer's recommendations. Such warehouse storage space will be a segregated area, secured and protected from adverse climate as may reasonably be required. The storage area shall be facilitated with 24 hours lock & key with security and Client will be responsible for risk of loss of WTT's parts while in storage at the site. Client will maintain WTT's parts stored at the site free & clear of any and all liens of Client and lenders, bondholders, contractors & other creditors of any nature.\n\nClient will afford WTT's personnel free access and egress of the facility for all authorized work. Provide workshop facilities/area with roof and stabilized power supply, as is reasonably appropriate to carry out machining/fabrication works.\n\nProvide adequate illumination and emergency lighting for all areas in which the WTT will be executing the scope of supply. Identify a Client project contact person to be available to WTT's personnel to address any issues related to WTT's execution of WTT's scope of work. Responsible for the equipment for movement of chemical drums, totes, and resins, as is reasonable. Provide all site utilities such as raw water, instrument quality air, potable water and power required for operation of the proposed equipment included in this scope of supply."],
      ["12.5. CONDITIONAL OFFERING",
       "Client understands that this order confirmation has been issued based upon the information provided by Client and currently available to, WTT at the time of proposal issuance. Any changes or discrepancies in site conditions (including but not limited to system influent characteristics, changes in Environmental Health and Safety (\"EH&S\") conditions, and/or newly discovered EH&S concerns), Client financial standing, Client requirements, or any other relevant change, or discrepancy in, the factual basis upon which this proposal was created, may lead to changes in the offering, including but not limited to changes in pricing, warranties, quoted specifications, or terms and conditions. WTT's offering in this proposal is conditioned upon a full WTT EH&S."],
    ];

    clientSections.forEach(([heading, body]) => {
      y = ensureSpace(doc, y, 50, pg, propRef);
      doc.font("Helvetica-Bold").fontSize(10).text(heading, ML + 14, y);
      y += 13;
      doc.font("Helvetica").fontSize(9.5).text(body, ML + 14, y, { width: CW - 14, align: "justify" });
      y = doc.y + 14;
    });

    // ──────────────────────────────────────────────────────────────────────
    // SECTION 13 — Appendix
    // ──────────────────────────────────────────────────────────────────────
    pg.n++;
    y = addPage(doc, pg.n, propRef);

    doc.font("Helvetica-Bold").fontSize(11).text("13. Appendix", ML, y);
    y += 16;

    doc.font("Helvetica-Bold").fontSize(10).text("13.1. APPENDIX A: CLARIFICATIONS", ML + 14, y);
    y += 13;
    const clarifications = [
      "Pump MOC has been considered as per WTT standard practice.",
      "The Equipment in WTT scope will be procured as per WTT Standard Vendor List.",
      "WTT has not envisaged third party equipment inspection before dispatch.",
      "The payments received once could not be processed again for refund.",
      "WTT has considered instruments as per WTT standard practice",
      "Painting specifications of WTT supplied equipment is as per standard manufacturer painting specifications.",
    ];
    clarifications.forEach(c => {
      doc.font("Helvetica").fontSize(9.5).text(`\u2022 ${c}`, ML + 14, y, { width: CW - 14 });
      y = doc.y + 4;
    });
    y += 10;

    doc.font("Helvetica-Bold").fontSize(10).text("13.2. APPENDIX C: WARRANTY", ML + 14, y);
    y += 13;
    const warrantyText = `The mechanical warranty is only applicable to equipment supplied by WTT. The mechanical warranty period on all equipment supplied, unless otherwise noted, is twelve (12) months from the date of installation or fourteen (14) months from the notification of material readiness, whichever occurs first. WTT's obligation under this warranty is to the repair or replace, of any device or part thereof, which shall prove to have been manufacturing defects.\n\nThis warranty excludes the electrical items, defects, failures, damages or performance limitations caused in whole or in part by normal wear & tear, power failures, surges, fires, floods, snow, ice, lightning, excessive heat or cold, highly corrosive environments, accidents, actions of third parties, or other events outside of WTT's control. Warranty period for the entire equipment including replaced or repaired parts will be limited to the unexpired portion of the total warranty period. Bought out components are guaranteed only to the extent of guarantees given to us by our suppliers.\n\nWTT assumes no liability for any damage to equipment caused by inadequate storage or handling as per manufacturer's recommendations in supplied technical literature, or by defective or sub-standard workmanship or materials provided by Client or any other third party responsible for handling, storing or installing the equipment. Client undertakes to give immediate notice to WTT if goods or performance appear defective and to provide WTT with reasonable time and opportunity to make inspections and tests. If WTT is not at fault, Client shall pay WTT the costs and expenses of the inspections and tests.\n\nGoods shall not be returned to WTT without WTT's permission. WTT will provide Client with a "Return Goods Authorization" (RGA) number to use for returned goods. All return costs associated with shipping and labor are not included in the mechanical warranty. WTT warrants, subject to the provisions herein after set forth, that after stable operation of the WTT system has been attained and operators have acquired reasonable skills, the Equipment supplied for this project will be capable of producing the results set forth in stage wise parameter table, provided that:\n\nThe Equipment is operated and maintained at all times in accordance with the WTT Operations and Maintenance manual, The Equipment is operated within the mixed liquor characteristics defined in Influent quality table of this section, WTT has, until performance of its obligation herein is met, reasonable access to the Equipment and the operational data relating thereto, Client furnishes adequate and competent operating, supervisory and maintenance staff, and necessary laboratory facilities with test equipment and personnel, Client utilizes the services of WTT until its performance obligations are met, Client supplies all necessary raw materials and services of a quantity and of a quality specified by WTT, An adequate and continuous power supply is available that will enable operation of all required equipment.`;
    doc.font("Helvetica").fontSize(9.5).text(warrantyText, ML + 14, y, { width: CW - 14, align: "justify" });

    doc.end();
  });
}
