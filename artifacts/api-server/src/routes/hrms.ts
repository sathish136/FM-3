import { Router } from "express";
import {
  fetchErpNextEmployees,
  fetchErpNextLeaveApplications,
  fetchErpNextAttendance,
} from "../lib/erpnext";

const router = Router();

router.get("/hrms/employees", async (req, res) => {
  try {
    const { status, department } = req.query as Record<string, string>;
    const data = await fetchErpNextEmployees({ status, department });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/hrms/leave-applications", async (req, res) => {
  try {
    const { status, employee } = req.query as Record<string, string>;
    const data = await fetchErpNextLeaveApplications({ status, employee });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/hrms/attendance", async (req, res) => {
  try {
    const { status, department } = req.query as Record<string, string>;
    const data = await fetchErpNextAttendance({ status, department });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
