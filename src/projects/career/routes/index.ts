// File: src/projects/career/routes/index.ts

import { Router } from 'express';
// Navigates up 3 levels to access the global controllers directory
import { SentinelSovereignGuardEngine } from '../../../controllers/SentinelSovereignGuardEngine'; 
import { SentinelHubOrchestrator } from '../../../controllers/SentinelHubOrchestrator';
import { runStatutoryVerification } from '../controllers/verificationController';
import { runStatutoryAuditScan } from '../controllers/statutoryAuditController'; // NEW
import { PayoutEscrowRouter } from '../controllers/payoutRouter';
import { exportSarsTaxAuditLog } from '../controllers/taxAuditLogger';
import { signSbdEightDeclaration } from '../controllers/sbdEightSignel'; // Matches your committed file name spelling
import { syncSarsTaxPin } from '../controllers/sarsPinSync';
import { SarsRule7DisputePackager } from '../controllers/SarsRule7DisputePackager';
import { SarsProductionGatewaySwitchover } from '../controllers/SarsProductionGatewaySwitchover';
import { SentinelMailGateway } from '../controllers/SentinelMailGateway';

const router = Router();
const payoutRouter = new PayoutEscrowRouter();
const hubOrchestrator = new SentinelHubOrchestrator();
const mailGateway = new SentinelMailGateway();

// 1. Statutory Identity & Education Verification Routes (Upgrades DHA & SAQA to 100%)
router.post('/verify/statutory', runStatutoryVerification);
router.post('/verify/bulk-audit', runStatutoryAuditScan); // NEW

// 2. Financial Escrow & Automated Payout Routes
router.post('/payout/execute', (req, res) => payoutRouter.executeMonthlySettlement(req, res));

// 3. SARS Tax Audit Log Export Route
router.get('/tax/export', exportSarsTaxAuditLog);

// 4. SBD SCM Compliance Routes (Clears high-risk flags)
router.post('/tender/sign-sbd8', signSbdEightDeclaration);
router.post('/tender/sync-tax', syncSarsTaxPin);

// 5. Zero-Knowledge Trust validation endpoint
router.post('/security/sovereign-verify', (req, res) => {
  try {
    const { proof, publicSigningKey } = req.body;
    const isVerified = SentinelSovereignGuardEngine.verifySovereignProof(proof, publicSigningKey);
    res.status(200).json({ success: isVerified });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 6. Direct API Gateway Route for the Sentinel Brain Standalone Product
router.post('/sentinel-hub/query', (req, res) => hubOrchestrator.handleInboundQuery(req, res));

// 7. Transactional Email Routes
router.post('/mail/send-application', (req, res) => mailGateway.sendTrackedApplication(req, res));
router.post('/mail/webhook-delivery', (req, res) => mailGateway.handleDeliveryWebhook(req, res));

export default router;
