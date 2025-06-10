// timely/backend/src/routes/order.routes.ts
import { Router } from 'express';

const router = Router();

// Example route: GET /api/orders
router.get('/', (req, res) => {
    res.json({ message: 'Order history endpoint' });
});

// Example route: GET /api/orders/:id
router.get('/:id', (req, res) => {
    res.json({ message: `Details for order ${req.params.id}` });
});

export default router;