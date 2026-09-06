// File: src/utils/SentinelHubClient.ts

import axios from 'axios';

interface SentinelClientConfig {
  apiKey: string;             // Client's secure Sentinel API Key
  organizationId: string;     // Client's CIPC registered ID
  hubEndpoint?: string;       // Defaults to your live production gateway
}

export class SentinelHubClient {
  private readonly apiKey: string;
  private readonly organizationId: string;
  private readonly hubEndpoint: string;

  constructor(config: SentinelClientConfig) {
    this.apiKey = config.apiKey;
    this.organizationId = config.organizationId;
    this.hubEndpoint = config.hubEndpoint || 'https://sentinel.ilithafintech.co.za/api/sentinel-hub';
  }

  /**
   * Queries the standalone Sentinel Hub to execute secure, low-latency validations.
   */
  public async querySentinelBrain(
    queryType: 'SOVEREIGN_VERIFY' | 'TAX_12BA_VALIDATE' | 'SBD_COMPLIANCE',
    payload: any
  ): Promise<any> {
    try {
      const response = await axios.post(
        this.hubEndpoint,
        {
          apiKey: this.apiKey,
          organizationId: this.organizationId,
          queryType,
          payload,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 8000, // Safe threshold before gateway timeout
        }
      );

      return response.data;

    } catch (error: any) {
      console.error(`[SENTINEL CLIENT SDK ERROR]: Failed to communicate with Sentinel Hub: ${error.message}`);
      throw new Error(`SENTINEL_CLIENT_FAILURE: ${error.message}`);
    }
  }
}
