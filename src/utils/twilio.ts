import twilio from 'twilio';
import { getUsersByArea } from './mongodb';
import dotenv from "dotenv";
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
var servicesid = ""

export async function createService(){
    const service = await client.verify.v2.services.create({
        friendlyName: "Law",
    });

    servicesid = service.sid
    
    return service.sid
}

export async function sendVerificationCode(phoneNumber: string) {
  await client.verify.services(servicesid).verifications.create({ to: phoneNumber, channel: 'sms' });
}

export async function verifyCode(phoneNumber: string, code: string) {
  const result = await client.verify.services(servicesid).verificationChecks.create({ to: phoneNumber, code });
//   const result = await client.messages.create({
//     to: phoneNumber,
//     from: '+17854706502',
//     body: code,
//   });
  return result.status === 'approved';
}

export async function sendAnnouncementSMS(title: string, body: string, mediaUrls: string[], region: string, city: string) {
  const users = await getUsersByArea(region, city);
  const message = `${title}\n\n${body}`;

  for (const user of users) {
    await client.messages.create({
      to: user.phoneNumber,
      from: '+17854706502',
      body: message,
      ...(mediaUrls.length > 0 && { mediaUrl: mediaUrls }),
    });
  }
}