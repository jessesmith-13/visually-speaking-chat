/**
 * Send Email Edge Function
 * 
 * Admin-only endpoint to send emails via Resend
 * 
 * Endpoints:
 *   POST / - Send email(s)
 * 
 * Security: Requires admin authentication
 * Rate limiting: TODO - implement rate limiting per admin user
 */

import { handleCors } from '../_shared/cors.ts';
import { createAuthClient, createAdminClient } from '../_shared/supabase.ts';
import { requireUser, requireAdmin } from '../_shared/auth.ts';
import { json, badRequest, serverError } from '../_shared/http.ts';
import { validateRequired, validateEmailList, validateString, sanitizeText } from '../_shared/validate.ts';
import { RESEND_API_KEY } from '../_shared/env.ts';

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
    if (req.method !== 'POST') {
      return badRequest('Method not allowed', corsHeaders);
    }

    // Authenticate user
    const authClient = createAuthClient();
    const userResult = await requireUser(req, authClient);
    if (userResult instanceof Response) {
      return new Response(userResult.body, {
        status: userResult.status,
        headers: { ...corsHeaders, ...Object.fromEntries(userResult.headers) },
      });
    }

    // Verify admin status
    const adminClient = createAdminClient();
    const adminResult = await requireAdmin(userResult.userId, adminClient);
    if (adminResult instanceof Response) {
      return new Response(adminResult.body, {
        status: adminResult.status,
        headers: { ...corsHeaders, ...Object.fromEntries(adminResult.headers) },
      });
    }

    // Parse and validate request
    const body = await req.json() as EmailRequest;

    // Validate required fields
    const requiredCheck = validateRequired(body, ['to', 'subject', 'message']);
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
    const recipients = Array.isArray(body.to) ? body.to.join(',') : body.to;
    const emailCheck = validateEmailList(recipients);
    if (!emailCheck.valid) {
      return badRequest(emailCheck.error!, corsHeaders);
    }

    const emailList = emailCheck.emails!;

    console.log('📧 Sending email:', { to: emailList.length, subject: body.subject });

    // TODO: Rate limiting - track sends per admin user per hour
    // Example: Check redis/database for send count in last hour, limit to 100

    // Send emails via Resend
    const emailPromises = emailList.map(async (email: string) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Visually Speaking <noreply@visuallyspeaking.app>',
          to: email,
          subject: body.subject,
          // Use plain text to avoid HTML injection
          text: sanitizedMessage,
          // Basic HTML wrapping (sanitized content)
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
        console.error('❌ Resend API error:', errorData);
        throw new Error(`Failed to send to ${email}: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Email sent to ${email}:`, data.id);
      return data;
    });

    // Wait for all emails
    const results = await Promise.allSettled(emailPromises);

    // Count results
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0) {
      console.warn(`⚠️ ${failed} email(s) failed`);
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason.message);

      return json(
        {
          emailsSent: successful,
          failed,
          errors,
        },
        207, // Multi-Status
        corsHeaders
      );
    }

    console.log(`✅ Successfully sent ${successful} email(s)`);
    return json(
      {
        emailsSent: successful,
        message: `Successfully sent ${successful} email(s)`,
      },
      200,
      corsHeaders
    );
  } catch (error) {
    return serverError(error, corsHeaders);
  }
});