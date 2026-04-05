import nodemailer from "nodemailer";

export type LeadPayload = {
  name: string;
  whatsapp: string;
  city: string;
  needType: string;
  sizeEstimate?: string;
  budgetRange?: string;
  notes?: string;
};

function formatTelegram(p: LeadPayload): string {
  return [
    "<b>Lead baru — Intero</b>",
    `Nama: ${p.name}`,
    `WA: ${p.whatsapp}`,
    `Kota: ${p.city}`,
    `Kebutuhan: ${p.needType}`,
    p.sizeEstimate ? `Ukuran: ${p.sizeEstimate}` : "",
    p.budgetRange ? `Budget: ${p.budgetRange}` : "",
    p.notes ? `Catatan: ${p.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function notifyLeadCreated(p: LeadPayload): Promise<void> {
  const text = formatTelegram(p);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (token && chatId) {
    try {
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
          }),
        },
      );
    } catch (e) {
      console.error("Telegram notify failed", e);
    }
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  if (host && user && pass && to) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || user,
        to,
        subject: `[Intero] Lead baru: ${p.name}`,
        text: text.replace(/<[^>]+>/g, ""),
      });
    } catch (e) {
      console.error("Email notify failed", e);
    }
  }
}
