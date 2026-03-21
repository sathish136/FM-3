import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pmRouter from "./pm";
import meetingMinutesRouter from "./meeting-minutes";
import spreadsheetsRouter from "./spreadsheets";
import authRouter from "./auth";
import pidAnalyzeRouter from "./pid-analyze";
import aiSearchRouter from "./ai-search";
import hrmsRouter from "./hrms";
import projectBoardRouter from "./project-board";
import emailRouter from "./email";
import emailSettingsRouter from "./emailSettings";
import chatRouter from "./chat";
import incidentsRouter from "./incidents";
import drawingsRouter from "./drawings";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(pmRouter);
router.use(meetingMinutesRouter);
router.use("/spreadsheets", spreadsheetsRouter);
router.use(pidAnalyzeRouter);
router.use(aiSearchRouter);
router.use(hrmsRouter);
router.use(projectBoardRouter);
router.use(emailRouter);
router.use(emailSettingsRouter);
router.use(chatRouter);
router.use(incidentsRouter);
router.use(drawingsRouter);

export default router;
