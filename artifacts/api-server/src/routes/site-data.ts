import { Router } from "express";

const router = Router();

// ─── Tag & site type definitions ───────────────────────────────────────────
export interface TagDef {
  id: string;
  label: string;
  unit?: string;
  adsTag: string;
  alarmLow?: number;
  alarmHigh?: number;
  goodLow?: number;
  goodHigh?: number;
  decimals?: number;
}

export interface SectionDef {
  title?: string;
  columns?: number;
  tags: TagDef[];
}

export interface SiteDef {
  id: string;
  name: string;
  sections: SectionDef[];
}

// ─── Site configuration (all 12 sites) ────────────────────────────────────
export const SITE_CONFIG: SiteDef[] = [
  {
    id: "kanchan_1_3",
    name: "KANCHAN 1.3 MLD",
    sections: [
      {
        title: "Main RO",
        tags: [
          { id: "k13_mr_feed",     label: "Feed Flow (m3/hr)", unit: "m3/hr", adsTag: "GVL.Kanchan1_3.MainRO.FeedFlow",     alarmLow:50,  alarmHigh:1300, goodLow:200, goodHigh:1000, decimals:1 },
          { id: "k13_mr_rec",      label: "Total Recovery (%)", unit: "%",   adsTag: "GVL.Kanchan1_3.MainRO.Recovery",     alarmLow:50,  alarmHigh:95,  goodLow:65,  goodHigh:85,  decimals:1 },
          { id: "k13_mr_setph",    label: "Set pH",                          adsTag: "GVL.Kanchan1_3.MainRO.SetpH",        decimals:2 },
          { id: "k13_mr_liveph",   label: "Live pH",                         adsTag: "GVL.Kanchan1_3.MainRO.LivepH",       alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0, decimals:2 },
        ],
      },
      {
        title: "Reject RO",
        tags: [
          { id: "k13_rr_feed",     label: "Feed Flow (m3/hr)", unit: "m3/hr", adsTag: "GVL.Kanchan1_3.RejectRO.FeedFlow",  decimals:1 },
          { id: "k13_rr_rec",      label: "Total Recovery (%)", unit: "%",   adsTag: "GVL.Kanchan1_3.RejectRO.Recovery",  decimals:1 },
          { id: "k13_rr_setph",    label: "Set pH",                          adsTag: "GVL.Kanchan1_3.RejectRO.SetpH",     decimals:2 },
          { id: "k13_rr_liveph",   label: "Live pH",                         adsTag: "GVL.Kanchan1_3.RejectRO.LivepH",    decimals:2 },
        ],
      },
    ],
  },
  {
    id: "rsa",
    name: "RSA",
    sections: [
      {
        title: "MBR",
        tags: [
          { id: "rsl_mbrflow", label: "MBR Flow",   unit: "m3/hr", adsTag: "GVL.RSA.MBRFlow",   decimals:1 },
          { id: "rsl_tmp",     label: "TMP",                        adsTag: "GVL.RSA.TMP",        decimals:3 },
          { id: "rsl_ntflow",  label: "NT Flow",    unit: "m3/hr", adsTag: "GVL.RSA.NTFlow",    decimals:1 },
          { id: "rsl_ntph",    label: "NT pH",                      adsTag: "GVL.RSA.NTpH",      decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "rsl_feed",    label: "Feed Flow",  unit: "m3/hr", adsTag: "GVL.RSA.RO.FeedFlow",   decimals:1 },
          { id: "rsl_rec",     label: "Recovery",    unit: "%",    adsTag: "GVL.RSA.RO.Recovery",   decimals:1, alarmLow:50, alarmHigh:95, goodLow:65, goodHigh:85 },
          { id: "rsl_liveph",  label: "Live pH",                    adsTag: "GVL.RSA.RO.LivepH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
        ],
      },
    ],
  },
  {
    id: "sona_etp",
    name: "SONA",
    sections: [
      {
        title: "Biological",
        tags: [
          { id: "setp_ntflow",  label: "NT Flow",     unit: "m3/hr", adsTag: "GVL.SonaETP.NTFlow",      decimals:1 },
          { id: "setp_biodo",   label: "Bio DO",                      adsTag: "GVL.SonaETP.BioDO",       decimals:2, alarmLow:1.0, alarmHigh:10, goodLow:2.0, goodHigh:6.0 },
          { id: "setp_srs",     label: "SRS Flow",    unit: "m3/hr", adsTag: "GVL.SonaETP.SRSFlow",     decimals:1 },
          { id: "setp_bl1",     label: "Blower 1",    unit: "Hz",    adsTag: "GVL.SonaETP.Blower1Freq", decimals:1 },
          { id: "setp_bl2",     label: "Blower 2",    unit: "Hz",    adsTag: "GVL.SonaETP.Blower2Freq", decimals:1 },
        ],
      },
    ],
  },
  {
    id: "sona1_reject",
    name: "SONA - 1",
    sections: [
      {
        title: "CTS",
        tags: [
          { id: "s1_cts_ph",    label: "CTS pH",   adsTag: "GVL.Sona1.CTS.pH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "s1_cts_flow",  label: "CTS Flow", unit:"m3/hr", adsTag: "GVL.Sona1.CTS.Flow", decimals:1 },
          { id: "s1_cts_do",    label: "DO",       adsTag: "GVL.Sona1.CTS.DO",    decimals:2, alarmLow:1.0, alarmHigh:10, goodLow:2.0, goodHigh:6.0 },
        ],
      },
      {
        title: "MBR",
        tags: [
          { id: "s1_mbr_ctsph",  label: "MBR pH",  adsTag: "GVL.Sona1.MBR.MBRpH", decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "s1_mbr_tmp",    label: "TMP",      adsTag: "GVL.Sona1.MBR.Tmp",   decimals:3 },
          { id: "s1_mbr_flow",   label: "Flow",     unit:"m3/hr", adsTag: "GVL.Sona1.MBR.Flow",  decimals:1 },
          { id: "s1_mbr_level",  label: "Level",    unit:"m",     adsTag: "GVL.Sona1.MBR.Level", decimals:1 },
        ],
      },
      {
        title: "Reject RO",
        tags: [
          { id: "s1_ro_feed",    label: "Feed Flow", unit:"m3/hr", adsTag: "GVL.Sona1.RO.FeedFlow",  decimals:1 },
          { id: "s1_ro_rec",     label: "Recovery",  unit:"%",     adsTag: "GVL.Sona1.RO.Recovery",  decimals:1, alarmLow:50, alarmHigh:95, goodLow:65, goodHigh:85 },
          { id: "s1_ro_liveph",  label: "Live pH",                 adsTag: "GVL.Sona1.RO.LivepH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "s1_ro_tank",    label: "Feed Tank", unit:"m",     adsTag: "GVL.Sona1.RO.FeedTank",  decimals:1 },
        ],
      },
    ],
  },
  {
    id: "sona2_reject",
    name: "SONA - 2",
    sections: [
      {
        title: "CTS",
        tags: [
          { id: "s2_cts_ph",    label: "CTS pH",   adsTag: "GVL.Sona2.CTS.pH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "s2_cts_flow",  label: "CTS Flow", unit:"m3/hr", adsTag: "GVL.Sona2.CTS.Flow", decimals:1 },
          { id: "s2_cts_do",    label: "DO",       adsTag: "GVL.Sona2.CTS.DO",    decimals:2, alarmLow:1.0, alarmHigh:10, goodLow:2.0, goodHigh:6.0 },
        ],
      },
      {
        title: "MBR",
        tags: [
          { id: "s2_mbr_ctsph",  label: "MBR pH",  adsTag: "GVL.Sona2.MBR.MBRpH", decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "s2_mbr_tmp",    label: "TMP",      adsTag: "GVL.Sona2.MBR.Tmp",   decimals:3 },
          { id: "s2_mbr_flow",   label: "Flow",     unit:"m3/hr", adsTag: "GVL.Sona2.MBR.Flow",  decimals:1 },
          { id: "s2_mbr_level",  label: "Level",    unit:"m",     adsTag: "GVL.Sona2.MBR.Level", decimals:1 },
        ],
      },
      {
        title: "Reject RO",
        tags: [
          { id: "s2_ro_feed",    label: "Feed Flow", unit:"m3/hr", adsTag: "GVL.Sona2.RO.FeedFlow",  decimals:1 },
          { id: "s2_ro_rec",     label: "Recovery",  unit:"%",     adsTag: "GVL.Sona2.RO.Recovery",  decimals:1, alarmLow:50, alarmHigh:95, goodLow:65, goodHigh:85 },
          { id: "s2_ro_liveph",  label: "Live pH",                 adsTag: "GVL.Sona2.RO.LivepH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "s2_ro_tank",    label: "Feed Tank", unit:"m",     adsTag: "GVL.Sona2.RO.FeedTank",  decimals:1 },
        ],
      },
    ],
  },
  {
    id: "bhilwara",
    name: "BHILWARA SPINNER",
    sections: [
      {
        title: "Biological",
        tags: [
          { id: "bh_ntflow",   label: "NT Flow",  unit:"m3/hr", adsTag: "GVL.Bhilwara.NTFlow",    decimals:1 },
          { id: "bh_biodo",    label: "Bio DO",               adsTag: "GVL.Bhilwara.BioDO",     decimals:2, alarmLow:1.0, alarmHigh:10, goodLow:2.0, goodHigh:6.0 },
          { id: "bh_srs",      label: "SRS Flow", unit:"m3/hr", adsTag: "GVL.Bhilwara.SRSFlow",   decimals:1 },
          { id: "bh_ntliveph", label: "NT pH",                adsTag: "GVL.Bhilwara.NTLivepH",  decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
        ],
      },
      {
        title: "CTS",
        tags: [
          { id: "bh_cts_ph",   label: "CTS pH",   adsTag: "GVL.Bhilwara.CTS.pH",   decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "bh_cts_flow", label: "CTS Flow", unit:"m3/hr", adsTag: "GVL.Bhilwara.CTS.Flow", decimals:1 },
          { id: "bh_cts_do",   label: "DO",       adsTag: "GVL.Bhilwara.CTS.DO",   decimals:2, alarmLow:1.0, alarmHigh:10, goodLow:2.0, goodHigh:6.0 },
        ],
      },
      {
        title: "MBR",
        tags: [
          { id: "bh_sk1_tmp",   label: "TMP S1",  adsTag: "GVL.Bhilwara.MBR.Skid1.Tmp",   decimals:3 },
          { id: "bh_sk2_tmp",   label: "TMP S2",  adsTag: "GVL.Bhilwara.MBR.Skid2.Tmp",   decimals:3 },
          { id: "bh_sk1_flow",  label: "Flow S1", unit:"m3/hr", adsTag: "GVL.Bhilwara.MBR.Skid1.Flow",  decimals:1 },
          { id: "bh_sk2_flow",  label: "Flow S2", unit:"m3/hr", adsTag: "GVL.Bhilwara.MBR.Skid2.Flow",  decimals:1 },
          { id: "bh_sk1_level", label: "Lvl S1",  unit:"m",     adsTag: "GVL.Bhilwara.MBR.Skid1.Level", decimals:1 },
          { id: "bh_sk2_level", label: "Lvl S2",  unit:"m",     adsTag: "GVL.Bhilwara.MBR.Skid2.Level", decimals:1 },
          { id: "bh_sk1_mbrph", label: "pH S1",  adsTag: "GVL.Bhilwara.MBR.Skid1.pH",   decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "bh_sk2_mbrph", label: "pH S2",  adsTag: "GVL.Bhilwara.MBR.Skid2.pH",   decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "bh_ro_feed",   label: "Feed Flow", unit:"m3/hr", adsTag: "GVL.Bhilwara.RO.FeedFlow",  decimals:1 },
          { id: "bh_ro_rec",    label: "Recovery",  unit:"%",     adsTag: "GVL.Bhilwara.RO.Recovery",  decimals:1, alarmLow:50, alarmHigh:95, goodLow:65, goodHigh:85 },
          { id: "bh_ro_liveph", label: "Live pH",                 adsTag: "GVL.Bhilwara.RO.LivepH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "bh_ro_dp1",    label: "DP-1",                    adsTag: "GVL.Bhilwara.RO.DP1",       decimals:3 },
          { id: "bh_ro_dp2",    label: "DP-2",                    adsTag: "GVL.Bhilwara.RO.DP2",       decimals:3 },
        ],
      },
    ],
  },
  {
    id: "kanchan_3",
    name: "KANCHAN 3 MLD",
    sections: [
      {
        tags: [
          { id: "k3_ntflow",  label: "NT Flow",       adsTag: "GVL.Kanchan3.NTFlow",   decimals:1 },
          { id: "k3_setph",   label: "SET pH",         adsTag: "GVL.Kanchan3.SetpH",    decimals:2 },
          { id: "k3_biodo",   label: "BIO DO (Live)", adsTag: "GVL.Kanchan3.BioDO",    decimals:2 },
          { id: "k3_liveph",  label: "Live pH",        adsTag: "GVL.Kanchan3.LivepH",   decimals:2 },
        ],
      },
      {
        title: "MBR",
        tags: [
          { id: "k3_sk1_tmp",   label: "MBR Tmp S1",    adsTag: "GVL.Kanchan3.MBR.Skid1.Tmp",    decimals:1 },
          { id: "k3_sk2_tmp",   label: "MBR Tmp S2",    adsTag: "GVL.Kanchan3.MBR.Skid2.Tmp",    decimals:1 },
          { id: "k3_sk3_tmp",   label: "MBR Tmp S3",    adsTag: "GVL.Kanchan3.MBR.Skid3.Tmp",    decimals:1 },
          { id: "k3_sk1_vol",   label: "MBR Volume S1", adsTag: "GVL.Kanchan3.MBR.Skid1.Volume", decimals:1 },
          { id: "k3_sk2_vol",   label: "MBR Volume S2", adsTag: "GVL.Kanchan3.MBR.Skid2.Volume", decimals:1 },
          { id: "k3_sk3_vol",   label: "MBR Volume S3", adsTag: "GVL.Kanchan3.MBR.Skid3.Volume", decimals:1 },
          { id: "k3_sk1_level", label: "MBR Level S1",  adsTag: "GVL.Kanchan3.MBR.Skid1.Level",  decimals:1 },
          { id: "k3_sk2_level", label: "MBR Level S2",  adsTag: "GVL.Kanchan3.MBR.Skid2.Level",  decimals:1 },
          { id: "k3_sk3_level", label: "MBR Level S3",  adsTag: "GVL.Kanchan3.MBR.Skid3.Level",  decimals:1 },
        ],
      },
    ],
  },
  {
    id: "momin",
    name: "MOMIN",
    sections: [
      {
        tags: [
          { id: "mo_ntflow",   label: "NT Flow",      adsTag: "GVL.Momin.NTFlow",    decimals:1 },
          { id: "mo_ocfm",     label: "OCFM Flow",    adsTag: "GVL.Momin.OCFMFlow",  decimals:1 },
          { id: "mo_ntphlive", label: "NT pH Live",   adsTag: "GVL.Momin.NTpHLive",  decimals:2 },
          { id: "mo_ltlevel",  label: "LT Level",     adsTag: "GVL.Momin.LTLevel",   decimals:1 },
          { id: "mo_srs",      label: "SRS Flow",     adsTag: "GVL.Momin.SRSFlow",   decimals:1 },
          { id: "mo_biopt",    label: "BIO PT",       adsTag: "GVL.Momin.BioPT",     decimals:2 },
          { id: "mo_eqtlevel", label: "EQT Level",    adsTag: "GVL.Momin.EQTLevel",  decimals:1 },
        ],
      },
    ],
  },
  {
    id: "brine",
    name: "BRINE",
    sections: [
      {
        title: "DEC",
        tags: [
          { id: "br_dec_feed",  label: "Feed Flow", adsTag: "GVL.Brine.DEC.FeedFlow", decimals:1 },
          { id: "br_dec_ph",    label: "Live PH",   adsTag: "GVL.Brine.DEC.LivepH",   decimals:2 },
        ],
      },
      {
        title: "SF",
        tags: [
          { id: "br_sf_sk1",  label: "Skid 1 Flow", adsTag: "GVL.Brine.SF.Skid1Flow", decimals:1 },
          { id: "br_sf_sk2",  label: "Skid 2 Flow", adsTag: "GVL.Brine.SF.Skid2Flow", decimals:1 },
          { id: "br_sf_sk3",  label: "Skid 3 Flow", adsTag: "GVL.Brine.SF.Skid3Flow", decimals:1 },
          { id: "br_sf_perph",label: "PER pH",       adsTag: "GVL.Brine.SF.PERpH",    decimals:2 },
        ],
      },
      {
        title: "UF",
        tags: [
          { id: "br_uf_feed",   label: "Feed Flow",       adsTag: "GVL.Brine.UF.FeedFlow",      decimals:1 },
          { id: "br_uf_filtime",label: "Filteration Time", adsTag: "GVL.Brine.UF.FiltTime",      decimals:1 },
          { id: "br_uf_tmp",    label: "TMP",              adsTag: "GVL.Brine.UF.TMP",           decimals:3 },
        ],
      },
      {
        title: "NF",
        tags: [
          { id: "br_nf_feed",   label: "Feed Flow",       adsTag: "GVL.Brine.NF.FeedFlow",     decimals:1 },
          { id: "br_nf_rec",    label: "Overall Recovery", adsTag: "GVL.Brine.NF.Recovery",     decimals:1 },
          { id: "br_nf_orp",    label: "ORP",              adsTag: "GVL.Brine.NF.ORP",          decimals:1 },
        ],
      },
    ],
  },
  {
    id: "lb_tex",
    name: "LB TEX",
    sections: [
      {
        title: "Biological",
        tags: [
          { id: "lbt_ntflow",   label: "NT Flow",  unit:"m3/hr", adsTag: "GVL.LBTex.NTFlow",    decimals:1 },
          { id: "lbt_biodo",    label: "Bio DO",               adsTag: "GVL.LBTex.BioDO",     decimals:2, alarmLow:1.0, alarmHigh:10, goodLow:2.0, goodHigh:6.0 },
          { id: "lbt_srs",      label: "SRS Flow", unit:"m3/hr", adsTag: "GVL.LBTex.SRSFlow",   decimals:1 },
          { id: "lbt_ntliveph", label: "NT pH",                adsTag: "GVL.LBTex.NTLivepH",  decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
        ],
      },
      {
        title: "MBR",
        tags: [
          { id: "lbt_sk1_tmp",     label: "TMP S1",   adsTag: "GVL.LBTex.Skid1.Tmp",       decimals:3 },
          { id: "lbt_sk2_tmp",     label: "TMP S2",   adsTag: "GVL.LBTex.Skid2.Tmp",       decimals:3 },
          { id: "lbt_sk1_flow",    label: "Flow S1",  unit:"m3/hr", adsTag: "GVL.LBTex.Skid1.Flow",   decimals:1 },
          { id: "lbt_sk2_flow",    label: "Flow S2",  unit:"m3/hr", adsTag: "GVL.LBTex.Skid2.Flow",   decimals:1 },
          { id: "lbt_sk1_level",   label: "Lvl S1",   unit:"m", adsTag: "GVL.LBTex.Skid1.Level",  decimals:1 },
          { id: "lbt_sk2_level",   label: "Lvl S2",   unit:"m", adsTag: "GVL.LBTex.Skid2.Level",  decimals:1 },
          { id: "lbt_sk1_dgtlive", label: "pH S1",    adsTag: "GVL.LBTex.Skid1.DGTpHLive", decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "lbt_sk2_dgtlive", label: "pH S2",    adsTag: "GVL.LBTex.Skid2.DGTpHLive", decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "lbt_ro_feed",   label: "Feed Flow", unit:"m3/hr", adsTag: "GVL.LBTex.RO.FeedFlow",  decimals:1 },
          { id: "lbt_ro_rec",    label: "Recovery",  unit:"%",     adsTag: "GVL.LBTex.RO.Recovery",  decimals:1, alarmLow:50, alarmHigh:95, goodLow:65, goodHigh:85 },
          { id: "lbt_ro_liveph", label: "Live pH",                 adsTag: "GVL.LBTex.RO.LivepH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "lbt_ro_dp1",    label: "DP-1",                    adsTag: "GVL.LBTex.RO.DP1",       decimals:3 },
          { id: "lbt_ro_dp2",    label: "DP-2",                    adsTag: "GVL.LBTex.RO.DP2",       decimals:3 },
        ],
      },
    ],
  },
  {
    id: "laxmi_vishal",
    name: "LAXMI VISHAL",
    sections: [
      {
        title: "Biological",
        tags: [
          { id: "lvt_bio_ntflow", label: "NT Flow",  unit:"m3/hr", adsTag: "GVL.LaxmiVishal.Bio.NTFlow",   decimals:1 },
          { id: "lvt_bio_do",     label: "Bio DO",               adsTag: "GVL.LaxmiVishal.Bio.BioDO",    decimals:2, alarmLow:1.0, alarmHigh:10, goodLow:2.0, goodHigh:6.0 },
          { id: "lvt_bio_srs",    label: "SRS Flow", unit:"m3/hr", adsTag: "GVL.LaxmiVishal.Bio.SRSFlow",  decimals:1 },
          { id: "lvt_bio_ph",     label: "Live pH",              adsTag: "GVL.LaxmiVishal.Bio.LivepH",   decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
        ],
      },
      {
        title: "UF",
        tags: [
          { id: "lvt_uf_feed",  label: "Feed Flow", unit:"m3/hr", adsTag: "GVL.LaxmiVishal.UF.FeedFlow", decimals:1 },
          { id: "lvt_uf_tmp",   label: "TMP",                     adsTag: "GVL.LaxmiVishal.UF.TMP",      decimals:3 },
          { id: "lvt_uf_perm",  label: "Permeate",  unit:"m3/hr", adsTag: "GVL.LaxmiVishal.UF.Permeate", decimals:1 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "lvt_ro_feed",    label: "Feed Flow", unit:"m3/hr", adsTag: "GVL.LaxmiVishal.RO.FeedFlow",  decimals:1 },
          { id: "lvt_ro_rec",     label: "Recovery",  unit:"%",     adsTag: "GVL.LaxmiVishal.RO.Recovery",  decimals:1, alarmLow:50, alarmHigh:95, goodLow:65, goodHigh:85 },
          { id: "lvt_ro_liveph",  label: "Live pH",                 adsTag: "GVL.LaxmiVishal.RO.LivepH",    decimals:2, alarmLow:6.0, alarmHigh:9.0, goodLow:6.8, goodHigh:8.0 },
          { id: "lvt_ro_dp1",     label: "DP-1",                    adsTag: "GVL.LaxmiVishal.RO.DP1",       decimals:3 },
          { id: "lvt_ro_dp2",     label: "DP-2",                    adsTag: "GVL.LaxmiVishal.RO.DP2",       decimals:3 },
        ],
      },
    ],
  },
  {
    id: "sachin",
    name: "SACHIN",
    sections: [
      {
        title: "MBR",
        tags: [
          { id: "sa_mbr_flow",    label: "MBR Flow",       adsTag: "GVL.Sachin.MBR.Flow",      decimals:1 },
          { id: "sa_mbr_tanklvl", label: "MBR Tank Level", adsTag: "GVL.Sachin.MBR.TankLevel", decimals:1 },
          { id: "sa_mbr_atmp",    label: "Actual TMP",     adsTag: "GVL.Sachin.MBR.ActualTMP", decimals:3 },
          { id: "sa_mbr_apt",     label: "Actual PT",      adsTag: "GVL.Sachin.MBR.ActualPT",  decimals:3 },
          { id: "sa_mbr_turb",    label: "Turbidity",      adsTag: "GVL.Sachin.MBR.Turbidity", decimals:2 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "sa_ro_feed",   label: "RO Feed Flow",      adsTag: "GVL.Sachin.RO.FeedFlow",   decimals:1 },
          { id: "sa_ro_rec",    label: "Total Recovery (%)", adsTag: "GVL.Sachin.RO.Recovery",   decimals:1 },
          { id: "sa_ro_setph",  label: "Set pH",             adsTag: "GVL.Sachin.RO.SetpH",      decimals:2 },
          { id: "sa_ro_liveph", label: "Live pH",            adsTag: "GVL.Sachin.RO.LivepH",     decimals:2 },
          { id: "sa_ro_dp1",    label: "DP-1",               adsTag: "GVL.Sachin.RO.DP1",        decimals:3 },
          { id: "sa_ro_dp2",    label: "DP-2",               adsTag: "GVL.Sachin.RO.DP2",        decimals:3 },
        ],
      },
    ],
  },
  {
    id: "swaraj",
    name: "SWARAJ",
    sections: [
      {
        tags: [
          { id: "sw_ntph",   label: "NT pH",        adsTag: "GVL.Swaraj.NTpH",       decimals:2 },
          { id: "sw_ntflow", label: "NT FLOW",      adsTag: "GVL.Swaraj.NTFlow",     decimals:1 },
          { id: "sw_bl1",    label: "Blower 1 Freq",unit:"Hz", adsTag: "GVL.Swaraj.Blower1Freq", decimals:1 },
          { id: "sw_bl2",    label: "Blower 2 Freq",unit:"Hz", adsTag: "GVL.Swaraj.Blower2Freq", decimals:1 },
          { id: "sw_bl3",    label: "Blower 3 Freq",unit:"Hz", adsTag: "GVL.Swaraj.Blower3Freq", decimals:1 },
        ],
      },
    ],
  },
];

// ─── In-memory tag value store ─────────────────────────────────────────────
interface TagValue {
  value: number | null;
  timestamp: number;
  source: "ads" | "push" | "simulated";
}

const tagStore: Map<string, TagValue> = new Map();
let isSimulating = true;

// Collect all tag IDs for quick lookup
const allTags: TagDef[] = SITE_CONFIG.flatMap(site =>
  site.sections.flatMap(sec => sec.tags)
);

// ─── Simulation (realistic water treatment values) ─────────────────────────
function simulateValue(tag: TagDef): number {
  const id = tag.id;
  if (id.includes("ph") || id.includes("pH")) {
    return 6.5 + Math.random() * 1.5 + (Math.random() < 0.05 ? -1.5 : 0);
  }
  if (id.includes("feed") || id.includes("feed_flow") || id.includes("ntflow") || id.includes("flow")) {
    return 200 + Math.random() * 800;
  }
  if (id.includes("rec") && !id.includes("freq")) {
    return 60 + Math.random() * 20;
  }
  if (id.includes("tmp") || id.includes("TMP")) {
    return 0.2 + Math.random() * 0.5;
  }
  if (id.includes("biodo") || id.includes("BioDO")) {
    return 2 + Math.random() * 4;
  }
  if (id.includes("freq") || id.includes("Freq")) {
    return 30 + Math.random() * 20;
  }
  if (id.includes("level") || id.includes("Level")) {
    return 20 + Math.random() * 70;
  }
  if (id.includes("turb")) {
    return 0.5 + Math.random() * 4;
  }
  if (id.includes("orp") || id.includes("ORP")) {
    return 200 + Math.random() * 200;
  }
  if (id.includes("filtime")) {
    return 10 + Math.random() * 20;
  }
  return Math.random() * 100;
}

function runSimulation() {
  if (!isSimulating) return;
  for (const tag of allTags) {
    const existing = tagStore.get(tag.id);
    let newVal: number;
    if (existing && existing.value !== null) {
      const delta = (simulateValue(tag) - existing.value) * 0.1;
      newVal = existing.value + delta;
    } else {
      newVal = simulateValue(tag);
    }
    tagStore.set(tag.id, { value: newVal, timestamp: Date.now(), source: "simulated" });
  }
}

runSimulation();
setInterval(runSimulation, 2000);

// ─── Routes ────────────────────────────────────────────────────────────────

// GET /api/site-data/config - returns site definitions
router.get("/site-data/config", (_req, res) => {
  res.json({ sites: SITE_CONFIG });
});

// GET /api/site-data/values - returns current tag values for all sites
router.get("/site-data/values", (_req, res) => {
  const values: Record<string, { value: number | null; timestamp: number; source: string; status: "normal" | "good" | "alarm" | "offline" }> = {};

  for (const tag of allTags) {
    const stored = tagStore.get(tag.id);
    if (!stored || stored.value === null) {
      values[tag.id] = { value: null, timestamp: 0, source: "none", status: "offline" };
      continue;
    }

    let status: "normal" | "good" | "alarm" | "offline" = "normal";
    const v = stored.value;
    if (tag.alarmLow !== undefined && v < tag.alarmLow) status = "alarm";
    else if (tag.alarmHigh !== undefined && v > tag.alarmHigh) status = "alarm";
    else if (tag.goodLow !== undefined && tag.goodHigh !== undefined && v >= tag.goodLow && v <= tag.goodHigh) status = "good";

    values[tag.id] = {
      value: parseFloat(v.toFixed(tag.decimals ?? 2)),
      timestamp: stored.timestamp,
      source: stored.source,
      status,
    };
  }

  res.json({
    values,
    isSimulated: isSimulating,
    updatedAt: Date.now(),
  });
});

// POST /api/site-data/push - local ADS bridge can POST updates here
// Body: { tags: { [tagId]: number } }
router.post("/site-data/push", (req, res) => {
  const { tags } = req.body as { tags: Record<string, number> };
  if (!tags || typeof tags !== "object") {
    return res.status(400).json({ error: "Expected { tags: { [tagId]: number } }" });
  }

  let updated = 0;
  for (const [id, value] of Object.entries(tags)) {
    if (typeof value === "number") {
      tagStore.set(id, { value, timestamp: Date.now(), source: "push" });
      updated++;
    }
  }

  if (updated > 0) isSimulating = false;

  return res.json({ ok: true, updated });
});

// GET /api/site-data/stream - SSE stream of all tag values, pushed every 2s
router.get("/site-data/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let closed = false;

  const sendValues = () => {
    if (closed) return;
    const values: Record<string, { value: number | null; timestamp: number; source: string; status: "normal" | "good" | "alarm" | "offline" }> = {};
    for (const tag of allTags) {
      const stored = tagStore.get(tag.id);
      if (!stored || stored.value === null) {
        values[tag.id] = { value: null, timestamp: 0, source: "none", status: "offline" };
        continue;
      }
      let status: "normal" | "good" | "alarm" | "offline" = "normal";
      const v = stored.value;
      if (tag.alarmLow !== undefined && v < tag.alarmLow) status = "alarm";
      else if (tag.alarmHigh !== undefined && v > tag.alarmHigh) status = "alarm";
      else if (tag.goodLow !== undefined && tag.goodHigh !== undefined && v >= tag.goodLow && v <= tag.goodHigh) status = "good";
      values[tag.id] = { value: parseFloat(v.toFixed(tag.decimals ?? 2)), timestamp: stored.timestamp, source: stored.source, status };
    }
    res.write(`event: values\ndata: ${JSON.stringify({ values, isSimulated: isSimulating, updatedAt: Date.now() })}\n\n`);
  };

  sendValues();
  const timer = setInterval(sendValues, 2000);
  const heartbeat = setInterval(() => { if (!closed) res.write(": heartbeat\n\n"); }, 15000);

  req.on("close", () => {
    closed = true;
    clearInterval(timer);
    clearInterval(heartbeat);
    res.end();
  });
});

// GET /api/site-data/ads-tags - returns all ADS tag paths for reference
router.get("/site-data/ads-tags", (_req, res) => {
  const tags = allTags.map(t => ({ id: t.id, label: t.label, adsTag: t.adsTag }));
  res.json({ tags });
});

// ── Kanchan RO Live Data Proxy ───────────────────────────────────────────────
// Proxies the external PLC API so the browser avoids CORS / mixed-content issues
router.get("/kanchan/ro-live", async (_req, res) => {
  try {
    const r = await fetch("http://api.wttint.com/api/all-values", { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return res.status(502).json({ error: `Upstream error ${r.status}` });
    const data = await r.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(503).json({ error: err.message || "Upstream unreachable" });
  }
});

// ── Kanchan RO SSE Stream ────────────────────────────────────────────────────
// Server-Sent Events: pushes live data to the browser continuously, no polling
router.get("/kanchan/ro-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let closed = false;

  const send = (event: string, data: unknown) => {
    if (!closed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const fetchAndSend = async () => {
    if (closed) return;
    try {
      const r = await fetch("http://api.wttint.com/api/all-values", { signal: AbortSignal.timeout(8000) });
      if (!r.ok) { send("error", { error: `Upstream error ${r.status}` }); return; }
      const data = await r.json();
      send("data", data);
    } catch (err: any) {
      send("error", { error: err.message || "Upstream unreachable" });
    }
  };

  // Immediate first push
  fetchAndSend();

  // Push every 2 seconds
  const timer = setInterval(fetchAndSend, 2000);

  // Heartbeat every 15s to keep connection alive through proxies
  const heartbeat = setInterval(() => { if (!closed) res.write(": heartbeat\n\n"); }, 15000);

  req.on("close", () => {
    closed = true;
    clearInterval(timer);
    clearInterval(heartbeat);
    res.end();
  });
});

export default router;
