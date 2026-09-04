// File: src/projects/career/controllers/SentinelMailGateway.ts

import { Request, Response } from 'express';
import { db } from '../config/firebase';
import axios from 'axios';

interface MailPayload {
  toEmail: string;
  recipientName: string;
  subject: string;
  emailBodyHtml: string;
  applicationType: 'FDC_GRANT' | 'SEFA_LOAN' | 'SITA_SANDBOX';
}

export class SentinelMailGateway {
  // We use Resend or SendGrid as our high-deliverability transactional mail provider
  private static readonly MAIL_PROVIDER_URL = 'https://api.resend.com/emails';
  private static readonly SENDER_ADDRESS = 'submissions@ilithasentinel.co.za';

  /**
   * Dispatches a highly tracked, transactional email and logs the entry in Firestore.
   */
  public async sendTrackedApplication(req: Request, res: Response) {
    const { toEmail, recipientName, subject, emailBodyHtml, applicationType } = req.body as MailPayload;

    try {
      console.log(`✉️ [SENTINEL MAIL]: Preparing to dispatch ${applicationType} to ${toEmail}...`);

      // 1. Dispatch the email via our secure SMTP/REST Mail API
      const mailResponse = await axios.post(
        SentinelMailGateway.MAIL_PROVIDER_URL,
        {
          from: SentinelMailGateway.SENDER_ADDRESS,
          to: toEmail,
          subject: subject,
          html: emailBodyHtml,
          tags: [
            { name: 'application_type', value: applicationType },
            { name: 'recipient_name', value: recipientName }
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );

      const messageId = mailResponse.data.id;
      const timestamp = new Date().toISOString();

      // 2. Create an audit log in your Firestore Sandbox
      const mailLogRef = db.collection('sent_applications_logs').doc(messageId);
      await mailLogRef.set({
        messageId,
        recipientEmail: toEmail,
        recipientName,
        subject,
        applicationType,
        dispatchTimestamp: timestamp,
        deliveryStatus: 'DISPATCHED_PENDING_RECEIPT', // Swapped to DELIVERED once webhook fires
        sentFromTerminal: 'Google Cloud Run (Sifiso Server)',
      });

      console.log(`✅ [SENTINEL MAIL]: Email successfully dispatched. MessageID: ${messageId}`);

      return res.status(200).json({
        success: true,
        message: 'Application successfully sent and logged for delivery tracking.',
        messageId,
        status: 'DISPATCHED_PENDING_RECEIPT',
      });

    } catch (error: any) {
      console.error(`❌ [SENTINEL MAIL ERROR]: Email dispatch failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Transactional mail gateway failed to dispatch.',
        error: error.message,
      });
    }
  }

  /**
   * Webhook endpoint called by the mail provider once the email is successfully delivered.
   * This is what makes us "twice sure" they received it.
   */
  public async handleDeliveryWebhook(req: Request, res: Response) {
    const { event, data } = req.body; // Payload format from Resend/SendGrid webhooks

    if (event === 'email.delivered') {
      const messageId = data.email_id;
      console.log(`🟢 [SENTINEL MAIL WEBHOOK]: Delivery confirmation received for Email: ${messageId}`);

      try {
        // Update the status in Firestore to DELIVERED
        const logRef = db.collection('sent_applications_logs').doc(messageId);
        await logRef.update({
          deliveryStatus: 'DELIVERED_AND_VERIFIED',
          deliveredTimestamp: new Date().toISOString(),
        });

        return res.status(200).send('Webhook processed and delivery verified.');
      } catch (dbError: any) {
        return res.status(500).send(`Failed to update delivery log: ${dbError.message}`);
      }
    }

    return res.status(200).send('Event ignored.');
  }
}
