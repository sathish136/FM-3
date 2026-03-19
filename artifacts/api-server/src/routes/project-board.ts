import { Router } from "express";
import {
  fetchErpNextProjectBoard,
  fetchErpNextProjectList,
  fetchErpNextMrRemarks,
} from "../lib/erpnext";

const router = Router();

router.get("/project-board", async (req, res) => {
  try {
    const { project, mr_remarks } = req.query as Record<string, string>;
    const data = await fetchErpNextProjectBoard({
      project: project || undefined,
      mr_remarks: mr_remarks || undefined,
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/project-board/projects", async (_req, res) => {
  try {
    const data = await fetchErpNextProjectList();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/project-board/mr-remarks", async (req, res) => {
  try {
    const { project } = req.query as Record<string, string>;
    const data = await fetchErpNextMrRemarks(project || undefined);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
