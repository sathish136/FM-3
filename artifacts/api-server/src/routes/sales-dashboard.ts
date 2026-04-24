import { Router } from "express";
import { erpFetch } from "../lib/erp";

const router = Router();

type Row = Record<string, any>;
const ok = (total_count: number, data: Row[]) => ({ total_count, data });

async function callErp(path: string, params: Record<string, string> = {}) {
  try {
    const r = await erpFetch(path, params);
    return r?.message ?? {};
  } catch (e: any) {
    console.error(`[sales-dashboard] ${path} -> ${e?.message ?? e}`);
    return {};
  }
}

// 1. TODAY'S FOLLOWUP
router.get("/sales-dashboard/today_followup", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_leads_today");
  const rows: Row[] = [];
  for (const lead of msg.data ?? []) {
    for (const f of lead.followups ?? []) {
      rows.push({
        lead_id: lead.lead_id ?? "",
        lead_name: lead.lead_name ?? "",
        date: f.date ?? "",
        mode_of_comm: f.mode_of_communication ?? "",
        employee_name: f.employee_name ?? "",
        represent_name: f.client_side_representative ?? "",
        conversation: f.conversation ?? "",
        next_followup: (lead.next_follow_up ?? "").toString().slice(0, 10),
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 2. YESTERDAY'S FOLLOWUP
router.get("/sales-dashboard/yest_followup", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_leads_yesterday");
  const rows: Row[] = [];
  for (const lead of msg.data ?? []) {
    for (const f of lead.followups ?? []) {
      rows.push({
        lead_id: lead.lead_id ?? "",
        lead_name: lead.lead_name ?? "",
        date: f.date ?? "",
        mode_of_comm: f.mode_of_communication ?? "",
        employee_name: f.employee_name ?? "",
        represent_name: f.client_side_representative ?? "",
        conversation: f.conversation ?? "",
        next_followup: (lead.next_follow_up ?? "").toString().slice(0, 10),
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

function mapLeadRow(r: Row): Row {
  return {
    date: (r.creation_date ?? "").toString().slice(0, 10),
    company_name: r.company_name ?? "",
    email_id: r.email_id ?? r.email ?? r.e_mail_id ?? "",
    contact_no_1:
      r.contact_no_1 ?? r.contact_1 ?? r.mobile_number ?? r.phone ?? "",
    contact_no_2: r.contact_no_2 ?? r.contact_2 ?? r.mobile_no ?? "",
    capacity: r.capacity ?? "",
    requirement: r.requirements ?? r.requirement ?? "",
    next_followup: (r.next_follow_up ?? "").toString().slice(0, 10),
  };
}

const leadEndpoints: [string, string][] = [
  ["red_hot", "wtt_module.customization.custom.rfq.get_red_hot_leads"],
  ["hot_lead", "wtt_module.customization.custom.rfq.get_hot_leads"],
  ["warm_lead", "wtt_module.customization.custom.rfq.get_warm_leads"],
  ["cold_lead", "wtt_module.customization.custom.rfq.get_cold_leads"],
];

for (const [key, path] of leadEndpoints) {
  router.get(`/sales-dashboard/${key}`, async (_req, res) => {
    const msg = await callErp(path);
    const rows = (msg.data ?? []).map(mapLeadRow);
    res.json(ok(msg.total_count ?? 0, rows));
  });
}

// 7. TOTAL AGENTS
router.get("/sales-dashboard/total_agents", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_agent_details");
  const rows: Row[] = [];
  for (const agent of msg.data ?? []) {
    const region = agent.region ?? "";
    const company_name = agent.company_name ?? agent.agent_name ?? "";
    for (const c of agent.contacts ?? []) {
      rows.push({
        agent_name: c.poc ?? "",
        company_name,
        region,
        email_id: c.email_1 ?? c.email_2 ?? "",
        contact_1: c.contact_1 ?? "",
        contact_2: c.contact_2 ?? "",
        contact_3: c.contact_3 ?? "",
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 8. CALL LOGS
router.get("/sales-dashboard/call_logs", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_marketing_call_logs");
  const rows: Row[] = [];
  for (const item of msg.data ?? []) {
    for (const log of item.call_logs ?? []) {
      rows.push({
        phone: log.phone_number ?? item.parent_id ?? "",
        call_date: log.call_date ?? "",
        call_type: log.call_type ?? "",
        summary: log.summary ?? log.call_type ?? "",
        person_name:
          log.person_name ?? log.contact_person ?? item.person_name ?? "",
      });
    }
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 9. CUSTOMER DETAILS
router.get("/sales-dashboard/customer_details", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.customer_details");
  const rows: Row[] = [];
  for (const r of msg.data ?? []) {
    const attachments: Row[] = r.attachments ?? [];
    rows.push({
      proposal_req_no: r.name ?? "",
      customer_name: r.company_name ?? "",
      email: r.e_mail_id ?? "",
      phone: r.mobile_number ?? "",
      attachment_count: attachments.length,
      attachment_files: attachments.map((a) => ({
        name: a.file_name ?? "",
        url: a.file_url ?? "",
      })),
      capacity: r.plant_capacity_m3day ?? "",
    });
  }
  res.json(ok(msg.total_count ?? 0, rows));
});

// 10. OPEN LEADS
router.get("/sales-dashboard/open_leads", async (_req, res) => {
  const msg = await callErp("wtt_module.customization.custom.rfq.get_open_leads");
  const rows = (msg.data ?? []).map((lead: Row) => ({
    name: lead.name ?? "",
    company_name: lead.company_name ?? "",
    email_id: lead.email_id ?? "",
    contact_no_1: lead.contact_no_1 ?? "",
    contact_no_2: lead.contact_no_2 ?? "",
    capacity: lead.capacity ?? "",
    requirement: lead.requirement ?? "",
    next_follow_up: (lead.next_follow_up ?? "").toString().slice(0, 10),
  }));
  res.json(ok(msg.total_count ?? 0, rows));
});

export default router;
