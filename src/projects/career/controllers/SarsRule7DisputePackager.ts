// File: src/projects/career/controllers/SarsRule7DisputePackager.ts

import { db } from '../config/firebase';

interface DisputeEvidence {
  logbookPdfName: string;         // e.g., Logbook_2026.pdf
  purchaseAgreementPdfName: string; // e.g., Purchase_Agreement.pdf
  evidenceVaultHash: string;      // Cryptographic SHA-256 proof of vault integrity
}

interface Rule7ObjectionPayload {
  taxpayerRef: string;
  assessmentNumber: string;        // e.g., ITA34-2026-98214
  disallowedSourceCode: number;    // e.g., 4015
  disallowedAmount: number;        // e.g., 68475.00
  evidence: DisputeEvidence;
}

export class SarsRule7DisputePackager {
  private static readonly DISPUTE_GATEWAY_URL = 'https://api.sars.gov.za/v3/disputes/adr1/notice-of-objection';

  /**
   * Automatically packages and seals a TAA Rule 7 compliant ADR1 Notice of Objection.
   */
  public static async packageRule7Objection(
    organizationId: string,
    payload: Rule7ObjectionPayload
  ): Promise<any> {
    console.log(`⚖️ [ZATAX RULE7]: Packaging Dispute ADR1 for Assessment: ${payload.assessmentNumber}...`);

    try {
      // 1. Verify that the necessary corroborating evidence exists in the secure vault
      const logbookRef = db.collection('audit_vaults').doc(`${organizationId}_logbook`);
      const logbookSnapshot = await logbookRef.get();

      if (!logbookSnapshot.exists || logbookSnapshot.data()?.status !== 'SEALED') {
        throw new Error(`TAA_COMPLIANCE_ERROR: Mandatory Logbook evidence (Source Code ${payload.disallowedSourceCode}) is unverified or missing.`);
      }

      const timestamp = new Date().toISOString();

      // 2. Build the TAA Rule 7 compliant ADR1 JSON payload
      const adr1Payload = {
        taxpayerReference: payload.taxpayerRef,
        assessmentId: payload.assessmentNumber,
        objectionDate: timestamp,
        groundsForObjection: `Objection submitted in terms of Section 11(a) of the Income Tax Act 58 of 1962 and TAA Rule 7. The taxpayer maintains a fully compliant logbook confirming that the claimed amount of R${payload.disallowedAmount.toFixed(2)} under Source Code ${payload.disallowedSourceCode} represents legitimate, business-related travel expenses.`,
        disallowedCode: payload.disallowedSourceCode,
        adjustedValueClaimed: payload.disallowedAmount,
        evidenceManifest: {
          logbookFile: payload.evidence.logbookPdfName,
          purchaseAgreement: payload.evidence.purchaseAgreementPdfName,
          cryptographicSeal: payload.evidence.evidenceVaultHash,
        },
        status: 'TAA_COMPLIANT_ADR1_READY'
      };

      // 3. Save the prepared dispute package to the Firestore Sandbox database
      const disputeRef = db.collection('sars_objections').doc(payload.assessmentNumber);
      await disputeRef.set({
        ...adr1Payload,
        organizationId,
        lastUpdated: timestamp,
      }, { merge: true });

      console.log(`✅ [ZATAX RULE7]: ADR1 Dispute Package successfully sealed and stored: ${disputeRef.id}`);

      return {
        success: true,
        objectionRef: disputeRef.id,
        payload: adr1Payload,
      };

    } catch (error: any) {
      console.error(`❌ [ZATAX RULE7 ERROR]: Dispute packaging failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
