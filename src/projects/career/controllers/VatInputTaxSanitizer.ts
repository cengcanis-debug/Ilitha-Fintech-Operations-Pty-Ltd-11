// File: src/projects/career/controllers/VatInputTaxSanitizer.ts

interface InvoiceOcrResult {
  invoiceId: string;
  vendorName: string;
  category: 'EQUIPMENT' | 'OFFICE_RENT' | 'PASSENGER_VEHICLE' | 'ENTERTAINMENT' | 'LOGISTICS';
  grossAmount: number;
  vatAmount: number;
}

interface SanitizedVatReturn {
  totalInputTaxClaimed: number;
  prohibitedDeductionsExcluded: number;
  cleanInvoiceList: string[];
}

export class VatInputTaxSanitizer {
  // Prohibited input tax categories under Section 20 of the South African VAT Act
  private static readonly PROHIBITED_CATEGORIES = ['PASSENGER_VEHICLE', 'ENTERTAINMENT'];

  /**
   * Scans and sanitizes analyzed invoices, preventing PROHIBITED_INPUT_DEDUCTION_CLAIMED errors.
   */
  public static sanitizeVat201Return(invoices: InvoiceOcrResult[]): SanitizedVatReturn {
    console.log('📊 [ZATAX VAT201]: Sanitizing input tax claims for VAT 201 submission...');

    let totalInputTaxClaimed = 0;
    let prohibitedDeductionsExcluded = 0;
    const cleanInvoiceList: string[] = [];

    for (const invoice of invoices) {
      if (this.PROHIBITED_CATEGORIES.includes(invoice.category)) {
        console.warn(`⚠️ [ZATAX VAT201]: Prohibited input tax claim filtered and blocked: ${invoice.vendorName} (${invoice.category})`);
        prohibitedDeductionsExcluded += invoice.vatAmount;
        continue; // Block and skip the invoice from the VAT 201 return
      }

      // Add legal input tax claims
      totalInputTaxClaimed += invoice.vatAmount;
      cleanInvoiceList.push(invoice.invoiceId);
    }

    console.log(`✅ [ZATAX VAT201]: Sanitization complete. Claimed: R${totalInputTaxClaimed.toFixed(2)} | Excluded: R${prohibitedDeductionsExcluded.toFixed(2)}`);

    return {
      totalInputTaxClaimed,
      prohibitedDeductionsExcluded,
      cleanInvoiceList,
    };
  }
}
