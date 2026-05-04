import { useState, useEffect } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

const API = "/api";

interface Proposal {
  id: number;
  proposal_no: string;
  company_name: string;
  address: string;
  city: string;
  country: string;
  contact_person: string;
  email: string;
  phone: string;
  system_option: number;
  flow_rate: string;
  status: string;
  notes: string;
  created_at: string;
}

function fmtCoverDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${dd}-${m}-${String(d.getFullYear()).slice(-2)}`;
}
function fmtRefDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${dd}.${m}.${d.getFullYear()}`;
}

/* ─── Equipment row types ─── */
type SpecRow  = [string, string];
type EqGroup  = { sno: number; desc: string; specs: SpecRow[] };

function mkGroups(start: number, items: [string, SpecRow[]][]): EqGroup[] {
  return items.map(([desc, specs], i) => ({ sno: start + i, desc, specs }));
}

const BIO_GROUPS = mkGroups(1, [
  ["SCREENER\n&\nLIFTING PUMP", [
    ["ROTARY BRUSH SCREENER","1 No."],
    ["MESH SIZE","2MM"],
    ["MOC","SS316"],
    ["LIFTING PUMP","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI / CI"],
    ["PUMP TYPE","SUBMERSIBLE"],
  ]],
  ["DISSOLVED AIR\nFLOTATION\n(DAF)\nSYSTEM", [
    ["DAF SYSTEM","1 No."],
    ["DAF SCRAPPER MOC","NON-METALLIC"],
    ["DAF CIRCULATION PUMP","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI / SS"],
    ["PUMP TYPE","AIR-WATER SUCTIONING TYPE\n(NANO BUBBLE GENERATION PUMP)"],
    ["SLUDGE PUMP","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI / CI"],
    ["PUMP TYPE","SURFACE MOUNTED"],
  ]],
  ["EQUALIZATION\nTANK", [
    ["DIFFUSER","1 LOT"],
    ["DIFFUSER SIZE","11\""],
    ["DIFFUSER PORES SIZE","80 MICRON"],
    ["DIFFUSER TYPE","FINE BUBBLE"],
    ["DIFFUSER MOC","PP-GF disc with SILICON membrane"],
    ["DIFFUSER GRID PIPING MOC","SS316L"],
  ]],
  ["BIOLOGICAL\nFEED SYSTEM", [
    ["BIOLOGICAL FEED PUMPS","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI / CI"],
    ["PUMP TYPE","SUBMERSIBLE"],
    ["LEVEL TRANSMITTER","1 No."],
    ["pH SENSOR","1 No."],
    ["pH SENSOR RANGE","0 – 14"],
    ["NEUTRALIZATION DOSING PUMPS","1W + 1SS"],
    ["PUMP MOC","TEFLON"],
    ["ELECTROMAGNETIC FLOWMETER","1 No."],
  ]],
  ["DENITRIFICATION\nSYSTEM", [
    ["DENITRIFICATION PUMP","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI/CI"],
    ["PUMP TYPE","SUBMERSIBLE"],
    ["FLOW MIXER FOR DENITRIFICATION SYSTEM","1"],
  ]],
  ["BIOLOGICAL\nSYSTEM", [
    ["BLOWER FOR BIOLOGICAL &\nEQUALIZATION TANK AERATION","1W + 1S"],
    ["BLOWER TYPE","LOBE"],
    ["DO SENSOR","1"],
    ["DO SENSOR RANGE","0 – 5 PPM"],
    ["DIFFUSER","1 LOT"],
    ["DIFFUSER SIZE","11\""],
    ["DIFFUSER PORES SIZE","80 MICRON"],
    ["DIFFUSER TYPE","FINE BUBBLE"],
    ["DIFFUSER MOC","PP-GF disc with SILICON membrane"],
    ["DIFFUSER GRID PIPING MOC","SS316L / PP-GF"],
  ]],
  ["LAMELLA\nSETTLER\n&\nSLUDGE\nRECIRCULATION\nSYSTEM", [
    ["LAMELLA SETTLER","1 LOT"],
    ["LAMELLA SETTLER FRAME MOC","SS316"],
    ["LAMELLA PACKS MOC","PVC"],
    ["SLUDGE RECIRCULATION PUMP","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI / CI"],
    ["PUMP TYPE","SUBMERSIBLE"],
  ]],
  ["SLUDGE\nTHICKENER\n&\nSCREW PRESS", [
    ["PIPING FOR SLUDGE THICKENER","1 LOT"],
    ["PIPING MOC","SS316L"],
    ["SCREW PRESS SYSTEM","1"],
    ["SCREW PRESS FEED PUMPS","1W + 1S"],
    ["SCREW PRESS POLY DOSING PUMPS","1W + 1SS"],
    ["POLY PREPARATORY UNIT","1"],
  ]],
]);

const UV_GROUPS = mkGroups(9, [
  ["ULTRA VIOLET\nSYSTEM @", [
    ["TOTAL NUMBER OF UNITS","1 No's"],
    ["FEED PUMP","1W"],
    ["PUMP MOC (CASING/IMPELLER)","CI/CI"],
    ["PUMP TYPE","SURFACE MOUNTED"],
    ["UV LAMPS","1 LOT"],
    ["TYPE OF LAMP","LOW PRESSURE – 254 nm"],
    ["UV CHAMBER MATERIAL","SS316L"],
    ["INTERNAL / EXTERNAL FINISH","0.4 Ra / ELECTRO POLISH"],
    ["PANEL PROTECTION","IP54"],
    ["CONDUCTIVITY SENSOR","2"],
  ]],
]);

const MBR_GROUPS = mkGroups(10, [
  ["SUBMERGED\nCERAMIC MBR\nSYSTEM", [
    ["NO. OF MODULES","1 LOT"],
    ["NO. OF TRAINS","1"],
    ["MOC OF MODULE","CERAMIC"],
    ["PERMEATE/BACKWASH PUMP","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI / CI"],
    ["TYPE OF PUMP","SURFACE MOUNTED"],
    ["SLUDGE TRANSFER PUMP","1W + 1S"],
    ["PUMP MOC (CASING/IMPELLER)","CI / CI"],
    ["PUMP TYPE","SURFACE MOUNTED"],
    ["DOSING PUMP","2W"],
    ["DOSING PUMP MOC","PP"],
    ["ELECTROMAGNETIC FLOW METER","PERMEATE"],
  ]],
]);

const INFLUENT_QUALITY = [
  ["pH","--","8 – 9"],["BOD","mg/L","300"],["COD","mg/L","700"],
  ["TDS","mg/L","1500"],["TSS","mg/L","200"],["REACTIVE SILICA","mg/l","10"],
  ["TKN","mg/L","60"],["PVA","mg/L","NIL"],["IRON","mg/L","NIL"],
  ["SULPHATE *","mg/L","380"],["CHLORIDE *","mg/L","380"],
  ["HARDNESS","mg/L of CaCO3","200"],["ALKALINITY","mg/L of CaCO3","200"],
  ["TEMPERATURE","ºC","30 – 35"],["OIL & GREASE","mg/L","10"],
  ["OTHER HEAVY METALS *","mg/L","NIL"],
];

const TREATED_OPT1 = [
  ["pH","--","8 – 9","6 – 7"],["BOD","mg/L","300","< 30 *"],
  ["COD","mg/L","700","< 70 *"],["TDS","mg/L","1500","SAME AS INLET"],
  ["TSS","mg/L","200","< 50 *"],["REACTIVE SILICA","mg/l","10","SAME AS INLET"],
  ["TKN","mg/L","60","< 6 *"],["PVA","mg/L","NIL","NIL"],
  ["IRON","mg/L","NIL","NIL"],["SULPHATE","mg/L","380","SAME AS INLET"],
  ["CHLORIDE","mg/L","380","SAME AS INLET"],
  ["HARDNESS","mg/L of CaCO3","200","SAME AS INLET"],
  ["ALKALINITY","mg/L of CaCO3","200","SAME AS INLET"],
  ["TEMPERATURE","ºC","30 – 35","30 – 35"],
  ["OIL & GREASE","mg/L","10","< 1"],
  ["OTHER HEAVY\nMETALS","mg/L","NIL","NIL"],
];

const TREATED_OPT2 = [
  ["pH","--","8 – 9","6 – 7"],["BOD","mg/L","300","< 25 *"],
  ["COD","mg/L","700","< 60 *"],["TDS","mg/L","1500","SAME AS INLET@"],
  ["TSS","mg/L","200","< 5 *"],["REACTIVE SILICA","mg/l","10","SAME AS INLET"],
  ["TKN","mg/L","60","< 3 *"],["PVA","mg/L","NIL","NIL"],
  ["IRON","mg/L","NIL","NIL"],["SULPHATE","mg/L","380","SAME AS INLET"],
  ["CHLORIDE","mg/L","380","SAME AS INLET"],
  ["HARDNESS","mg/L of CaCO3","200","SAME AS INLET"],
  ["ALKALINITY","mg/L of CaCO3","200","SAME AS INLET"],
  ["TEMPERATURE","ºC","30 – 35","30 – 35"],
  ["OIL & GREASE","mg/L","10","BDL *"],
  ["OTHER HEAVY\nMETALS","mg/L","NIL","NIL"],
];

const VENDORS = [
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
  ["SCREENER",""],["DAF SYSTEM",""],["LAMELLA SETTLER","WTT INTERNATIONAL"],
  ["UV SYSTEM",""],["SCREW PRESS",""],
];

/* ─── Shared table cell classes ─── */
const TH = "border border-black px-2 py-1 font-bold text-center align-middle";
const THL = "border border-black px-2 py-1 font-bold align-middle";
const TD = "border border-black px-2 py-1 align-top";
const TDC = "border border-black px-2 py-1 text-center align-middle";

/* ─── Equipment scope table ─── */
function EqTable({ header, letter, groups, flow }: { header: string; letter: string; groups: EqGroup[]; flow: string }) {
  return (
    <table className="w-full border-collapse" style={{ fontSize: "10pt" }}>
      <tbody>
        <tr>
          <td colSpan={4} className="border border-black px-2 py-1">
            <strong>{letter}&nbsp;&nbsp;&nbsp;&nbsp;{header}</strong>
            <span className="float-right font-bold">{flow} M3/DAY</span>
          </td>
        </tr>
        <tr>
          <td className={TH + " w-10"}>S.NO</td>
          <td className={THL + " w-[22%]"}>DESCRIPTION</td>
          <td className={THL}>SPECIFICATION</td>
          <td className={TH + " w-[18%]"}>QUANTITY</td>
        </tr>
        {groups.map(g =>
          g.specs.map((spec, si) => (
            <tr key={`${g.sno}-${si}`}>
              {si === 0 && <td className={TDC + " font-bold"} rowSpan={g.specs.length}>{g.sno}.</td>}
              {si === 0 && <td className={TD} rowSpan={g.specs.length} style={{ whiteSpace: "pre-line" }}>{g.desc}</td>}
              <td className={TD} style={{ whiteSpace: "pre-line" }}>{spec[0]}</td>
              <td className={TDC}>{spec[1]}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/* ─── Page footer ─── */
function Footer({ pageNum, ref: proposalRef }: { pageNum: number; ref: string }) {
  return (
    <div className="page-footer">
      <span>Page | {pageNum}</span>
      <span>{proposalRef}</span>
    </div>
  );
}

/* ─── TOC row with dotted leaders ─── */
function TocRow({ num, title, pg }: { num: string; title: string; pg: string }) {
  return (
    <tr>
      <td style={{ width: "3em", paddingRight: "0.3em", verticalAlign: "top", whiteSpace: "nowrap" }}>{num}</td>
      <td style={{ paddingRight: "0.5em" }}>
        <span className="toc-item">{title}</span>
      </td>
      <td style={{ width: "2em", textAlign: "right", whiteSpace: "nowrap" }}>{pg}</td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*                     MAIN DOCUMENT                          */
/* ═══════════════════════════════════════════════════════════ */
function ProposalDocument({ p }: { p: Proposal }) {
  const coverDate  = fmtCoverDate(p.created_at || new Date().toISOString());
  const refDate    = fmtRefDate(p.created_at || new Date().toISOString());
  const flow       = p.flow_rate;
  const propRef    = `${refDate}/${p.proposal_no}/NP-STP/${flow}K/R0/TCP`;

  return (
    <div className="proposal-body">

      {/* ══════════ PAGE 1 — COVER LETTER ══════════ */}
      <div className="doc-page">
        <div style={{ textAlign: "right", marginBottom: "2em" }}>{coverDate}</div>

        <div style={{ marginBottom: "1.5em" }}>
          <div>To</div>
          <div style={{ marginLeft: "6em" }}><strong>M/S. {p.company_name.toUpperCase()},</strong></div>
          {p.address && <div style={{ marginLeft: "6em" }}>{p.address},</div>}
          <div style={{ marginLeft: "6em" }}>{p.city.toUpperCase()},</div>
          <div style={{ marginLeft: "6em" }}>{p.country.toUpperCase()}.</div>
        </div>

        <div style={{ marginBottom: "1.5em" }}>
          [Proposal No: {propRef}]
        </div>

        <div style={{ marginBottom: "1em" }}>Dear Sir,</div>

        <div style={{ textAlign: "justify", marginBottom: "1em", textIndent: "8em" }}>
          WTT International Private Limited (WTT) is pleased to provide{" "}
          <strong>M/s. {p.company_name}</strong> with the Techno Commercial Proposal for supply of engineering
          &amp; materials for Sewage Treatment Plant of capacity{" "}
          <strong>{flow} M3/Day</strong>. In developing this offer WTT worked with you in an effort to understand
          your project and business needs. The attached proposal outlines the solutions we feel will best meet
          these objectives.
        </div>

        <div style={{ textAlign: "justify", marginBottom: "2em", textIndent: "8em" }}>
          We greatly appreciate your consideration of WTT for this project. Our measure of success is how well
          we deliver solutions that help our client to meet their critical business objectives. We hope to have
          the opportunity to demonstrate this with your good selves.
        </div>

        <div style={{ marginBottom: "0.5em" }}>Yours Sincerely,</div>
        <div style={{ height: "3em" }} />
        <div><strong>D. Venkatesh</strong></div>
        <div>Managing Director</div>

        <div style={{ height: "1.5em" }} />

        <table className="w-full border-collapse" style={{ fontSize: "10pt", marginBottom: "1.5em" }}>
          <thead>
            <tr>
              <td className={TH + " w-14"}>S.NO</td>
              <td className={THL}>DESCRIPTION</td>
              <td className={TH + " w-28"}>PREPARED</td>
              <td className={TH + " w-28"}>APPROVED</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={TDC}>1.</td>
              <td className={TD}>
                Techno Commercial Proposal for –<br />
                "Sewage Treatment Plant of capacity {flow} M3/Day".
              </td>
              <td className={TD + " text-center"}>CS – GET<br /><br />AR – AGM</td>
              <td className={TDC + " align-middle"}>DV – MD</td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: "0.5em" }}><strong>CONFIDENTIALITY</strong></div>
        <div style={{ textAlign: "justify", textIndent: "6em", marginBottom: "0.5em" }}>
          All details, specifications, drawings, images, and all other information submitted by us are only
          intended to the person/organization to which it is addressed and contains proprietary, confidential
          and or privileged material. Any review, retransmission, dissemination, or other use of, or of taking
          action in reliance upon this information by person or entities other than the intended recipient is
          prohibited. All or part information contained in the document is solely intended to the person or
          entity addresses and sharing this document in part or in whole is prohibited.
        </div>

        <Footer pageNum={1} ref={propRef} />
      </div>

      {/* ══════════ PAGE 2 — TOC part 1 ══════════ */}
      <div className="doc-page">
        <div style={{ textAlign: "center", fontStyle: "italic", marginBottom: "1.5em" }}>
          We feel delighted to present our Patented Systems
        </div>
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "13pt", marginBottom: "1.5em", letterSpacing: "0.1em" }}>
          CONTENT
        </div>
        <table style={{ width: "100%", fontSize: "10.5pt", borderCollapse: "collapse" }}>
          <tbody>
            {[
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
              ["13.2.","APPENDIX C:  WARRANTY","31"],
            ].map(([n, t, pg]) => (
              <TocRow key={n} num={n} title={t} pg={pg} />
            ))}
          </tbody>
        </table>
        <Footer pageNum={2} ref={propRef} />
      </div>

      {/* ══════════ PAGE 3 — INFLUENT FLOW + QUALITY ══════════ */}
      <div className="doc-page">
        <div className="sec1">1. Technical and Engineering Details</div>

        <div className="sec2">1.1. INFLUENT FLOW DATA</div>
        <table className="w-full border-collapse mb-4" style={{ fontSize: "10.5pt" }}>
          <thead>
            <tr>
              <td className={TH}>STREAM</td>
              <td className={TH}>FEED FLOW RATE</td>
              <td className={TH}>UNIT</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={TDC}>STP INLET</td>
              <td className={TDC + " font-bold"}>{flow}</td>
              <td className={TDC}>M3/DAY</td>
            </tr>
          </tbody>
        </table>

        <div className="sec2">1.2. INFLUENT QUALITY</div>
        <table className="w-full border-collapse" style={{ fontSize: "10.5pt", marginBottom: "0.8em" }}>
          <thead>
            <tr>
              <td className={TH + " w-12"}>S.NO</td>
              <td className={THL}>PARAMETER</td>
              <td className={TH + " w-36"}>UNIT</td>
              <td className={TH + " w-28"}>STP INLET</td>
            </tr>
          </thead>
          <tbody>
            {INFLUENT_QUALITY.map(([param, unit, val], i) => (
              <tr key={i}>
                <td className={TDC}>{i + 1}.</td>
                <td className={TD}>{param}</td>
                <td className={TDC}>{unit}</td>
                <td className={TDC}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="body-sm mb-1">
          The *Parametrical values have been considered for the purpose of designing the treatment system.
          Any change in these values will impact design &amp; cost of the STP.
        </p>
        <p className="body-sm mb-3">
          The design solution proposed is based on the values as presented in the table above at STP Inlet.
          All concentrations refer to max concentrations to be used for the system's design. Any change in the
          actual inlet parameters will have impact on Process Design, Engineering Design, Cost and Performance.
        </p>

        <div className="sec1">2. Design Basis</div>
        <div className="sec2">2.1. DESIGN SYSTEM CHOSEN</div>
        <table className="w-full border-collapse" style={{ fontSize: "10.5pt", marginBottom: "0.5em" }}>
          <thead>
            <tr>
              <td className={TH + " w-12"}>S.NO</td>
              <td className={THL + " w-[28%]"}>SYSTEM/EQUIPMENT</td>
              <td className={TH + " w-24"}>CAPACITY (M3/DAY)</td>
              <td className={THL}>PURPOSE OF THE SYSTEM/EQUIPMENT PROPOSED</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className={TH}>OPTION – 1</td>
            </tr>
            {[
              ["ROTARY\nBRUSH SCREENER","TO REMOVE COARSE PARTICLES FROM THE EFFLUENT WATER"],
              ["LIFTING PUMP","TO TRANSFER THE EFFLUENT FROM A LOWER ELEVATION TO THE DAF SYSTEM"],
              ["DISSOLVED AIR\nFLOTATION (DAF)\nSYSTEM","TO REMOVE FREE OIL & GREASE FROM THE EFFLUENT WATER"],
              ["EQUALIZATION\nSYSTEM","TO BALANCE FLOW AND LOAD VARIATIONS BEFORE FURTHER TREATMENT"],
              ["NEUTRALIZATION\nSYSTEM","TO MAINTAIN OPTIMUM pH IN THE BIOLOGICAL OXIDATION SYSTEM"],
              ["DE-NITRIFICATION\nSYSTEM","TO CONVERT AMMONIACAL NITROGEN INTO NITROGEN GAS"],
              ["BIOLOGICAL\nOXIDATION SYSTEM","TO BIOLOGICALLY DEGRADE ORGANIC POLLUTANTS USING MICRO-ORGANISMS"],
              ["LAMELLA SETTLER","FOR EFFICIENT SEPARATION OF SOLIDS FROM THE TREATED EFFLUENT WATER"],
              ["UV SYSTEM","TO ELIMINATE HARMFUL MICRO-ORGANISMS FROM THE TREATED EFFLUENT WATER"],
              ["SCREW PRESS SYSTEM","TO DEWATER SLUDGE BY COMPRESSING AND SEPARATING WATER FROM SOLIDS"],
            ].map(([sys, purpose], i) => (
              <tr key={i}>
                <td className={TDC}>{i + 1}.</td>
                <td className={TD} style={{ whiteSpace: "pre-line" }}>{sys}</td>
                <td className={TDC + " font-bold"}>{flow}</td>
                <td className={TD}>{purpose}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className={TH}>ADDITIONAL SYSTEMS FOR OPTION – 2</td>
            </tr>
            <tr>
              <td className={TDC}>11.</td>
              <td className={TD} style={{ whiteSpace: "pre-line" }}>SUBMERGED{"\n"}CERAMIC MBR{"\n"}SYSTEM</td>
              <td className={TDC + " font-bold"}>{flow}</td>
              <td className={TD}>TO REDUCE FOULING POTENTIAL OF RO FEED WATER</td>
            </tr>
          </tbody>
        </table>
        <p className="body-sm mb-3">
          NOTE: System capacities mentioned above are based on STP influent flow Rate and the Actual capacities may vary.
        </p>

        <div className="sec2">2.2. PROCESS COMPATIBILITY</div>
        <ol className="body-para" style={{ paddingLeft: "2.5em", marginBottom: "1em" }}>
          <li style={{ textAlign: "justify", marginBottom: "0.5em" }}>
            The incoming raw wastewater shall not contain any substance incompatible with the MOC of the Equipment
            supplied &amp; inhibitory substances that sufficiently affect the biological treatment stage so as to
            compromise the operation of any of the system.
          </li>
          <li style={{ textAlign: "justify", marginBottom: "0.5em" }}>
            The biological treatment is operated and maintained in accordance with good industry practice for
            wastewater treatment systems.
          </li>
          <li style={{ textAlign: "justify", marginBottom: "0.5em" }}>
            The Rotary Brush Screener at the plant inlet are installed and operated in such a way that fibrous
            material and floatable particles are removed reliably and any bypasses of the screens are impossible.
          </li>
        </ol>

        <Footer pageNum={3} ref={propRef} />
      </div>

      {/* ══════════ PAGE 4 — TREATED WATER QUALITY ══════════ */}
      <div className="doc-page">
        <div className="sec2">2.3. EXPECTED TREATED WATER QUALITY</div>
        <p className="body-para" style={{ textAlign: "justify", marginBottom: "0.8em", textIndent: "4em" }}>
          The following performance parameters are expected under standard operating conditions after equipment
          start-up based on the data and assumptions listed above and in Appendix, Warranties. In case of
          conflicting numbers, the ones listed under Appendix take precedence:
        </p>

        <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "0.4em", fontSize: "10.5pt" }}>
          STP – STAGEWISE PARAMETER (OPTION – 1)
        </div>
        <table className="w-full border-collapse" style={{ fontSize: "10.5pt", marginBottom: "0.5em" }}>
          <thead>
            <tr>
              <td className={THL}>PARAMETER</td>
              <td className={TH + " w-32"}>UNIT</td>
              <td className={TH + " w-28"}>STP INLET</td>
              <td className={TH + " w-36"}>LAMELLA SETTLER<br />OUTLET</td>
            </tr>
          </thead>
          <tbody>
            {TREATED_OPT1.map(([param, unit, inp, out], i) => (
              <tr key={i}>
                <td className={TD} style={{ whiteSpace: "pre-line" }}>{param}</td>
                <td className={TDC}>{unit}</td>
                <td className={TDC}>{inp}</td>
                <td className={TDC}>{out}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="body-sm mb-1">BDL – below detectable limit, NA – not applicable; Values are system generated which may vary with variation in inlet &amp; on operational basis</p>
        <p className="body-sm mb-3">* Depends on the Biological Degradability of the Effluent, dosage of Disinfectant considering 12 Hours of Retention time for Biological Treatment with 8 meters of water depth and available form of solubility.</p>

        <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "0.4em", fontSize: "10.5pt" }}>
          STP – STAGEWISE PARAMETER (OPTION – 2)
        </div>
        <table className="w-full border-collapse" style={{ fontSize: "10.5pt", marginBottom: "0.5em" }}>
          <thead>
            <tr>
              <td className={THL}>PARAMETER</td>
              <td className={TH + " w-32"}>UNIT</td>
              <td className={TH + " w-28"}>STP INLET</td>
              <td className={TH + " w-36"}>SUBMERGED<br />CERAMIC MBR</td>
            </tr>
          </thead>
          <tbody>
            {TREATED_OPT2.map(([param, unit, inp, out], i) => (
              <tr key={i}>
                <td className={TD} style={{ whiteSpace: "pre-line" }}>{param}</td>
                <td className={TDC}>{unit}</td>
                <td className={TDC}>{inp}</td>
                <td className={TDC}>{out}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="body-sm mb-1">BDL – below detectable limit, NA – not applicable; Values are system generated which may vary with variation in inlet &amp; on operational basis</p>
        <p className="body-sm mb-2">* Depends on the Biological Degradability of the Effluent, considering 12 Hours of Retention time for Biological Treatment with 6 meters of water depth and available form of solubility.</p>
        <div className="body-sm mb-3">
          <div style={{ marginBottom: "0.3em" }}>Notes:</div>
          <div style={{ paddingLeft: "2em", marginBottom: "0.3em" }}>&#8227; All influent quality parameters are based on daily average values of a minimum of four (4) Nos. of hourly composite samples collected at regular intervals over a day, with testing performed to applicable industry-approved standards.</div>
          <div style={{ paddingLeft: "2em", marginBottom: "0.3em" }}>&#8227; The treated water parameters could take 2 months for attaining specified values as per above table after successful commissioning.</div>
          <div style={{ paddingLeft: "2em" }}>&#8227; The above recovery water quality expectation is based on WTT supplying the system and scope Equipment as per the scope of supply table described in section 4 below.</div>
        </div>

        <Footer pageNum={4} ref={propRef} />
      </div>

      {/* ══════════ PAGE 5 — EQUIPMENT DESCRIPTIONS ══════════ */}
      <div className="doc-page">
        <div className="sec1">3. Equipment Details for Proposed Systems</div>
        <div style={{ fontWeight: "bold", marginBottom: "0.5em" }}>OPTION – 1</div>

        {([
          ["3.1.","ROTARY BRUSH SCREENER","Automated Brush Screener separates coarse & medium fine solids of size above 2 mm from influent. This process is a predetermined stage where escaping of solids is completely avoided, where by clogging of pumps & machinery in subsequent steps gets nullified. The collected wastes have to be disposed periodically and the screener is attached with brush."],
          ["3.2.","DISSOLVED AIR FLOTATION (DAF) SYSTEM","DAF system used to remove total suspended solids (TSS) and oils & greases (O&G) from effluent water; this effectively reduces the pollutant load in biological system. Circulation pump provided for the recirculation of Effluent into the DAF system along with Customer provided compressed air for flotation of suspends and oils. Scrapping mechanism provided for highly efficient separation of floating suspends and Oils & Greases."],
          ["3.3.","EQUALIZATION SYSTEM","Equalization system used to homogenize different wastewater characteristics to achieve uniform pollutant load. The continuous mixing and water movement maintained by diffused aeration to avoid the dead zone, solids sedimentation and anaerobic fermentation."],
          ["3.4.","NEUTRALIZATION SYSTEM","The Biological oxidation system requires a neutral or slightly alkaline pH value for the optimum performance. Neutralization is carried out automatically depending on the pH of the inlet water."],
          ["3.5.","DENITRIFICATION SYSTEM","Anoxic digestion is a series of biological processes that occur in the absence of oxygen, where microorganisms break down biodegradable materials. A key component of this process is denitrification, which is the conversion of nitrate nitrogen into nitrogen gas in the absence of oxygen. The transformation follows a specific reduction pathway: Ammoniacal nitrogen is oxidized in Biological tank to nitrite and then into nitrate form. This nitrate (NO₃⁻) is reduced to nitrite (NO₂⁻), then to nitric oxide (NO), followed by nitrous oxide (N₂O), and finally to nitrogen gas (N₂) upon recirculating the Aerated treated water from Biological Tank to De-Nitrification Tank."],
          ["3.6.","BIOLOGICAL OXIDATION SYSTEM","The organic matter is aerated in biological tank to bring down the pollutant load using micro-organisms. The micro-organisms metabolize the organic matters and a Part of organic matter is synthesized into new cells. The microbial growth in the wastewater maintaining by providing required DO level."],
          ["3.7.","LAMELLA SETTLER","Lamella settler system removes solid particulates and suspend solids from liquid through gravity settling to provide polished influent for filtration process and also ensures the required retention time for settling of suspends."],
          ["3.8.","ULTRA VIOLET SYSTEMS","UV disinfection which protects against various microorganisms, including chlorine-resistant pathogens, and aids in the removal of disinfection. Unlike conventional methods, it doesn't add chemicals and reduces disinfection byproducts. Using shortwave UV light (185-315 nm), it inactivates microbial DNA, ensuring effective fluid disinfection."],
          ["3.9.","SCREW PRESS SYSTEM","The Screw press system is for dewatering by continuous gravitational drainage. It works by using a coarse screw to convert the rotation of the handle or drive-wheel into a small downward movement of greater force. This system reduces the volume of sludge and in turn minimizes storage and transportation cost."],
        ] as [string,string,string][]).map(([num, title, text]) => (
          <div key={num} style={{ marginBottom: "0.8em" }}>
            <div className="sec2">{num} {title}</div>
            <p className="body-para" style={{ textAlign: "justify", textIndent: "4em" }}>{text}</p>
          </div>
        ))}

        <div style={{ fontWeight: "bold", marginTop: "1em", marginBottom: "0.5em" }}>OPTION – 2</div>
        <div className="sec2">3.10. SUBMERGED CERAMIC MBR SYSTEM</div>
        <p className="body-para" style={{ textAlign: "justify", textIndent: "4em" }}>
          This system comprises of Eco-friendly &amp; long-lasting Ceramic Membranes. Ceramic MBR system
          operates at low operational flux and easy to clean as the membrane is rigid and do not lose its form
          over a period of time. The system can be cleaned with Permeate &amp; Chemically Enhanced Backwash
          technology and Air scouring to avoid sludge deposition. The sprinkler pumps ensure that there is no
          clogging over the membrane surface.
        </p>

        <Footer pageNum={5} ref={propRef} />
      </div>

      {/* ══════════ PAGE 6 — EQUIPMENT SCOPE ══════════ */}
      <div className="doc-page">
        <div className="sec1">4. Equipment Scope of Supply – BY WTT</div>

        <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "0.5em", fontSize: "10.5pt" }}>
          PLANT EQUIPMENT LIST (OPTION – 1)
        </div>
        <EqTable header="BIOLOGICAL SYSTEM" letter="A" groups={BIO_GROUPS} flow={flow} />
        <div style={{ marginBottom: "1em" }} />
        <EqTable header="ULTRA VIOLET SYSTEM" letter="B" groups={UV_GROUPS} flow={flow} />
        <p className="body-sm" style={{ margin: "0.4em 0" }}>
          @ The disinfection system proposed in Option 1 will be utilized for disinfection of MBR permeate during Option-2.
        </p>
        <EqTable header="SUBMERGED CERAMIC MBR SYSTEM (OPTION – 2)" letter="B" groups={MBR_GROUPS} flow={flow} />

        <p className="body-sm" style={{ marginTop: "0.5em" }}>W – Working; S – Standby; SS – Store Standby</p>
        <p className="body-sm" style={{ marginBottom: "0.8em" }}>
          Specification and quantity details mentioned above are preliminary and may be revised to optimize the performance of the system.
        </p>

        <div style={{ fontWeight: "bold", marginBottom: "0.4em" }}>OTHER GENERAL ITEMS IN WTT's SCOPE:</div>
        <ul style={{ paddingLeft: "2.5em", fontSize: "10.5pt", lineHeight: "1.6" }}>
          {["Piping in SS, UPVC and its associated items","All other related valves and puddle flanges required","Electrical control panel for proposed system with standard automation","Power cable and control cable within the electrical panel","Power cable and control cable from electrical panel to proposed equipment","General layout & civil detailed drawing for proposed systems"].map((item,i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <Footer pageNum={6} ref={propRef} />
      </div>

      {/* ══════════ PAGE 7 — CLIENT SCOPE + HIGHLIGHTS ══════════ */}
      <div className="doc-page">
        <div className="sec1">5. Scope of Supply &amp; Installation - BY CLIENT</div>
        <ul style={{ paddingLeft: "2.5em", fontSize: "10.5pt", lineHeight: "1.7", marginBottom: "1em" }}>
          {[
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
            "All Necessary Earthing & Safety/Protective Earthing shall be provided for individual Instruments, Motor/Pump, Other Electrical Equipment & Panel as per requirement",
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
          ].map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <div style={{ fontWeight: "bold", marginBottom: "0.5em" }}>HIGHLIGHTS</div>
        <ul style={{ paddingLeft: "2.5em", fontSize: "10.5pt", lineHeight: "1.7" }}>
          {[
            "Our scope of supplies is of SS316L pipes for Airline, MBR & RO pipe line materials like UPVC are used only in areas where SS316L is not compatible.",
            "Rotary Brush Screener fabricated at a world class manufacturing facility with SS316 having sturdy axial rotating brush arm with long-lasting Nylon Bristles enables screening by employing punched hole sheets up to mesh size of 2mm.",
            "DO Sensor based Automation for Biological Aeration to maintain balanced F/M ratio.",
            "Diffusers made of long-lasting PP-GF Silicon membrane and enables utmost mixing by fine bubbles.",
            "Submerged CERAMIC MBR system with a higher membrane life and auto cleaning capabilities",
            "Rapid Filtration & Backwash Sequence with automatic valves for pre-filtration.",
            "All part of the plant has Level sensors and floats to have complete data on volume of water in each tank.",
            "Electrical panel supplied by WTT with necessary cooling technologies and easy operative switch for Automatic & Manual operations.",
            "PC controlled HMI panel provided with complete automation and acknowledgement & warnings for cleaning necessities based on the operating conditions.",
          ].map((item, i) => <li key={i}>{item}</li>)}
        </ul>

        <Footer pageNum={7} ref={propRef} />
      </div>

      {/* ══════════ PAGE 8 — VENDOR LIST ══════════ */}
      <div className="doc-page">
        <div className="sec1">6. Typical Equipment Vendor List</div>
        <table className="w-full border-collapse" style={{ fontSize: "10.5pt", marginBottom: "0.8em" }}>
          <thead>
            <tr>
              <td className={TH + " w-14"}>S.NO</td>
              <td className={THL}>EQUIPMENT</td>
              <td className={THL}>VENDORS</td>
            </tr>
          </thead>
          <tbody>
            {VENDORS.map(([equip, vendor], i) => (
              <tr key={i}>
                <td className={TDC}>{i + 1}.</td>
                <td className={TD}>{equip}</td>
                <td className={TD}>{vendor}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="body-sm mb-6">
          The above-mentioned vendors are subjected to change based on the delivery terms for an equivalent vendor
          without compromising the quality and WTT reserves the right to change the vendor without any prior intimation.
        </p>

        <div className="sec1">7. Pricing Detail</div>
        <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "0.4em", fontSize: "10.5pt" }}>
          PRICE FOR PROPOSED SYSTEMS – (OPTION – 1)
        </div>
        <table className="w-full border-collapse" style={{ fontSize: "10.5pt", marginBottom: "1em" }}>
          <thead>
            <tr>
              <td className={TH + " w-12"}>S.NO</td>
              <td className={THL}>SYSTEM/EQUIPMENT - {flow} M3/DAY</td>
              <td className={TH + " w-32"}>PRICE IN USD</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={TDC}>1.</td>
              <td className={TD}>
                BIOLOGICAL SYSTEM<br />
                (WHICH INCLUDES SCREENER, LIFTING PUMP, DAF, EQUALIZATION SYSTEM,
                NEUTRALIZATION SYSTEM, DENITRIFICATION SYSTEM, BIOLOGICAL SYSTEM,
                LAMELLA SETTLER, SRS &amp; SCREW PRESS) &amp; UV SYSTEM
              </td>
              <td className={TDC}>$</td>
            </tr>
            <tr>
              <td colSpan={2} className={TD + " font-bold"}>TOTAL PRICE FOR PROPOSED SYSTEMS</td>
              <td className={TDC + " font-bold"}>$</td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: "center", fontWeight: "bold", marginBottom: "0.4em", fontSize: "10.5pt" }}>
          PRICE FOR PROPOSED SYSTEMS – (OPTION – 2)
        </div>
        <table className="w-full border-collapse" style={{ fontSize: "10.5pt", marginBottom: "0.8em" }}>
          <thead>
            <tr>
              <td className={TH + " w-12"}>S.NO</td>
              <td className={THL}>SYSTEM/EQUIPMENT - {flow} M3/DAY</td>
              <td className={TH + " w-32"}>PRICE IN USD</td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={TDC}>1.</td>
              <td className={TD}>SUBMERGED CERAMIC MBR SYSTEM</td>
              <td className={TDC}>$</td>
            </tr>
            <tr>
              <td colSpan={2} className={TD + " font-bold"}>TOTAL PRICE FOR PROPOSED SYSTEMS</td>
              <td className={TDC + " font-bold"}>$</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: "10.5pt", marginBottom: "0.5em" }}>
          All above mentioned prices given for the proposed systems with complete automation
        </p>
        <ul style={{ paddingLeft: "2.5em", fontSize: "10.5pt", lineHeight: "1.7" }}>
          <li>Pricing provided herein does not include any duties and taxes</li>
          <li>Pricing provided herein is on Ex-Works basis &amp; does not include the insurance charges</li>
          <li>Supervision of erection and commissioning of WTT supplied system shall be extra</li>
          <li>Payment/commercial terms &amp; conditions as per WTT's General Terms &amp; Conditions of sale</li>
          <li>Price valid for 15 days from the date of proposal due to market volatility</li>
        </ul>

        <div style={{ marginTop: "1.5em" }}>
          <div className="sec1">8. Happy Customers</div>
          <div style={{ height: "4em" }} />
          <div className="sec1">9. Channel Partners</div>
          <div style={{ height: "4em" }} />
          <div className="sec1">10. Process Description Video</div>
          <div style={{ height: "3em" }} />
        </div>

        <Footer pageNum={8} ref={propRef} />
      </div>

      {/* ══════════ PAGE 9 — COMMERCIAL T&C ══════════ */}
      <div className="doc-page">
        <div className="sec1">11. Commercial Terms and Conditions</div>

        <div className="sec2">11.1. TAXES</div>
        <p className="body-para tj indent">Taxes and Duties shall be extra as applicable. Pricing provided herein does not include any taxes of destination country.</p>
        <p className="body-para tj indent mb3">If Tax Exemption is applicable, customer has to provide a copy to WTT of any applicable tax exemption certificates as issued by an approved taxation authority for the specific project location. Without an approved tax exemption certificate received by WTT all submitted invoices will include applicable tax. However, we reserve the right to revise our price in case of tax exemption.</p>

        <div className="sec2">11.2. FREIGHT</div>
        <p className="body-para tj indent mb3">All the Equipment and components foresee Ex-works delivery as per I.C.C. Incoterms-2010.</p>

        <div className="sec2">11.3. INVOICING AND PAYMENT TERMS</div>
        <p className="body-para tj indent">The pricing quoted in this proposal is based on the following payment terms, in principally agreed.</p>
        <div style={{ paddingLeft: "6em", fontSize: "10.5pt", marginBottom: "0.3em" }}>(1) 30% Advance Payment along with PI.</div>
        <div style={{ paddingLeft: "6em", fontSize: "10.5pt", marginBottom: "0.3em" }}>(2) 70% by irrevocable Letter of Credit payable at sight against Shipment documents.</div>
        <p className="body-para tj indent mb3">Equipment shipment is contingent on receipt of earlier milestone payments.</p>

        <div className="sec2">11.4. EQUIPMENT SHIPMENT</div>
        <p className="body-para tj indent">Client and WTT will arrange a kick off meeting after contract acceptance to develop firm shipment schedule. This estimated delivery schedule assumes no more than 1 week for Client review of submittal drawings. Any delays in Client approvals or requested changes may result in additional charges and/or a delay to the schedule.</p>
        <p className="body-para tj indent mb3">Material supply for the proposed plant in 5 - 6 months is expected. The delivery schedule excludes the months of August &amp; December, the delivery schedule is subject to review and adjustment. Partial shipments are allowed. In case of modifications to the volume of the supply after the emission of the order confirmation, WTT reserves the right to modify the delivery time and the agreed price.</p>

        <div className="sec2">11.5. FORCE MAJEURE</div>
        <p className="body-para tj indent mb3">Please be advised that force majeure is applicable to the quotation provided. The unforeseen and uncontrollable events as defined in our terms and conditions, such as natural disasters, wars or pandemics &amp; other events that prevent the parties from fulfilling their contractual commitments have occurred, impacting our ability to honor the terms outlined in this quotation. We will diligently review the situation and promptly communicate any necessary adjustments or potential delays in fulfilling the quoted services or products in compliance with the force majeure provisions outlined in our agreement.</p>

        <div className="sec2">11.6. PRICING NOTES</div>
        <p className="body-para tj indent">All prices are quoted in USD. Any applicable tax of destination country is not included. Client will pay all applicable Local, State / Provincial, or Federal taxes &amp; Duties. WTT may manufacture and source the Equipment and any part thereof globally in the country or countries of its choosing, provided that the Equipment complies with all of the requirements specified in this Agreement.</p>
        <p className="body-para tj indent mb3">The Equipment delivery date, start date, and date of commencement of operations are to be negotiated. Title and risk of loss will transfer upon delivery in accordance with the INCOTERMS 2010. Commercial Terms and Conditions shall be in accordance with WTT's General Terms and Conditions of Sale as included in Appendix.</p>

        <Footer pageNum={9} ref={propRef} />
      </div>

      {/* ══════════ PAGE 10 — CLIENT SCOPE OF SUPPLY ══════════ */}
      <div className="doc-page">
        <div className="sec1">12. Client Scope of Supply</div>

        <div className="sec2">12.1. SAFETY AND ENVIRONMENTAL</div>
        <p className="body-para tj indent">First aid, emergency medical response, eyewash &amp; safety showers in the water treatment area. Chemical spill response, security &amp; fire protection systems as per local codes. Environmental use and discharge permits for all chemicals at Client facility either listed in this document or proposed for use at a later date. Any special permits required for WTT's or Client employees to perform work related to the water treatment system at the facility. All site testing, including soil, ground and surface water, and air emissions, etc. Disposal of all solid &amp; liquid waste from WTT's system including waste materials generated during construction, startup and operation.</p>
        <p className="body-para tj indent">Provide appropriate protection of the environment &amp; local community, the health and safety of all workers and visitors at the site and the security of the facility. Provide safety related equipment &amp; services such as site security, fire systems, lifting equipment and its operation, fall protection, adequate floor grating, ventilation, and safe access to equipment &amp; electrical systems areas.</p>
        <p className="body-para tj indent mb3">Equipment and trained support personnel for any confined space entry required during equipment installation/startup/commissioning/servicing. For permit-required confined space entry, a qualified rescue team on stand-by and available to respond within 4 minutes of an emergency. Client will identify and inform WTT's personnel of any hazards present in the work place that could impact the delivery of WTT's scope of supply and agrees to work with WTT to remove, monitor, and control the hazards to a practical level. Client will provide training to WTT's personnel on all relevant &amp; standard company operating procedures and practices for performing work on site.</p>

        <div className="sec2">12.2. JOBSITE AND INSTALLATION REVIEW</div>
        <p className="body-para tj indent">Review of WTT's supplied equipment drawings and specifications. All easements, licenses and permits required by governmental or regulatory authorities in Connection with the supply, erection and operation of the system.</p>
        <p className="body-para tj indent">Overall plant design, detail drawings of all termination points where WTT's equipment or Materials tie into equipment or materials supplied by others Stamping, signing or Sealing General drawings as per State, or local regulations or codes. All applicable civil design and works, including any building, site preparation, grading, excavations, foundations and trenches and accessories.</p>
        <p className="body-para tj indent">All electrical Labor and supplies leading up to jobsite including fittings, conduit, supports, cable trays, wire and hardware, air-conditioning of panels required to appropriately ground / earth the equipment as required for installation and ongoing operations.</p>
        <p className="body-para tj indent">All mechanical Labor and supplies leading up to jobsite including interconnecting piping, heat tracing (if required), fittings, conduit, pipe supports, and hardware as required for installation and ongoing operations. All instrumentation and automatic pneumatic valves including but not limited to; air/sample line tubing, fittings, conduit, supports, isolating valves as required for installation and ongoing operations. Loading, unloading and transportation of equipment, materials required for WTT to perform duties outlined in WTT's Scope of Supply to the jobsite and/or warehouse.</p>
        <p className="body-para tj indent">Client will provide all access structures (scaffolding), mechanical lifting equipment (cranes, forklifts, scissor lifts, etc.), suitable site/shelter for placement of the proposed equipment, either inside appropriate housing, or outdoors.</p>
        <p className="body-para tj indent mb3">Precaution: electrical equipment including the PLC may require air-conditioned rooms to prevent overheating of sensitive electronic equipment depending on climatic conditions. Bulk chemical storage and tanks, including secondary containment in accordance with local codes. Client will receive, off-load, log, and store all chemical and materials in accordance with Manufacturer's recommendation that are shipped. Compressed instrument air for pneumatic valves instruments and ejector system Equipment anchor bolts, Laboratory services, operating and maintenance personnel during equipment checkout, start-up and operation. Any on-site painting or touch-up painting of equipment supplied. Disposal of any Preservative.</p>
        <p className="body-para tj indent mb3">For erection, WTT will ship the accessories such as pipes, bolts, nuts, screws, cables, valves any other equipment or devices in excess quantities than required. This is in order to avoid shortages during the assembly due to damage or any other cause as it is difficult to procure the accessories locally. It is notified that all the shipped accessories during assembly and the excess accessories after commissioning are always remain the properties of WTT. WTT has the authority to retake the same at any period of time, even before and after commissioning. It is client's responsibility to preserve the above-mentioned items till WTT takes back the same.</p>

        <div className="sec2">12.3. START-UP AND COMMISSIONING</div>
        <p className="body-para tj indent mb3">Installation &amp; removal of temporary screens on all process lines Flushing and disinfection of all piping and tanks (including process equipment tanks) and verification of removal of all residual debris from construction. Alignments &amp; required materials for rotating equipment MEG testing of all field motor power wiring (as required). Continuity checks for all electrical field wiring as per Installation Checklist, Hydro-testing of all field installed piping. Supply raw materials, oil/lubricants chemicals and utilities during start-up and operation. Electrical &amp; Mechanical support labor for commissioning activities, loading of membranes, stacks, modules, etc.</p>

        <div className="sec2">12.4. FACILITY MANAGEMENT</div>
        <p className="body-para tj indent">Client will provide such warehouse storage space and facilities, as are available at the site, and are reasonably appropriate to store parts, consumables, tools, etc. in accordance with manufacturer's recommendations. Such warehouse storage space will be a segregated area, secured and protected from adverse climate as may reasonably be required. The storage area shall be facilitated with 24 hours lock &amp; key with security and Client will be responsible for risk of loss of WTT's parts while in storage at the site. Client will maintain WTT's parts stored at the site free &amp; clear of any and all liens of Client and lenders, bondholders, contractors &amp; other creditors of any nature.</p>
        <p className="body-para tj indent">Client will afford WTT's personnel free access and egress of the facility for all authorized work. Provide workshop facilities/area with roof and stabilized power supply, as is reasonably appropriate to carry out machining/fabrication works.</p>
        <p className="body-para tj indent mb3">Provide adequate illumination and emergency lighting for all areas in which the WTT will be executing the scope of supply. Identify a Client project contact person to be available to WTT's personnel to address any issues related to WTT's execution of WTT's scope of work. Responsible for the equipment for movement of chemical drums, totes, and resins, as is reasonable. Provide all site utilities such as raw water, instrument quality air, potable water and power required for operation of the proposed equipment included in this scope of supply.</p>

        <div className="sec2">12.5. CONDITIONAL OFFERING</div>
        <p className="body-para tj indent mb3">Client understands that this order confirmation has been issued based upon the information provided by Client and currently available to, WTT at the time of proposal issuance. Any changes or discrepancies in site conditions (including but not limited to system influent characteristics, changes in Environmental Health and Safety ("EH&amp;S") conditions, and/or newly discovered EH&amp;S concerns), Client financial standing, Client requirements, or any other relevant change, or discrepancy in, the factual basis upon which this proposal was created, may lead to changes in the offering, including but not limited to changes in pricing, warranties, quoted specifications, or terms and conditions. WTT's offering in this proposal is conditioned upon a full WTT EH&amp;S.</p>

        <div className="sec1">13. Appendix</div>

        <div className="sec2">13.1. APPENDIX A: CLARIFICATIONS</div>
        <ul style={{ paddingLeft: "4em", fontSize: "10.5pt", lineHeight: "1.7", marginBottom: "1em" }}>
          <li>Pump MOC has been considered as per WTT standard practice.</li>
          <li>The Equipment in WTT scope will be procured as per WTT Standard Vendor List.</li>
          <li>WTT has not envisaged third party equipment inspection before dispatch.</li>
          <li>The payments received once could not be processed again for refund.</li>
          <li>WTT has considered instruments as per WTT standard practice</li>
          <li>Painting specifications of WTT supplied equipment is as per standard manufacturer painting specifications.</li>
        </ul>

        <div className="sec2">13.2. APPENDIX C:&nbsp;&nbsp;WARRANTY</div>
        <p className="body-para tj indent">The mechanical warranty is only applicable to equipment supplied by WTT. The mechanical warranty period on all equipment supplied, unless otherwise noted, is twelve (12) months from the date of installation or fourteen (14) months from the notification of material readiness, whichever occurs first. WTT's obligation under this warranty is to the repair or replace, of any device or part thereof, which shall prove to have been manufacturing defects.</p>
        <p className="body-para tj indent">This warranty excludes the electrical items, defects, failures, damages or performance limitations caused in whole or in part by normal wear &amp; tear, power failures, surges, fires, floods, snow, ice, lightning, excessive heat or cold, highly corrosive environments, accidents, actions of third parties, or other events outside of WTT's control. Warranty period for the entire equipment including replaced or repaired parts will be limited to the unexpired portion of the total warranty period. Bought out components are guaranteed only to the extent of guarantees given to us by our suppliers.</p>
        <p className="body-para tj indent">WTT assumes no liability for any damage to equipment caused by inadequate storage or handling as per manufacturer's recommendations in supplied technical literature, or by defective or sub-standard workmanship or materials provided by Client or any other third party responsible for handling, storing or installing the equipment. Client undertakes to give immediate notice to WTT if goods or performance appear defective and to provide WTT with reasonable time and opportunity to make inspections and tests. If WTT is not at fault, Client shall pay WTT the costs and expenses of the inspections and tests.</p>
        <p className="body-para tj indent">Goods shall not be returned to WTT without WTT's permission. WTT will provide Client with a "Return Goods Authorization" (RGA) number to use for returned goods. All return costs associated with shipping and labor are not included in the mechanical warranty. WTT warrants, subject to the provisions herein after set forth, that after stable operation of the WTT system has been attained and operators have acquired reasonable skills, the Equipment supplied for this project will be capable of producing the results set forth in stage wise parameter table, provided that:</p>
        <ul style={{ paddingLeft: "4em", fontSize: "10.5pt", lineHeight: "1.7" }}>
          <li>The Equipment is operated and maintained at all times in accordance with the WTT Operations and Maintenance manual,</li>
          <li>The Equipment is operated within the mixed liquor characteristics defined in Influent quality table of this section,</li>
          <li>WTT has, until performance of its obligation herein is met, reasonable access to the Equipment and the operational data relating thereto,</li>
          <li>Client furnishes adequate and competent operating, supervisory and maintenance staff, and necessary laboratory facilities with test equipment and personnel,</li>
          <li>Client utilizes the services of WTT until its performance obligations are met,</li>
          <li>Client supplies all necessary raw materials and services of a quantity and of a quality specified by WTT,</li>
          <li>An adequate and continuous power supply is available that will enable operation of all required equipment.</li>
        </ul>

        <Footer pageNum={10} ref={propRef} />
      </div>
    </div>
  );
}

/* ─── Shell ─── */
export default function ProposalPDFView() {
  const id = new URLSearchParams(window.location.search).get("id");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setErr("No proposal ID provided"); setLoading(false); return; }
    fetch(`${API}/proposals/${id}`)
      .then(r => { if (!r.ok) throw new Error(`Not found (${r.status})`); return r.json(); })
      .then(setProposal)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  if (err || !proposal) return <div className="min-h-screen flex items-center justify-center text-gray-500"><p>{err || "Proposal not found"}</p></div>;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#c8c8c8" }}>
      {/* Toolbar */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b shadow-sm">
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => window.history.back()} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px", color: "#555", background: "none", border: "none", cursor: "pointer" }}>
              <ArrowLeft size={16} /> Back
            </button>
            <span style={{ color: "#ccc" }}>|</span>
            <strong style={{ fontSize: "14px" }}>{proposal.proposal_no}</strong>
            <span style={{ fontSize: "12px", color: "#888" }}>— {proposal.company_name}, {proposal.city}</span>
          </div>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 16px", background: "#1d4ed8", color: "white", border: "none", borderRadius: "4px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            <Printer size={15} /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* Pages */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 16px" }} className="print:p-0 print:max-w-none">
        <style>{`
          /* ── Base typography ── */
          .proposal-body {
            font-family: "Calibri", "Segoe UI", Arial, sans-serif;
            font-size: 11pt;
            color: #000;
            line-height: 1.5;
          }
          /* ── A4 page ── */
          @media screen {
            .doc-page {
              background: #fff;
              width: 21cm;
              min-height: 29.7cm;
              padding: 2.5cm 2.5cm 2cm 2.5cm;
              margin-bottom: 24px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.25);
              box-sizing: border-box;
              position: relative;
              display: flex;
              flex-direction: column;
            }
            .doc-page > *:not(.page-footer) { flex: 0 0 auto; }
            .doc-page > .spacer { flex: 1 1 auto; }
          }
          @media print {
            body { background: #fff !important; margin: 0; }
            .print\\:hidden { display: none !important; }
            .print\\:p-0 { padding: 0 !important; }
            .print\\:max-w-none { max-width: none !important; }
            .doc-page {
              width: 100%;
              padding: 2cm 2.5cm 1.8cm 2.5cm;
              page-break-after: always;
              min-height: 0;
              box-shadow: none;
              box-sizing: border-box;
              position: relative;
            }
            .doc-page:last-child { page-break-after: avoid; }
          }
          /* ── Page footer ── */
          .page-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #000;
            margin-top: auto;
            padding-top: 4px;
            font-size: 9pt;
          }
          @media screen { .page-footer { position: absolute; bottom: 1.5cm; left: 2.5cm; right: 2.5cm; } }
          @media print  { .page-footer { margin-top: 1em; } }
          /* ── Headings ── */
          .sec1  { font-weight: bold; font-size: 11pt; margin-top: 14px; margin-bottom: 6px; }
          .sec2  { font-weight: bold; font-size: 10.5pt; margin-top: 10px; margin-bottom: 4px; padding-left: 1.5em; }
          /* ── Body text helpers ── */
          .body-para { font-size: 11pt; margin-bottom: 6px; }
          .body-sm   { font-size: 9.5pt; }
          .tj        { text-align: justify; }
          .indent    { text-indent: 4em; }
          .mb3       { margin-bottom: 0.8em; }
          /* ── TOC dotted leaders ── */
          .toc-item {
            display: inline;
          }
          /* ── Tables ── */
          .proposal-body table { border-collapse: collapse; width: 100%; }
          .proposal-body td, .proposal-body th { word-break: break-word; }
        `}</style>
        <ProposalDocument p={proposal} />
      </div>
    </div>
  );
}
