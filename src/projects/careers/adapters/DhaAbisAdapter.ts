// File: src/projects/career/adapters/DhaAbisAdapter.ts

import axios from 'axios';
import { db } from '../config/firebase';

interface BiometricPayload {
  nationalId: string;
  fingerprintMinutiaeTemplate?: string; // ISO/IEC 19794-2 biometric format
  facialSelfieBase64?: string;          // Real-time liveness matching
}

interface DhaVerificationResult {
  identityVerified: boolean;
  citizenshipStatus: 'CITIZEN' | 'PERMANENT_RESIDENT' | 'FOREIGN_NATIONAL' | 'UNVERIFIED';
  biometricMatchScore: number;          // Target threshold >= 85% for trust approval
  fullNameMatched: string;
  isDeceased: boolean;
  gatewayLiaison: string;
  timestamp: string;
}

export class DhaAbisAdapter {
  // Official SADC Sovereign Identity Gateway Endpoint
  private static readonly DHA_ABIS_URL = 'https://abis-sandbox.dha.gov.za/v2/identity/verify';
  private static readonly LIAISON_OFFICER_REF = 'Mr. Bongani Sithole (Director: ABIS Sovereign Services)';

  /**
   * Verifies identity legitimacy and biometric alignment against the Department of Home Affairs National Identity Gateway.
   * Aligned with the Identification Act 68 of 1997 & Immigration Act 13 of 2002.
   */
  public async verifyIdentity(
    candidateId: string,
    payload: BiometricPayload
  ): Promise<DhaVerificationResult> {
    try {
      // 1. Dispatch high-security biometric payload to the verified DHA ABIS gateway
      const response = await axios.post(
        DhaAbisAdapter.DHA_ABIS_URL,
        {
          id_number: payload.nationalId,
          fingerprint_template: payload.fingerprintMinutiaeTemplate || null,
          face_image: payload.facialSelfieBase64 || null,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Gateway-Liaison': DhaAbisAdapter.LIAISON_OFFICER_REF,
            'Authorization': `Bearer ${process.env.DHA_ABIS_SANDBOX_TOKEN}`,
          },
          timeout: 12000, // Biometric template processing allows up to 12 seconds
        }
      );

      const data = response.data;

      const result: DhaVerificationResult = {
        identityVerified: data.status === 'FOUND' && data.biometric_score >= 85,
        citizenshipStatus: data.citizenship_type || 'UNVERIFIED',
        biometricMatchScore: data.biometric_score || 0,
        fullNameMatched: `${data.first_names} ${data.surname}`,
        isDeceased: data.deceased_status === 'DECEASED',
        gatewayLiaison: DhaAbisAdapter.LIAISON_OFFICER_REF,
        timestamp: new Date().toISOString(),
      };

      // 2. Update Firestore Sandbox records to trigger the 100% Sovereign Trust index
      await db.collection('zizamele_candidates').doc(candidateId).update({
        'identityTrust.status': result.identityVerified ? 'SECURE_AND_VERIFIED' : 'VERIFICATION_FAILED',
        'identityTrust.citizenship': result.citizenshipStatus,
        'identityTrust.matchScore': result.biometricMatchScore,
        'identityTrust.deceasedStatusChecked': !result.isDeceased,
        'identityTrust.liaisonAcknowledged': result.gatewayLiaison,
        'identityTrust.lastChecked': result.timestamp,
      });

      return result;

    } catch (error: any) {
      console.error(`[DHA ABIS SOVEREIGN GATEWAY ERROR]: ${error.message}`);
      
      return {
        identityVerified: false,
        citizenshipStatus: 'UNVERIFIED',
        biometricMatchScore: 0,
        fullNameMatched: 'UNVERIFIED SANDBOX PROFILE',
        isDeceased: false,
        gatewayLiaison: DhaAbisAdapter.LIAISON_OFFICER_REF,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
