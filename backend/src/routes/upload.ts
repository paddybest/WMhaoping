import { Router } from 'express';

const router = Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Upload API working' });
});

export default router;