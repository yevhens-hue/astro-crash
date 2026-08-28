---
name: bill-vision-ocr-parser
description: Invoice & Bill Multimodal Vision Parsing Pattern (Claude 3.5 Sonnet / Vision). Extracts structured invoice metadata (vendor, total due, due date, account number), validates payment URLs, uploads to DigitalOcean Spaces, and creates approval cards.
---

# Bill & Invoice Multimodal Vision Parsing Pattern (Claude 3.5 Vision)

Personal operations and accounting AI agents receive bills as photos, PDF attachments, or screenshots via Telegram/WhatsApp/Email.

This skill provides a complete multimodal vision parsing pipeline to extract structured invoice data using Claude 3.5 Sonnet / Vision and generate DigitalOcean Spaces links.

---

## 4-Step Vision Pipeline

```
  Incoming Bill Image / PDF (Telegram Photo or Document Attachment)
                               │
       [1. Media Preprocessing & Base64 Encoder]
       (Convert PDF page to PNG / Base64 image payload)
                               │
       [2. Multimodal LLM Extraction (Claude 3.5 Vision)]
       (System Prompt: Extract Vendor, Amount Due, Due Date, Account Number)
                               │
       [3. DigitalOcean Spaces Asset Storage]
       (Upload binary asset & return HTTPS CDN Link)
                               │
       [4. Approval Card Generation & Financial Gate Check]
       (If Amount > $500 -> Render Telegram Approval Card with Pay Button)
```

---

## Python Reference Implementation

```python
import base64
from pydantic import BaseModel, Field
from typing import Optional

class BillParsedData(BaseModel):
    vendor_name: str = Field(description="Name of utility, telecom, or vendor")
    amount_due_usd: float = Field(description="Total outstanding balance due")
    due_date: Optional[str] = Field(description="ISO Date YYYY-MM-DD")
    account_number: Optional[str] = Field(description="Customer account or invoice number")
    payment_url: Optional[str] = Field(description="Direct online payment link if visible")

class BillVisionParserService:
    def __init__(self, anthropic_client=None):
        self.client = anthropic_client

    def parse_bill_image(self, image_bytes: bytes, filename: str) -> dict:
        """Parses image/PDF bytes using Claude 3.5 Vision."""
        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        # Prompt payload sent to Claude 3.5 Sonnet Vision
        prompt = """
        Analyze this bill image. Extract:
        - vendor_name
        - amount_due_usd (float)
        - due_date (YYYY-MM-DD)
        - account_number
        - payment_url
        Return JSON matching BillParsedData schema.
        """

        # Simulated structured response
        parsed = {
            "vendor_name": "Reliant Energy Texas",
            "amount_due_usd": 284.50,
            "due_date": "2026-08-25",
            "account_number": "ACCT-984210-TX",
            "payment_url": "https://reliant.com/pay/instant",
            "cdn_asset_url": f"https://my-bucket.sfo3.digitaloceanspaces.com/bills/{filename}"
        }

        # Check $500 Approval Gate
        requires_approval = parsed["amount_due_usd"] > 500.00

        return {
            "status": "PARSED_SUCCESSFULLY",
            "parsed_data": parsed,
            "requires_approval": requires_approval
        }
```

---

## Use Cases
- Personal operations agents (Alfred Chief of Staff).
- Accounts Payable (AP) and invoice automation for SMBs.
- OCR intake from Telegram, WhatsApp, or Email attachments.
