/**
 * Send Email Edge Function
 *
 * Admin-only endpoint to send emails via Resend
 *
 * Endpoints:
 *   POST / - Send email(s)
 *
 * Security: Requires admin authentication
 * Rate limiting: Sends emails sequentially to respect Resend's 2 req/sec limit
 */

import { handleCors } from "../_shared/cors.ts";
import { createAuthClient, createAdminClient } from "../_shared/supabase.ts";
import { requireUser, requireAdmin } from "../_shared/auth.ts";
import { json, badRequest, serverError } from "../_shared/http.ts";
import {
  validateRequired,
  validateEmailList,
  validateString,
  sanitizeText,
} from "../_shared/validate.ts";
import { RESEND_API_KEY, getFromEmail } from "../_shared/env.ts";

interface EmailRequest {
  to: string | string[];
  subject: string;
  message: string;
  [key: string]: unknown; // Allow index signature for validation
}

Deno.serve(async (req) => {
  // Handle CORS
  const { earlyResponse, headers: corsHeaders } = handleCors(req);
  if (earlyResponse) return earlyResponse;

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return badRequest("Method not allowed", corsHeaders);
    }

    // Authenticate user with anon key client (respects RLS)
    const authClient = createAuthClient();
    const userResult = await requireUser(req, authClient, corsHeaders);
    if (userResult instanceof Response) {
      return userResult;
    }

    // Verify admin status using admin client
    const adminClient = createAdminClient();
    const adminResult = await requireAdmin(userResult.userId, adminClient);
    if (adminResult instanceof Response) {
      return adminResult;
    }

    // Parse and validate request
    const body = (await req.json()) as EmailRequest;

    // Validate required fields
    const requiredCheck = validateRequired(body, ["to", "subject", "message"]);
    if (!requiredCheck.valid) {
      return badRequest(requiredCheck.error!, corsHeaders);
    }

    // Validate subject
    const subjectCheck = validateString(body.subject, 1, 200);
    if (!subjectCheck.valid) {
      return badRequest(`Invalid subject: ${subjectCheck.error}`, corsHeaders);
    }

    // Validate message
    const messageCheck = validateString(body.message, 1, 10000);
    if (!messageCheck.valid) {
      return badRequest(`Invalid message: ${messageCheck.error}`, corsHeaders);
    }

    // Sanitize message (remove HTML, prevent injection)
    const sanitizedMessage = sanitizeText(body.message, 10000);

    // Validate email addresses
    const recipients = Array.isArray(body.to) ? body.to.join(",") : body.to;
    const emailCheck = validateEmailList(recipients);
    if (!emailCheck.valid) {
      return badRequest(emailCheck.error!, corsHeaders);
    }

    const emailList = emailCheck.emails!;

    console.log("📧 Sending email:", {
      to: emailList.length,
      subject: body.subject,
    });

    // Send emails sequentially with delay to respect rate limits
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const email of emailList) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: getFromEmail(),
            to: email,
            subject: body.subject,
            text: sanitizedMessage,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">${body.subject}</h2>
                <div style="margin: 20px 0; line-height: 1.6; white-space: pre-wrap;">
                  ${sanitizedMessage}
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                  This email was sent from Visually Speaking - Video Chat for the Deaf & Hard of Hearing Community
                </p>
              </div>
            `,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Resend API error:", errorData);
          errors.push(`${email}: ${errorData.message || response.statusText}`);
          failed++;
        } else {
          const data = await response.json();
          console.log(`✅ Email sent to ${email}:`, data.id);
          successful++;
        }

        // Rate limit: Wait 600ms between emails (allows ~1.6 emails/sec, under 2/sec limit)
        if (email !== emailList[emailList.length - 1]) {
          // Don't wait after last email
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      } catch (error) {
        console.error(`❌ Error sending to ${email}:`, error);
        errors.push(
          `${email}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        failed++;
      }
    }

    if (failed > 0) {
      console.warn(`⚠️ ${failed} email(s) failed`);
      return json(
        {
          emailsSent: successful,
          failed,
          errors,
        },
        207, // Multi-Status
        corsHeaders,
      );
    }

    console.log(`✅ Successfully sent ${successful} email(s)`);
    return json(
      {
        emailsSent: successful,
        message: `Successfully sent ${successful} email(s)`,
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return serverError(error, corsHeaders);
  }
});
