// Lightweight SMTP receiver that stores inbound emails to the VentureOS dashboard
// Uses Nodemailer's smtp-server package

const { SMTPServer } = require("smtp-server");
const { simpleParser } = require("mailparser");
const { createClient } = require("@supabase/supabase-js");

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://venture-os-web-1:3000/api/email/inbound";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "nbdigital-mail-2026";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10);
const ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || "thenorthbridgemi.org,thenorthbridgemi.com").split(",");
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://lwxhdiximymbpaazhulo.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || "";
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

async function uploadAttachment(attachment, emailId) {
  if (!supabase || !attachment.content) return null;
  const filename = attachment.filename || `attachment-${Date.now()}`;
  const path = `00000000-0000-0000-0000-000000000001/email-attachments/${emailId}/${filename}`;
  try {
    const { error } = await supabase.storage
      .from("workspace")
      .upload(path, attachment.content, {
        contentType: attachment.contentType || "application/octet-stream",
        upsert: true,
      });
    if (error) {
      console.error(`[SMTP] Attachment upload failed: ${error.message}`);
      return null;
    }
    console.log(`[SMTP] Attachment uploaded: ${path} (${attachment.size} bytes)`);
    return path;
  } catch (e) {
    console.error(`[SMTP] Attachment upload error: ${e.message}`);
    return null;
  }
}

// Forwarding rules: address → gmail
const FORWARD_RULES = {
  "info@thenorthbridgemi.org": "detroitvr221@gmail.com",
  "hello@thenorthbridgemi.org": "detroitvr221@gmail.com",
  "support@thenorthbridgemi.org": "detroitvr221@gmail.com",
  "team@thenorthbridgemi.org": "detroitvr221@gmail.com",
};

async function forwardEmail(payload) {
  const recipients = payload.envelope?.to || payload.to || [];
  for (const rcpt of recipients) {
    const forwardTo = FORWARD_RULES[rcpt.toLowerCase()];
    if (!forwardTo || !RESEND_API_KEY) continue;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `fwd@thenorthbridgemi.org`,
          to: [forwardTo],
          subject: `[FWD: ${rcpt}] ${payload.subject || "(No Subject)"}`,
          text: `--- Forwarded email to ${rcpt} ---\nFrom: ${payload.from}\nDate: ${payload.receivedAt}\n\n${payload.text || ""}`,
          html: payload.html || undefined,
          reply_to: payload.from || undefined,
        }),
      });
      if (res.ok) {
        console.log(`[SMTP] Forwarded ${rcpt} → ${forwardTo}`);
      } else {
        console.error(`[SMTP] Forward failed: ${res.status}`);
      }
    } catch (e) {
      console.error(`[SMTP] Forward error: ${e.message}`);
    }
  }
}

console.log(`[SMTP] Starting server on port ${SMTP_PORT}`);
console.log(`[SMTP] Webhook: ${WEBHOOK_URL}`);
console.log(`[SMTP] Allowed domains: ${ALLOWED_DOMAINS.join(", ")}`);

const server = new SMTPServer({
  // No auth required for receiving mail
  authOptional: true,
  disabledCommands: ["AUTH"],

  // Allow all connections (we filter by recipient domain)
  onConnect(session, callback) {
    console.log(`[SMTP] Connection from ${session.remoteAddress}`);
    return callback();
  },

  // Validate envelope
  onMailFrom(address, session, callback) {
    console.log(`[SMTP] MAIL FROM: ${address.address}`);
    return callback();
  },

  onRcptTo(address, session, callback) {
    const domain = address.address.split("@")[1]?.toLowerCase();
    if (!ALLOWED_DOMAINS.includes(domain)) {
      console.log(`[SMTP] Rejected recipient: ${address.address} (domain ${domain} not allowed)`);
      return callback(new Error(`Relay denied for ${domain}`));
    }
    console.log(`[SMTP] RCPT TO: ${address.address}`);
    return callback();
  },

  // Process the email
  onData(stream, session, callback) {
    let rawEmail = "";

    stream.on("data", (chunk) => {
      rawEmail += chunk.toString();
    });

    stream.on("end", async () => {
      try {
        const parsed = await simpleParser(rawEmail);

        const payload = {
          from: parsed.from?.text || "",
          fromName: parsed.from?.value?.[0]?.name || "",
          to: (parsed.to?.value || []).map((a) => a.address),
          cc: (parsed.cc?.value || []).map((a) => a.address),
          subject: parsed.subject || "",
          text: parsed.text || "",
          html: parsed.html || "",
          messageId: parsed.messageId || "",
          inReplyTo: parsed.inReplyTo || "",
          headers: Object.fromEntries(
            Array.from(parsed.headers || new Map()).map(([k, v]) => [
              k,
              typeof v === "object" && v?.value ? v.value : String(v || ""),
            ])
          ),
          attachments: [],  // populated after upload
          envelope: {
            from: session.envelope?.mailFrom?.address || "",
            to: (session.envelope?.rcptTo || []).map((r) => r.address),
          },
          receivedAt: new Date().toISOString(),
        };

        console.log(`[SMTP] Received email from ${payload.from} to ${payload.envelope.to.join(", ")}: "${payload.subject}"`);

        // Upload attachments to Supabase Storage
        const emailId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        for (const att of parsed.attachments || []) {
          const storagePath = await uploadAttachment(att, emailId);
          payload.attachments.push({
            filename: att.filename || "unnamed",
            contentType: att.contentType || "application/octet-stream",
            size: att.size || 0,
            storagePath: storagePath,
          });
        }
        if (payload.attachments.length > 0) {
          console.log(`[SMTP] ${payload.attachments.length} attachment(s) processed`);
        }

        // POST to webhook
        try {
          const res = await fetch(`${WEBHOOK_URL}?secret=${WEBHOOK_SECRET}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const data = await res.json();
            console.log(`[SMTP] Stored email: ${data.id}`);
          } else {
            const text = await res.text();
            console.error(`[SMTP] Webhook failed (${res.status}): ${text}`);
          }
        } catch (webhookErr) {
          console.error("[SMTP] Webhook error:", webhookErr.message);
          // Still accept the email even if webhook fails
        }

        // Forward to Gmail if rules match
        await forwardEmail(payload);

        return callback();
      } catch (parseErr) {
        console.error("[SMTP] Parse error:", parseErr);
        return callback(new Error("Failed to process message"));
      }
    });
  },
});

server.listen(SMTP_PORT, "0.0.0.0", () => {
  console.log(`[SMTP] Server listening on port ${SMTP_PORT}`);
});

server.on("error", (err) => {
  console.error("[SMTP] Server error:", err);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[SMTP] Shutting down...");
  server.close();
  process.exit(0);
});
