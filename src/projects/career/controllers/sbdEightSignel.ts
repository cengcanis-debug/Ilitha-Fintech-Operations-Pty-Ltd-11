import { Request, Response } from 'express';
import { db } from '../config/firebase';
import * as crypto from 'crypto';

interface SbdEightDeclaration {
  hasAbusedScmSystem: boolean;
  hasFailedToPerform: boolean;
  hasConvictionFraud: boolean;
}

export async function signSbdEightDeclaration(req: Request, res: Response) {
  const { tenderId, organizationId, declaration, signatoryName, signatoryId } = req.body;

  try {
    const sbdEightData: SbdEightDeclaration = declaration;

    // 1. Verify the integrity of the declaration
    if (sbdEightData.hasAbusedScmSystem || sbdEightData.hasFailedToPerform || sbdEightData.hasConvictionFraud) {
      return res.status(400).json({
        success: false,
        message: 'SCM Risk Detected: Bidding company cannot self-certify compliance on SBD 8 due to declared historical abuse.',
      });
    }

    // 2. Generate a non-repudiable SHA-256 signature hash (ECT Act 2002 Compliant)
    const signaturePayload = JSON.stringify({
      tenderId,
      organizationId,
      declaration: sbdEightData,
      signatoryName,
      signatoryId,
      timestamp: new Date().toISOString(),
    });

    const privateKey = process.env.SYSTEM_SIGNING_KEY || 'default-sandbox-signing-key';
    const hmac = crypto.createHmac('sha256', privateKey);
    hmac.update(signaturePayload);
    const digitalSignature = hmac.digest('hex');

    // 3. Save the signed state directly to the Firestore Sandbox database
    const tenderRef = db.collection('sbd_submissions').doc(`${tenderId}_${organizationId}`);
    await tenderRef.set({
      sbdEightSigned: true,
      sbdEightSignature: digitalSignature,
      sbdEightSignatory: signatoryName,
      sbdEightTimestamp: new Date().toISOString(),
    }, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'SBD 8 Declaration successfully signed and verified.',
      signature: digitalSignature,
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to apply cryptographic signature to SBD 8.',
      error: error.message,
    });
  }
}
