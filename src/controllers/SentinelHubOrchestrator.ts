// File: src/controllers/SentinelHubOrchestrator.ts

import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { SentinelSovereignGuardEngine } from './SentinelSovereignGuardEngine';
import { SarsSchedule12BaValidator } from './SarsSchedule12BaValidator';

interface InboundHubQuery {
  apiKey: string;
  organizationId: string;
  queryType: 'SOVEREIGN_VERIFY' | 'TAX_12BA_VALIDATE' | 'SBD_COMPLIANCE';
  payload: any;
}

export class SentinelHubOrchestrator {
  /**
   * Evaluates, authenticates, and routes incoming API requests from external clients or portfolio apps.
   */
  public async handleInboundQuery(req: Request, res: Response) {
    const { apiKey, organizationId, queryType, payload } = req.body as InboundHubQuery;

    try {
      console.log(`📡 [SENTINEL HUB]: Received inbound query of type: ${queryType} from Org: ${organizationId}`);

      // 1. Authenticate the external client's API Key against the Firestore security registry
      const clientRef = db.collection('sentinel_api_keys').doc(apiKey);
      const clientSnapshot = await clientRef.get();

      if (!clientSnapshot.exists || clientSnapshot.data()?.status !== 'ACTIVE') {
        return res.status(401).json({
          success: false,
          message: 'Authentication failed: Invalid or inactive Sentinel API key.',
        });
      }

      const clientData = clientSnapshot.data();
      const timestamp = new Date().toISOString();

      // 2. Route the query to the correct specialized Sentinel Engine
      let resultData: any = null;

      switch (queryType) {
        case 'SOVEREIGN_VERIFY':
          // Run Zero-Knowledge Proof verification
          const isVerified = SentinelSovereignGuardEngine.verifySovereignProof(
            payload.proof,
            payload.publicSigningKey
          );
          resultData = { verified: isVerified };
          break;

        case 'TAX_12BA_VALIDATE':
          // Run pre-flight Section 12BA CoC checksum calculation
          resultData = SarsSchedule12BaValidator.processSchedule12Ba(payload);
          break;

        default:
          return res.status(400).json({
            success: false,
            message: `Unsupported query type: ${queryType}`,
          });
      }

      // 3. Log the transaction usage in the client's billable ledger (for monetization)
      const usageRef = db.collection('sentinel_billing_ledgers').doc();
      await usageRef.set({
        clientId: clientData?.clientId,
        organizationId,
        queryType,
        timestamp,
        costZar: 0.50, // Standard R0.50 per transaction billing rate
      });

      return res.status(200).json({
        success: true,
        transactionId: usageRef.id,
        timestamp,
        data: resultData,
      });

    } catch (error: any) {
      console.error(`❌ [SENTINEL HUB ERROR]: Processing failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Internal Sentinel Hub execution failure.',
        error: error.message,
      });
    }
  }
}
