// File: src/projects/career/routes/index.ts

import { Router } from 'express';
import { runStatutoryVerification } from '../controllers/verificationController';
import { PayoutEscrowRouter } from '../controllers/payoutRouter';
import { exportSarsTaxAuditLog } from '../controllers/taxAuditLogger';
import { signSbdEightDeclaration } from '../controllers/sbdEightSignel'; // Matches your committed file name spelling
import { syncSarsTaxPin } from '../controllers/sarsPinSync';

const router = Router();
const payoutRouter = new PayoutEscrowRouter();

// 1. Statutory Identity & Education Verification Routes (Upgrades DHA & SAQA to 100%)
router.post('/verify/statutory', runStatutoryVerification);

// 2. Financial Escrow & Automated Payout Routes
router.post('/payout/execute', (req, res) => payoutRouter.executeMonthlySettlement(req, res));

// 3. SARS Tax Audit Log Export Route
router.get('/tax/export', exportSarsTaxAuditLog);

// 4. SBD SCM Compliance Routes (Clears high-risk flags)
router.post('/tender/sign-sbd8', signSbdEightDeclaration);
router.post('/tender/sync-tax', syncSarsTaxPin);

export default router;
