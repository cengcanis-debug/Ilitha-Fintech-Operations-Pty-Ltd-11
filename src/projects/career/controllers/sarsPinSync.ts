import { Request, Response } from 'express';
import { db } from '../config/firebase';
import axios from 'axios';

export async function syncSarsTaxPin(req: Request, res: Response) {
  const { organizationId, tenderId } = req.body;
  
  const zataxEndpoint = 'https://ais-pre-orxkaorfs4litqxldlcejb-66007226743.europe-west2.run.app/api/zatax/compliance';

  try {
    // 1. Query ZAtax for the active SARS Tax PIN status
    const zataxResponse = await axios.get(`${zataxEndpoint}/${organizationId}`);
    const taxStatus = zataxResponse.data;

    if (!taxStatus.isTaxCompliant) {
      return res.status(400).json({
        success: false,
        message: 'Tax Sync Halted: ZAtax indicates the company is currently tax non-compliant with SARS.',
      });
    }

    // 2. Map and lock the verified PIN to the SBD 1 metadata envelope in the Firestore Sandbox
    const sbdOneRef = db.collection('sbd_submissions').doc(`${tenderId}_${organizationId}`);
    await sbdOneRef.set({
      sarsPinSynced: true,
      sarsTaxPin: taxStatus.registeredPin,
      sarsLastVerification: new Date().toISOString(),
    }, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'SARS Tax Clearance PIN successfully synchronized and locked to SBD 1.',
      syncedPin: taxStatus.registeredPin,
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to sync SARS Tax PIN to SBD 1.',
      error: error.message,
    });
  }
}
