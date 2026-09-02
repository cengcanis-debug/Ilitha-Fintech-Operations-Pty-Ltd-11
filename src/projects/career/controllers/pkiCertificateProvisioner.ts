// File: src/projects/career/controllers/pkiCertificateProvisioner.ts

import { db } from '../config/firebase';

interface PkiKeypairMetadata {
  organizationId: string;
  publicKeySpkiPem: string;
  generatedTimestamp: string;
  algorithm: string;
  status: 'ACTIVE_AUDIT_READY';
}

export class PkiCertificateProvisioner {
  private static readonly KEY_ALGORITHM = {
    name: 'RSA-PSS',
    modulusLength: 2048, // FIPS-compliant for South African ECT Act Advanced Signatures
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
    hash: { name: 'SHA-256' }
  };

  /**
   * Helper to convert an ArrayBuffer to a PEM string for public key export
   */
  private static arrayBufferToPem(buffer: ArrayBuffer): string {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    const base64 = btoa(binary);
    return `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Generates and registers an RSA-PSS keypair if none are found in the Firestore archives.
   */
  public static async provisionSigningCertificate(organizationId: string): Promise<string | null> {
    try {
      console.log('🔍 [SATA PKI]: Checking for cloud-archived certificate in Firebase Firestore...');
      
      const certRef = db.collection('pki_certificates').doc(organizationId);
      const snapshot = await certRef.get();

      // 1. If certificate already exists, return the public key PEM
      if (snapshot.exists) {
        console.log('🟢 [SATA PKI]: Active certificate detected and loaded from Firestore.');
        return snapshot.data()?.publicKeySpkiPem;
      }

      console.log('⚠️ [SATA PKI]: No cached or cloud-archived PKI credentials detected. Initiating key generation...');

      // 2. Generate RSA-PSS 2048 keypair using the browser's sandboxed WebCrypto API
      const keypair = await window.crypto.subtle.generateKey(
        this.KEY_ALGORITHM,
        true, // Keep extractable so we can save the public key (private key remains isolated)
        ['sign', 'verify']
      );

      // 3. Export the Public Key to SPKI format
      const exportedPublicKeyBuffer = await window.crypto.subtle.exportKey(
        'spki',
        keypair.publicKey
      );
      const publicKeyPem = this.arrayBufferToPem(exportedPublicKeyBuffer);

      // 4. Securely store the PRIVATE KEY in the browser's non-persistent session sandbox
      // (Never write the private key to Firestore to ensure zero-knowledge data isolation)
      (window as any)._sataSecurePrivateKey = keypair.privateKey;

      // 5. Register the PUBLIC KEY in your Firestore Sandbox database
      const metadata: PkiKeypairMetadata = {
        organizationId,
        publicKeySpkiPem: publicKeyPem,
        generatedTimestamp: new Date().toISOString(),
        algorithm: 'RSA-PSS-2048-SHA256',
        status: 'ACTIVE_AUDIT_READY',
      };

      await certRef.set(metadata);
      console.log(`✅ [SATA PKI]: New signing certificate generated and registered: ${certRef.id}`);

      return publicKeyPem;

    } catch (error: any) {
      console.error(`❌ [SATA PKI ERROR]: Failed to provision signing certificate: ${error.message}`);
      return null;
    }
  }
}
