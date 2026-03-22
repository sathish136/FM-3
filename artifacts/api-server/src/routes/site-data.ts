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
    id: "rsl",
    name: "RSL",
    sections: [
      {
        tags: [
          { id: "rsl_feed",    label: "Feed (m3/hr)",  unit: "m3/hr", adsTag: "GVL.RSL.FeedFlow",   decimals:1 },
          { id: "rsl_rec",     label: "Recovery (%)",   unit: "%",    adsTag: "GVL.RSL.Recovery",   decimals:1 },
          { id: "rsl_liveph",  label: "Live pH",                       adsTag: "GVL.RSL.LivepH",    decimals:2 },
          { id: "rsl_mbrflow", label: "MBR Flow",                      adsTag: "GVL.RSL.MBRFlow",   decimals:1 },
          { id: "rsl_tmp",     label: "TMP",                           adsTag: "GVL.RSL.TMP",       decimals:3 },
          { id: "rsl_ntflow",  label: "NT Flow",                       adsTag: "GVL.RSL.NTFlow",    decimals:1 },
          { id: "rsl_ntph",    label: "NT pH",                         adsTag: "GVL.RSL.NTpH",      decimals:2 },
        ],
      },
    ],
  },
  {
    id: "sona_etp",
    name: "SONA - ETP",
    sections: [
      {
        tags: [
          { id: "setp_ntflow",  label: "NT Flow",          adsTag: "GVL.SonaETP.NTFlow",     decimals:1 },
          { id: "setp_bl1",     label: "Blower 1 Freq",   unit: "Hz", adsTag: "GVL.SonaETP.Blower1Freq", decimals:1 },
          { id: "setp_bl2",     label: "Blower 2 Freq",   unit: "Hz", adsTag: "GVL.SonaETP.Blower2Freq", decimals:1 },
          { id: "setp_srs",     label: "SRS Flow",         adsTag: "GVL.SonaETP.SRSFlow",    decimals:1 },
          { id: "setp_biodo",   label: "BIO DO",           adsTag: "GVL.SonaETP.BioDO",      decimals:2 },
        ],
      },
    ],
  },
  {
    id: "sona1_reject",
    name: "SONA - 1 REJECT",
    sections: [
      {
        title: "MBR",
        tags: [
          { id: "s1_mbr_ctsph",  label: "CTS pH",   adsTag: "GVL.Sona1.MBR.CTSpH",  decimals:2 },
          { id: "s1_mbr_mbrph",  label: "MBR pH",   adsTag: "GVL.Sona1.MBR.MBRpH",  decimals:2 },
          { id: "s1_mbr_tmp",    label: "Tmp",       adsTag: "GVL.Sona1.MBR.Tmp",    decimals:1 },
          { id: "s1_mbr_flow",   label: "Flow",      adsTag: "GVL.Sona1.MBR.Flow",   decimals:1 },
          { id: "s1_mbr_level",  label: "Level",     adsTag: "GVL.Sona1.MBR.Level",  decimals:1 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "s1_ro_feed",    label: "Feed Flow",         adsTag: "GVL.Sona1.RO.FeedFlow",    decimals:1 },
          { id: "s1_ro_rec",     label: "Recovery",  unit:"%", adsTag: "GVL.Sona1.RO.Recovery",   decimals:1 },
          { id: "s1_ro_liveph",  label: "Live pH",            adsTag: "GVL.Sona1.RO.LivepH",      decimals:2 },
          { id: "s1_ro_tank",    label: "Feed Tank",          adsTag: "GVL.Sona1.RO.FeedTank",    decimals:1 },
          { id: "s1_ro_st1in",   label: "ST-1-IN Freq",  unit:"Hz", adsTag: "GVL.Sona1.RO.ST1InFreq",  decimals:1 },
          { id: "s1_ro_st1out",  label: "ST-1-OUT Freq", unit:"Hz", adsTag: "GVL.Sona1.RO.ST1OutFreq", decimals:1 },
          { id: "s1_ro_st2in",   label: "ST-2-IN Freq",  unit:"Hz", adsTag: "GVL.Sona1.RO.ST2InFreq",  decimals:1 },
          { id: "s1_ro_st2out",  label: "ST-2-OUT Freq", unit:"Hz", adsTag: "GVL.Sona1.RO.ST2OutFreq", decimals:1 },
        ],
      },
    ],
  },
  {
    id: "sona2_reject",
    name: "SONA - 2 REJECT",
    sections: [
      {
        title: "MBR",
        tags: [
          { id: "s2_mbr_ctsph",  label: "CTS pH",   adsTag: "GVL.Sona2.MBR.CTSpH",  decimals:2 },
          { id: "s2_mbr_mbrph",  label: "MBR pH",   adsTag: "GVL.Sona2.MBR.MBRpH",  decimals:2 },
          { id: "s2_mbr_tmp",    label: "Tmp",       adsTag: "GVL.Sona2.MBR.Tmp",    decimals:1 },
          { id: "s2_mbr_flow",   label: "Flow",      adsTag: "GVL.Sona2.MBR.Flow",   decimals:1 },
          { id: "s2_mbr_level",  label: "Level",     adsTag: "GVL.Sona2.MBR.Level",  decimals:1 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "s2_ro_feed",    label: "Feed Flow",         adsTag: "GVL.Sona2.RO.FeedFlow",    decimals:1 },
          { id: "s2_ro_rec",     label: "Recovery",  unit:"%", adsTag: "GVL.Sona2.RO.Recovery",   decimals:1 },
          { id: "s2_ro_liveph",  label: "Live pH",            adsTag: "GVL.Sona2.RO.LivepH",      decimals:2 },
          { id: "s2_ro_tank",    label: "Feed Tank",          adsTag: "GVL.Sona2.RO.FeedTank",    decimals:1 },
          { id: "s2_ro_st1in",   label: "ST-1-IN Freq",  unit:"Hz", adsTag: "GVL.Sona2.RO.ST1InFreq",  decimals:1 },
          { id: "s2_ro_st1out",  label: "ST-1-OUT Freq", unit:"Hz", adsTag: "GVL.Sona2.RO.ST1OutFreq", decimals:1 },
          { id: "s2_ro_st2in",   label: "ST-2-IN Freq",  unit:"Hz", adsTag: "GVL.Sona2.RO.ST2InFreq",  decimals:1 },
          { id: "s2_ro_st2out",  label: "ST-2-OUT Freq", unit:"Hz", adsTag: "GVL.Sona2.RO.ST2OutFreq", decimals:1 },
        ],
      },
    ],
  },
  {
    id: "bhilwara",
    name: "BHILWARA",
    sections: [
      {
        tags: [
          { id: "bh_ntflow",  label: "NT Flow",      adsTag: "GVL.Bhilwara.NTFlow",    decimals:1 },
          { id: "bh_srs",     label: "SRS Flow",     adsTag: "GVL.Bhilwara.SRSFlow",   decimals:1 },
          { id: "bh_biodo",   label: "Bio DO",       adsTag: "GVL.Bhilwara.BioDO",     decimals:2 },
          { id: "bh_ntliveph",label: "NT Live pH",   adsTag: "GVL.Bhilwara.NTLivepH",  decimals:2 },
        ],
      },
      {
        title: "MBR SKID",
        columns: 2,
        tags: [
          { id: "bh_sk1_tmp",   label: "Tmp S1",   adsTag: "GVL.Bhilwara.MBR.Skid1.Tmp",   decimals:1 },
          { id: "bh_sk2_tmp",   label: "Tmp S2",   adsTag: "GVL.Bhilwara.MBR.Skid2.Tmp",   decimals:1 },
          { id: "bh_sk1_flow",  label: "Flow S1",  adsTag: "GVL.Bhilwara.MBR.Skid1.Flow",  decimals:1 },
          { id: "bh_sk2_flow",  label: "Flow S2",  adsTag: "GVL.Bhilwara.MBR.Skid2.Flow",  decimals:1 },
          { id: "bh_sk1_level", label: "Level S1", adsTag: "GVL.Bhilwara.MBR.Skid1.Level", decimals:1 },
          { id: "bh_sk2_level", label: "Level S2", adsTag: "GVL.Bhilwara.MBR.Skid2.Level", decimals:1 },
          { id: "bh_sk1_mbrph", label: "MBR pH S1",adsTag: "GVL.Bhilwara.MBR.Skid1.pH",   decimals:2 },
          { id: "bh_sk2_mbrph", label: "MBR pH S2",adsTag: "GVL.Bhilwara.MBR.Skid2.pH",   decimals:2 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "bh_ro_feed",   label: "RO Feed Flow",         adsTag: "GVL.Bhilwara.RO.FeedFlow",  decimals:1 },
          { id: "bh_ro_rec",    label: "Total Recovery (%)", unit:"%", adsTag: "GVL.Bhilwara.RO.Recovery",  decimals:1 },
          { id: "bh_ro_setph",  label: "Set pH",               adsTag: "GVL.Bhilwara.RO.SetpH",     decimals:2 },
          { id: "bh_ro_liveph", label: "Live pH",               adsTag: "GVL.Bhilwara.RO.LivepH",    decimals:2 },
          { id: "bh_ro_dp1",    label: "DP-1",                  adsTag: "GVL.Bhilwara.RO.DP1",       decimals:3 },
          { id: "bh_ro_dp2",    label: "DP-2",                  adsTag: "GVL.Bhilwara.RO.DP2",       decimals:3 },
          { id: "bh_ro_dp3",    label: "DP-3",                  adsTag: "GVL.Bhilwara.RO.DP3",       decimals:3 },
          { id: "bh_ro_dp4",    label: "DP-4",                  adsTag: "GVL.Bhilwara.RO.DP4",       decimals:3 },
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
        tags: [
          { id: "lbt_ntflow",   label: "NT Flow",   adsTag: "GVL.LBTex.NTFlow",    decimals:1 },
          { id: "lbt_srs",      label: "SRS Flow",  adsTag: "GVL.LBTex.SRSFlow",   decimals:1 },
          { id: "lbt_biodo",    label: "Bio DO",    adsTag: "GVL.LBTex.BioDO",     decimals:2 },
          { id: "lbt_ntliveph", label: "NT Live pH",adsTag: "GVL.LBTex.NTLivepH",  decimals:2 },
        ],
      },
      {
        title: "Skid 1",
        tags: [
          { id: "lbt_sk1_tmp",      label: "Tmp",         adsTag: "GVL.LBTex.Skid1.Tmp",        decimals:1 },
          { id: "lbt_sk1_flow",     label: "Flow",        adsTag: "GVL.LBTex.Skid1.Flow",       decimals:1 },
          { id: "lbt_sk1_level",    label: "Level",       adsTag: "GVL.LBTex.Skid1.Level",      decimals:1 },
          { id: "lbt_sk1_dgtset",   label: "DGT pH Set",  adsTag: "GVL.LBTex.Skid1.DGTpHSet",  decimals:2 },
          { id: "lbt_sk1_dgtlive",  label: "DGT pH Live", adsTag: "GVL.LBTex.Skid1.DGTpHLive", decimals:2 },
        ],
      },
      {
        title: "Skid 2",
        tags: [
          { id: "lbt_sk2_tmp",      label: "Tmp",         adsTag: "GVL.LBTex.Skid2.Tmp",        decimals:1 },
          { id: "lbt_sk2_flow",     label: "Flow",        adsTag: "GVL.LBTex.Skid2.Flow",       decimals:1 },
          { id: "lbt_sk2_level",    label: "Level",       adsTag: "GVL.LBTex.Skid2.Level",      decimals:1 },
          { id: "lbt_sk2_dgtset",   label: "DGT pH Set",  adsTag: "GVL.LBTex.Skid2.DGTpHSet",  decimals:2 },
          { id: "lbt_sk2_dgtlive",  label: "DGT pH Live", adsTag: "GVL.LBTex.Skid2.DGTpHLive", decimals:2 },
        ],
      },
      {
        title: "RO",
        tags: [
          { id: "lbt_ro_feed",   label: "RO Feed Flow",     adsTag: "GVL.LBTex.RO.FeedFlow",    decimals:1 },
          { id: "lbt_ro_rec",    label: "Total Recovery (%)",adsTag: "GVL.LBTex.RO.Recovery",    decimals:1 },
          { id: "lbt_ro_setph",  label: "Set pH",            adsTag: "GVL.LBTex.RO.SetpH",       decimals:2 },
          { id: "lbt_ro_liveph", label: "Live pH",           adsTag: "GVL.LBTex.RO.LivepH",      decimals:2 },
          { id: "lbt_ro_dp1",    label: "DP-1",              adsTag: "GVL.LBTex.RO.DP1",         decimals:3 },
          { id: "lbt_ro_dp2",    label: "DP-2",              adsTag: "GVL.LBTex.RO.DP2",         decimals:3 },
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

// GET /api/site-data/ads-tags - returns all ADS tag paths for reference
router.get("/site-data/ads-tags", (_req, res) => {
  const tags = allTags.map(t => ({ id: t.id, label: t.label, adsTag: t.adsTag }));
  res.json({ tags });
});

export default router;
