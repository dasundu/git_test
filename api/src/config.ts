import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith("dev-"))) {
  throw new Error("JWT_SECRET must be set to a strong value in production");
}

export const config = {
  isProd,
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me-in-production",
  webUrl: process.env.WEB_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:4000",
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "Truck Marketplace <no-reply@truckmarket.ph>",
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || "mailto:admin@truckmarket.ph",
  },
};
