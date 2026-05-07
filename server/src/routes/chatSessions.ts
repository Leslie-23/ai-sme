import { Router } from 'express';
import { listChatSessions, upsertChatSession } from '../controllers/chatSessionController';

const router = Router();

router.get('/', listChatSessions);
router.put('/', upsertChatSession);

export default router;
