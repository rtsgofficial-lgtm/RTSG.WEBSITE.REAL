import net from "node:net";
import os from "node:os";
import tls from "node:tls";

export type ContactEmailInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

const DEFAULT_CONTACT_EMAIL_TO = "rtsg.official@gmail.com";
const SMTP_TIMEOUT_MS = 15000;

type SmtpResponse = {
  code: number;
  text: string;
};

type SmtpSocket = net.Socket | tls.TLSSocket;

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
};

function getContactEmailConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  const to = process.env.CONTACT_EMAIL_TO?.trim() || DEFAULT_CONTACT_EMAIL_TO;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    port === 465;

  if (!host || !user || !pass || !from || !to || !Number.isFinite(port)) {
    return null;
  }

  return { host, port, secure, user, pass, from, to };
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string): string {
  const clean = sanitizeHeader(value);

  if (/^[\x20-\x7e]*$/.test(clean)) {
    return clean;
  }

  return `=?UTF-8?B?${Buffer.from(clean, "utf8").toString("base64")}?=`;
}

function formatAddress(email: string, displayName?: string): string {
  const cleanEmail = sanitizeHeader(email);
  const cleanName = sanitizeHeader(displayName || "");

  if (!cleanName) {
    return `<${cleanEmail}>`;
  }

  return `${encodeHeader(cleanName)} <${cleanEmail}>`;
}

function wrapBase64(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/.{1,76}/g, "$&\r\n")
    .trimEnd();
}

function dotStuff(value: string): string {
  return value.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
}

function buildEmailMessage(config: SmtpConfig, input: ContactEmailInput): string {
  const subject = `[RTSG Contact] ${input.subject}`;
  const body = [
    `A new message was submitted through the RTSG contact form.`,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Subject: ${input.subject}`,
    "",
    "Message:",
    input.message,
  ].join("\n");

  const headers = [
    `From: ${formatAddress(config.from, "RTSG Contact Form")}`,
    `To: ${formatAddress(config.to)}`,
    `Reply-To: ${formatAddress(input.email, input.name)}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
  ];

  return dotStuff(`${headers.join("\r\n")}\r\n\r\n${wrapBase64(body)}`);
}

class SmtpClient {
  private socket: SmtpSocket | null = null;
  private buffer = "";
  private readonly config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  async connect() {
    this.socket = await new Promise<SmtpSocket>((resolve, reject) => {
      const onError = (error: Error) => reject(error);
      const socket = this.config.secure
        ? tls.connect(
            {
              host: this.config.host,
              port: this.config.port,
              servername: this.config.host,
              timeout: SMTP_TIMEOUT_MS,
            },
            () => {
              socket.off("error", onError);
              resolve(socket);
            }
          )
        : net.connect(
            {
              host: this.config.host,
              port: this.config.port,
              timeout: SMTP_TIMEOUT_MS,
            },
            () => {
              socket.off("error", onError);
              resolve(socket);
            }
          );

      socket.once("error", onError);
      socket.once("timeout", () => reject(new Error("SMTP connection timed out")));
    });

    this.socket.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
    });

    await this.readResponse([220]);
  }

  async startTls() {
    await this.command("STARTTLS", [220]);

    this.socket = await new Promise<tls.TLSSocket>((resolve) => {
      const secureSocket = tls.connect({
        socket: this.socket as net.Socket,
        servername: this.config.host,
      });
      secureSocket.once("secureConnect", () => resolve(secureSocket));
    });

    this.buffer = "";
    this.socket.on("data", (chunk) => {
      this.buffer += chunk.toString("utf8");
    });
  }

  async command(command: string, expectedCodes: number[] = [250]): Promise<SmtpResponse> {
    this.write(`${command}\r\n`);
    return this.readResponse(expectedCodes);
  }

  async sendData(message: string) {
    await this.command("DATA", [354]);
    this.write(`${message}\r\n.\r\n`);
    await this.readResponse([250]);
  }

  quit() {
    if (!this.socket || this.socket.destroyed) return;
    this.socket.write("QUIT\r\n");
    this.socket.end();
  }

  private write(value: string) {
    if (!this.socket || this.socket.destroyed) {
      throw new Error("SMTP socket is not connected");
    }
    this.socket.write(value);
  }

  private readResponse(expectedCodes: number[]): Promise<SmtpResponse> {
    const startedAt = Date.now();

    return new Promise((resolve, reject) => {
      const parse = () => {
        const lines = this.buffer.split(/\r?\n/);

        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index];
          const match = /^(\d{3})\s/.exec(line);

          if (!match) continue;

          const code = Number(match[1]);
          const responseLines = lines.slice(0, index + 1);
          this.buffer = lines.slice(index + 1).join("\r\n");
          const response = { code, text: responseLines.join("\n") };

          if (!expectedCodes.includes(code)) {
            reject(new Error(`Unexpected SMTP response: ${response.text}`));
            return true;
          }

          resolve(response);
          return true;
        }

        return false;
      };

      const interval = setInterval(() => {
        if (parse()) {
          clearInterval(interval);
          return;
        }

        if (Date.now() - startedAt > SMTP_TIMEOUT_MS) {
          clearInterval(interval);
          reject(new Error("SMTP response timed out"));
        }
      }, 25);
    });
  }
}

export async function sendContactEmail(input: ContactEmailInput): Promise<boolean> {
  const config = getContactEmailConfig();

  if (!config) {
    console.warn(
      "[Contact email] SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, and CONTACT_EMAIL_TO."
    );
    return false;
  }

  const client = new SmtpClient(config);

  try {
    await client.connect();
    await client.command(`EHLO ${os.hostname() || "rtsg.org"}`, [250]);

    if (!config.secure) {
      await client.startTls();
      await client.command(`EHLO ${os.hostname() || "rtsg.org"}`, [250]);
    }

    await client.command("AUTH LOGIN", [334]);
    await client.command(Buffer.from(config.user, "utf8").toString("base64"), [334]);
    await client.command(Buffer.from(config.pass, "utf8").toString("base64"), [235]);
    await client.command(`MAIL FROM:<${sanitizeHeader(config.from)}>`, [250]);
    await client.command(`RCPT TO:<${sanitizeHeader(config.to)}>`, [250, 251]);
    await client.sendData(buildEmailMessage(config, input));

    return true;
  } catch (error) {
    console.error("[Contact email] Failed to send contact email:", error);
    return false;
  } finally {
    client.quit();
  }
}
