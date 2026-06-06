import "server-only";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

let client: SESClient | null = null;
function getClient() {
  if (!client) client = new SESClient({ region: process.env.AWS_REGION });
  return client;
}

export async function sendEmailViaSes(args: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;          // optional — the staff notification is text-only today
  replyTo?: string;       // e.g. the inquirer's email on the staff notification
}): Promise<void> {
  await getClient().send(
    new SendEmailCommand({
      Source: args.from,
      Destination: { ToAddresses: [args.to] },
      ReplyToAddresses: args.replyTo ? [args.replyTo] : undefined,
      Message: {
        Subject: { Data: args.subject, Charset: "UTF-8" },
        Body: {
          Text: { Data: args.text, Charset: "UTF-8" },
          ...(args.html ? { Html: { Data: args.html, Charset: "UTF-8" } } : {}),
        },
      },
    })
  );
}
