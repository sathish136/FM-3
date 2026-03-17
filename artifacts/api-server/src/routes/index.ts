import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pmRouter from "./pm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pmRouter);

export default router;
