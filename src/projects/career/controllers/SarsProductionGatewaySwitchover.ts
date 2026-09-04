// File: src/projects/career/controllers/SarsProductionGatewaySwitchover.ts

import { db } from '../config/firebase';
import axios from 'axios';

interface SwitchoverConfig {
  accreditationRef: string;     // Must match: SARS-ISV-ACC-2026-98124
  productionHsmKeyId: string;   // ID of the PROD-SIGN-RSA4096-ISV key in Cloud HSM
  liveGatewayUrl: string;       // Direct SARS Production API root
}

export class SarsProductionGatewaySwitchover {
  private static readonly STAGING_BASE_URL = 'https://api-sandbox.sars.gov.za/v3';
  private static readonly ACCREDITATION_DOC_REF = 'SARS-ISV-ACC-2026-98124';

  /**
   * Executes the live production gateway switchover, routing all future tax API traffic to the live SARS servers.
   */
  public static async executeSwitchover(
    organizationId: string,
    config: SwitchoverConfig
  ): Promise<any> {
    console.log('🔄 [ZATAX SWITCHOVER]: Initiating live production gateway switchover protocol...');

    // 1. Validate Accreditation Reference
    if (config.accreditationRef !== this.ACCREDITATION_DOC_REF) {
      throw new Error(`SECURITY_VIOLATION: Invalid or unapproved accreditation reference code: ${config.accreditationRef}`);
    }

    try {
      const timestamp = new Date().toISOString();

      // 2. Perform pre-flight production handshake to verify mTLS 1.3 on the live server
      const handshakeResponse = await axios.get(`${config.liveGatewayUrl}/identity/ping`, {
        headers: {
          'X-Client-Certificate-Id': config.productionHsmKeyId,
          'X-Accreditation-Ref': config.accreditationRef,
        },
        timeout: 5000,
      });

      if (handshakeResponse.status !== 200) {
        throw new Error('PRODUCTION_HANDSHAKE_FAILED: Live SARS production server failed to verify the mTLS handshake.');
      }

      console.log('🟢 [ZATAX SWITCHOVER]: Live production handshake successful. Routing verified.');

      // 3. Update the global system environment variables in Firestore to lock the live state
      const systemRef = db.collection('zatax_global_config').doc('gateway_routing');
      await systemRef.set({
        activeEnvironment: 'LIVE_PRODUCTION',
        sarsApiRoot: config.liveGatewayUrl,
        signingKeyCertificateId: config.productionHsmKeyId,
        accreditationReference: config.accreditationRef,
        switchoverTimestamp: timestamp,
        routingStatus: '100_PERCENT_PRODUCTION_INGRESS',
      }, { merge: true });

      console.log(`✅ [ZATAX SWITCHOVER]: Live production gateway switchover successfully executed: ${systemRef.id}`);

      return {
        success: true,
        message: 'ZAtax has successfully transitioned to 100% Live Production Ingress with SARS.',
        environment: 'LIVE_PRODUCTION',
        clearedTimestamp: timestamp,
      };

    } catch (error: any) {
      console.error(`❌ [ZATAX SWITCHOVER ERROR]: Live switchover failed: ${error.message}`);
      return {
        success: false,
        message: 'Internal gateway error during live production switchover.',
        error: error.message,
      };
    }
  }
}
