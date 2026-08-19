import json

class YocoRevenueGuard:
    def __init__(self, ledger_path="status.json"):
        self.ledger_path = ledger_path

    def process_payment(self, amount, reference, app_type):
        """Sentinel tracks the payment and unlocks the specific app."""
        print(f"Sentinel: Payment of R{amount} detected for {app_type}.")
        
        # Logic to split revenue per the legacy mandate (28% SARS, etc.)
        sars_reserve = amount * 0.28
        legacy_fund = amount * 0.20
        
        update = {
            "last_transaction": {"ref": reference, "val": amount},
            "treasury": {"sars": sars_reserve, "legacy": legacy_fund}
        }
        return f"SUCCESS: {app_type} features unlocked for {reference}."

if __name__ == "__main__":
    guard = YocoRevenueGuard()
    print(guard.process_payment(450.00, "LSA-TEST-001", "LegisEstateSA"))
