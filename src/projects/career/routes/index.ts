// Located inside: src/projects/career/routes/index.ts
import { SentinelMailGateway } from '../controllers/SentinelMailGateway';

const mailGateway = new SentinelMailGateway();

// Route to trigger the tracked email dispatch
router.post('/mail/send-application', (req, res) => mailGateway.sendTrackedApplication(req, res));

// Webhook listener for automatic delivery verification (read-receipt logs)
router.post('/mail/webhook-delivery', (req, res) => mailGateway.handleDeliveryWebhook(req, res));
