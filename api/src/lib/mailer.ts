import nodemailer from "nodemailer";
import { config } from "../config";

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transporter) {
    if (process.env.NODE_ENV !== "test") console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}\n`);
    return;
  }
  try {
    await transporter.sendMail({ from: config.smtp.from, to, subject, text });
  } catch (e) {
    console.error("mail failed", e);
  }
}
