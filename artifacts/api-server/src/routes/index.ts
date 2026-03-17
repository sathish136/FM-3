import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pmRouter from "./pm";
import meetingMinutesRouter from "./meeting-minutes";
import spreadsheetsRouter from "./spreadsheets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pmRouter);
router.use(meetingMinutesRouter);
router.use("/spreadsheets", spreadsheetsRouter);

export default router;
