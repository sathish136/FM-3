import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pmRouter from "./pm";
import meetingMinutesRouter from "./meeting-minutes";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pmRouter);
router.use(meetingMinutesRouter);

export default router;
