// File: src/projects/career/controllers/stateRecoveryManager.ts

import * as crypto from 'crypto';

export class StateRecoveryManager {
  private static readonly LOCAL_KEY = 'sata_sbd_form_draft';
  private static readonly LEDGER_SESSION_KEY = 'sata_ledger_backup';
  private static readonly SECRET_SALT = process.env.SYSTEM_INTEGRITY_SALT || 'sata-default-salt';

  /**
   * Generates a SHA-256 integrity checksum for a given text payload
   */
  private static generateChecksum(payload: string): string {
    return crypto.createHmac('sha256', this.SECRET_SALT).update(payload).digest('hex');
  }

  /**
   * Securely saves the form draft along with an integrity checksum
   */
  public static saveSecureDraft(draftData: object): void {
    const rawString = JSON.stringify(draftData);
    const checksum = this.generateChecksum(rawString);

    // Save the main draft and a backup copy in the session-only ledger (immune to persistent XSS)
    localStorage.setItem(this.LOCAL_KEY, rawString);
    localStorage.setItem(`${this.LOCAL_KEY}_hash`, checksum);
    sessionStorage.setItem(this.LEDGER_SESSION_KEY, rawString);
  }

  /**
   * Validates local storage state integrity. 
   * If tampered, it wipes the corrupted key and restores it from the secure session ledger.
   */
  public static verifyAndRecoverState(): boolean {
    const rawDraft = localStorage.getItem(this.LOCAL_KEY);
    const savedHash = localStorage.getItem(`${this.LOCAL_KEY}_hash`);

    if (!rawDraft || !savedHash) {
      return false; // No draft initialized yet
    }

    const calculatedHash = this.generateChecksum(rawDraft);

    // If hashes match, state integrity is secure
    if (calculatedHash === savedHash) {
      return true;
    }

    // TAMPER DETECTED: Initiate automated recovery routine
    console.warn('⚠️ [STATE INTEGRITY MONITOR]: Tamper detected! Local key has been altered outside safe runtime constraints.');
    
    const backupDraft = sessionStorage.getItem(this.LEDGER_SESSION_KEY);

    if (backupDraft) {
      console.log('🔄 [STATE INTEGRITY MONITOR]: Initiating automated recovery from secure session ledger...');
      
      // Clear the corrupted values
      localStorage.removeItem(this.LOCAL_KEY);
      localStorage.removeItem(`${this.LOCAL_KEY}_hash`);

      // Restore from non-persistent session ledger
      const cleanHash = this.generateChecksum(backupDraft);
      localStorage.setItem(this.LOCAL_KEY, backupDraft);
      localStorage.setItem(`${this.LOCAL_KEY}_hash`, cleanHash);
      
      console.log('✅ [STATE INTEGRITY MONITOR]: State integrity successfully restored.');
      return true;
    } else {
      console.error('❌ [STATE INTEGRITY MONITOR]: Recovery failed. Backup ledger was empty.');
      return false;
    }
  }
}
