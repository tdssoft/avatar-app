import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import {
  getAdminEmail,
  getEmailFrom,
  getEmailReplyTo,
} from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("stripe-webhook: received request");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const adminEmail = getAdminEmail();
    const fromEmail = getEmailFrom();
    const replyTo = getEmailReplyTo();

    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe is not configured");
    }

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      throw new Error("Webhook secret is not configured");
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Resend is not configured");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.text();
    
    // Verify Stripe webhook signature
    const encoder = new TextEncoder();
    const parts = signature.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !signaturePart) {
      console.error("Invalid signature format");
      return new Response(JSON.stringify({ error: "Invalid signature format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const timestamp = timestampPart.split("=")[1];
    const expectedSignature = signaturePart.split("=")[1];

    // Create signed payload
    const signedPayload = `${timestamp}.${body}`;
    
    // Compute HMAC
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );
    
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedSignature !== expectedSignature) {
      console.error("Signature verification failed");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check timestamp tolerance (5 minutes)
    const eventTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - eventTime) > 300) {
      console.error("Webhook timestamp too old");
      return new Response(JSON.stringify({ error: "Webhook too old" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("stripe-webhook: signature verified");

    const event = JSON.parse(body);
    console.log("stripe-webhook: event type", event.type);

    // Handle invoice.paid event
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      console.log("stripe-webhook: processing invoice", invoice.id, "number:", invoice.number);

      // Fetch invoice PDF from Stripe
      console.log("stripe-webhook: fetching PDF for invoice", invoice.id);
      // Prefer the signed `invoice_pdf` URL if present (works well with restricted keys).
      // Fallback to Stripe API PDF endpoint.
      const pdfResponse = invoice.invoice_pdf
        ? await fetch(invoice.invoice_pdf)
        : await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/pdf`, {
            headers: {
              Authorization: `Bearer ${stripeKey}`,
            },
          });

      if (!pdfResponse.ok) {
        console.error("Failed to fetch invoice PDF:", pdfResponse.status, await pdfResponse.text());
        throw new Error("Failed to fetch invoice PDF");
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();
      const pdfUint8Array = new Uint8Array(pdfBuffer);
      
      // Convert to base64
      let binary = "";
      for (let i = 0; i < pdfUint8Array.length; i++) {
        binary += String.fromCharCode(pdfUint8Array[i]);
      }
      const pdfBase64 = btoa(binary);

      console.log("stripe-webhook: PDF fetched, size:", pdfBuffer.byteLength, "bytes");

      // Format amount
      const amount = ((invoice.amount_paid || 0) / 100).toFixed(2);
      const currency = (invoice.currency || "pln").toUpperCase();

      // Format date
      const invoiceDate = invoice.created
        ? new Date(invoice.created * 1000).toLocaleDateString("pl-PL", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Brak daty";

      // Build line items list
      let lineItemsHtml = "";
      if (invoice.lines?.data) {
        lineItemsHtml = invoice.lines.data
          .map((line: any) => `<li>${line.description || line.price?.product || "Produkt"}</li>`)
          .join("");
      }

      // Send email with PDF attachment
      const resend = new Resend(resendApiKey);
      
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: [adminEmail],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: `📄 Faktura ${invoice.number || invoice.id} - Nowa płatność AVATAR`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">💰 Nowa płatność</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Numer faktury:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${invoice.number || invoice.id}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Kwota:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 18px; color: #10b981; font-weight: bold;">
                    ${amount} ${currency}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Email klienta:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${invoice.customer_email || "Brak"}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong>Data:</strong>
                  </td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                    ${invoiceDate}
                  </td>
                </tr>
              </table>
              
              ${lineItemsHtml ? `
                <div style="margin-top: 20px;">
                  <strong>Zakupione pakiety:</strong>
                  <ul style="margin-top: 10px; padding-left: 20px; color: #374151;">
                    ${lineItemsHtml}
                  </ul>
                </div>
              ` : ""}
              
              <div style="margin-top: 30px; padding: 15px; background: #ecfdf5; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #059669;">
                  📎 Kopia faktury PDF znajduje się w załączniku
                </p>
              </div>
            </div>
            
            <div style="background: #1f2937; color: #9ca3af; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">AVATAR - System Zarządzania Zdrowiem</p>
              <p style="margin: 5px 0 0 0;">ID sesji: ${invoice.id}</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `faktura-${invoice.number || invoice.id}.pdf`,
            content: pdfBase64,
          },
        ],
      });

      console.log("stripe-webhook: email sent to admin", emailResponse);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("stripe-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
