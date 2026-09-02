// File: src/projects/career/controllers/triggerSataAudit.ts

import { db } from '../config/firebase';
import { DhaAbisAdapter } from '../adapters/DhaAbisAdapter';
import { SaqaNlrdAdapter } from '../adapters/SaqaNlrdAdapter';

const dhaAdapter = new DhaAbisAdapter();
const saqaAdapter = new SaqaNlrdAdapter();

export async function runLiveSystemAuditScan(): Promise<void> {
  console.log('🔄 [SENTINEL AUDIT SCAN]: Initializing live statutory verification scan...');

  try {
    // 1. Fetch up to 10 candidates whose statutory verifications are pending
    const candidateSnapshot = await db.collection('zizamele_candidates')
      .where('identityTrust.status', '==', 'UNVERIFIED')
      .limit(10)
      .get();

    if (candidateSnapshot.empty) {
      console.log('🟢 [SENTINEL AUDIT SCAN]: All active candidates are fully verified. Dashboard is secure.');
      return;
    }

    console.log(`📊 [SENTINEL AUDIT SCAN]: Found ${candidateSnapshot.size} pending candidate files to process...`);

    // 2. Execute verification loop utilizing the newly deployed compliance adapters
    for (const doc of candidateSnapshot.docs) {
      const candidateId = doc.id;
      const data = doc.data();

      console.log(`👤 Processing Candidate: ${data.first_names} ${data.surname} (ID: ${data.national_id})`);

      // A. Trigger live DHA ABIS verification (Identity check)
      await dhaAdapter.verifyIdentity(candidateId, {
        nationalId: data.national_id,
      });

      // B. Trigger live SAQA NLRD verification (Education check)
      await saqaAdapter.verifyQualification(candidateId, {
        nationalId: data.national_id,
        institutionName: data.education_claim?.institution,
        qualificationTitle: data.education_claim?.qualification,
        nqfLevelProposed: Number(data.education_claim?.nqf_level) || 0,
      });
    }

    console.log('✅ [SENTINEL AUDIT SCAN]: Live diagnostic check complete. Metrics updated on dashboard.');

  } catch (error: any) {
    console.error(`❌ [SENTINEL AUDIT SCAN ERROR]: Live audit process interrupted: ${error.message}`);
  }
}
