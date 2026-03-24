/**
 * SMTP email sender for KLSH fraud reports.
 *
 * Uses Node.js net/tls and the SMTP protocol directly to avoid adding
 * a heavy dependency like nodemailer.  Supports STARTTLS on port 587
 * and implicit TLS on port 465.
 *
 * Credentials come from environment variables (set via GitHub Secrets):
 *   KLSH_SMTP_HOST, KLSH_SMTP_PORT, KLSH_SMTP_USER, KLSH_SMTP_PASS,
 *   KLSH_EMAIL_FROM, KLSH_EMAIL_TO
 */

import * as net from "net";
import * as tls from "tls";
import * as fs from "fs";
import * as path from "path";
import type { EmailConfig, FraudReport } from "../types";

export function loadEmailConfig(): EmailConfig {
  const host = process.env.KLSH_SMTP_HOST ?? "";
  const port = Number(process.env.KLSH_SMTP_PORT) || 587;
  const user = process.env.KLSH_SMTP_USER ?? "";
  const pass = process.env.KLSH_SMTP_PASS ?? "";
  const from = process.env.KLSH_EMAIL_FROM ?? "";
  const toRaw = process.env.KLSH_EMAIL_TO ?? "";

  const missing: string[] = [];
  if (!host) missing.push("KLSH_SMTP_HOST");
  if (!user) missing.push("KLSH_SMTP_USER");
  if (!pass) missing.push("KLSH_SMTP_PASS");
  if (!from) missing.push("KLSH_EMAIL_FROM");
  if (!toRaw) missing.push("KLSH_EMAIL_TO");

  if (missing.length > 0) {
    throw new Error(
      `Missing required email secrets: ${missing.join(", ")}. ` +
        "Set them in GitHub repository secrets.",
    );
  }

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from,
    to: toRaw.split(",").map((s) => s.trim()).filter(Boolean),
  };
}

// ---------------------------------------------------------------------------
// Lightweight SMTP client
// ---------------------------------------------------------------------------

function smtpCommand(
  socket: net.Socket | tls.TLSSocket,
  cmd: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const onData = (data: Buffer) => {
      socket.removeListener("data", onData);
      resolve(data.toString());
    };
    socket.on("data", onData);
    socket.write(cmd + "\r\n", (err) => {
      if (err) reject(err);
    });
  });
}

function waitGreeting(socket: net.Socket | tls.TLSSocket): Promise<string> {
  return new Promise((resolve) => {
    const onData = (data: Buffer) => {
      socket.removeListener("data", onData);
      resolve(data.toString());
    };
    socket.on("data", onData);
  });
}

function upgradeToTls(
  socket: net.Socket,
  host: string,
): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const tlsSocket = tls.connect(
      { socket, host, rejectUnauthorized: false },
      () => resolve(tlsSocket),
    );
    tlsSocket.on("error", reject);
  });
}

function buildMimeMessage(opts: {
  from: string;
  to: string[];
  subject: string;
  textBody: string;
  attachments: { filename: string; content: string; contentType: string }[];
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to.join(", ")}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    opts.textBody,
    "",
  ];

  for (const att of opts.attachments) {
    const encoded = Buffer.from(att.content, "utf-8").toString("base64");
    lines.push(
      `--${boundary}`,
      `Content-Type: ${att.contentType}; name="${att.filename}"`,
      `Content-Disposition: attachment; filename="${att.filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      ...encoded.match(/.{1,76}/g)!,
      "",
    );
  }

  lines.push(`--${boundary}--`);
  return lines.join("\r\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendReport(
  config: EmailConfig,
  report: FraudReport,
  artifactDir: string,
): Promise<void> {
  const subject = `[KLSH] Fraud Report — ${report.generatedAt.split("T")[0]} — ${report.totalFindings} findings`;

  const textBody = [
    "KLSH Fraud Detection Report",
    "===========================",
    "",
    `Generated: ${report.generatedAt}`,
    `Total records analysed: ${report.totalRecords}`,
    `Findings (score > 0): ${report.totalFindings}`,
    "",
    "Risk distribution:",
    ...Object.entries(report.scoreDistribution).map(
      ([k, v]) => `  ${k}: ${v}`,
    ),
    "",
    "Full report files are attached as JSON, CSV, and Markdown.",
    "",
    "This report was generated automatically by the LLogaria AL",
    "fraud detection pipeline.",
  ].join("\n");

  const attachments: { filename: string; content: string; contentType: string }[] = [];
  const exts: Record<string, string> = {
    ".json": "application/json",
    ".csv": "text/csv",
    ".md": "text/markdown",
  };
  for (const file of fs.readdirSync(artifactDir)) {
    const ext = path.extname(file);
    if (exts[ext]) {
      attachments.push({
        filename: file,
        content: fs.readFileSync(path.join(artifactDir, file), "utf-8"),
        contentType: exts[ext],
      });
    }
  }

  const mime = buildMimeMessage({
    from: config.from,
    to: config.to,
    subject,
    textBody,
    attachments,
  });

  // Connect
  let socket: net.Socket | tls.TLSSocket;
  if (config.secure) {
    socket = tls.connect(config.port, config.host, {
      rejectUnauthorized: false,
    });
    await waitGreeting(socket);
  } else {
    socket = new net.Socket();
    socket.connect(config.port, config.host);
    await waitGreeting(socket);
    await smtpCommand(socket, `EHLO localhost`);
    const startTls = await smtpCommand(socket, "STARTTLS");
    if (startTls.startsWith("220")) {
      socket = await upgradeToTls(socket as net.Socket, config.host);
    }
  }

  await smtpCommand(socket, `EHLO localhost`);

  // AUTH LOGIN
  await smtpCommand(socket, "AUTH LOGIN");
  await smtpCommand(socket, Buffer.from(config.user).toString("base64"));
  const authResp = await smtpCommand(
    socket,
    Buffer.from(config.pass).toString("base64"),
  );
  if (!authResp.startsWith("235")) {
    socket.destroy();
    throw new Error(`SMTP AUTH failed: ${authResp.trim()}`);
  }

  await smtpCommand(socket, `MAIL FROM:<${config.from}>`);
  for (const to of config.to) {
    await smtpCommand(socket, `RCPT TO:<${to}>`);
  }
  await smtpCommand(socket, "DATA");
  const sendResp = await smtpCommand(socket, mime + "\r\n.");
  if (!sendResp.startsWith("250")) {
    socket.destroy();
    throw new Error(`SMTP DATA rejected: ${sendResp.trim()}`);
  }

  await smtpCommand(socket, "QUIT");
  socket.destroy();
  console.log(`Email sent to ${config.to.join(", ")}`);
}
