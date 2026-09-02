// File: src/projects/career/controllers/timeMachineScheduler.ts

import { db } from '../config/firebase';

export class TimeMachineScheduler {
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly SNAPSHOT_INTERVAL_MS = 60000; // 1-minute (1m) interval

  /**
   * Activates the background Time Machine Scheduler to take automated snapshots
   */
  public static startAutomation(organizationId: string, tenderId: string): void {
    if (this.intervalId) {
      console.log('⏰ [TIME MACHINE]: Scheduler is already active.');
      return;
    }

    console.log('⏰ [TIME MACHINE]: Activating automated 1-minute (1m) snapshot scheduler...');

    this.intervalId = setInterval(async () => {
      try {
        // 1. Fetch current active UI state from localStorage draft
        const activeDraft = localStorage.getItem('sata_sbd_form_draft');
        
        if (!activeDraft) {
          return; // Skip cycle if no active draft is being modified
        }

        const snapshotPayload = JSON.parse(activeDraft);
        const timestamp = new Date().toISOString();

        // 2. Commit the snapshot to the Cloud Firestore Ledger Registry
        const snapshotRef = db.collection('time_machine_ledgers').doc();
        await snapshotRef.set({
          organizationId,
          tenderId,
          snapshotData: snapshotPayload,
          snapshotTimestamp: timestamp,
          label: `Auto-Backup: ${timestamp.split('T')[1].slice(0, 5)}`,
        });

        console.log(`💾 [TIME MACHINE]: Snapshot successfully pushed to Firestore Ledger: ${snapshotRef.id}`);

      } catch (error: any) {
        console.error(`❌ [TIME MACHINE ERROR]: Snapshot execution failed: ${error.message}`);
      }
    }, this.SNAPSHOT_INTERVAL_MS);
  }

  /**
   * Pauses the automated periodic scheduler
   */
  public static stopAutomation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏸️ [TIME MACHINE]: Automated scheduler paused.');
    }
  }
}
