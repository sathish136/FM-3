import { Router } from "express";
import {
  fetchErpNextProjectBoard,
  fetchErpNextProjectList,
} from "../lib/erpnext";

const router = Router();

router.get("/project-board", async (req, res) => {
  try {
    const {
      project,
      project_remarks,
      pending_only,
      po_not_created,
      due,
    } = req.query as Record<string, string>;

    const data = await fetchErpNextProjectBoard({
      project: project || undefined,
      project_remarks: project_remarks || undefined,
      pending_only: pending_only === "1",
      po_not_created: po_not_created === "1",
      due: due === "1",
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

export default router;
