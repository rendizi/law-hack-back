import axios from 'axios';
import { getUsersByArea } from './mongodb';
import dotenv from 'dotenv';
dotenv.config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_API_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

const authHeader = {
  auth: {
    username: TWILIO_ACCOUNT_SID || '',
    password: TWILIO_AUTH_TOKEN || '',
  },
};

const verificationCodes = new Map<string, string>(); // Temporary storage for verification codes

function validatePhoneNumber(phoneNumber: string) {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 format
  if (!phoneRegex.test(phoneNumber)) {
    throw new Error(`Invalid phone number format: ${phoneNumber}`);
  }
}

export async function sendVerificationCode(phoneNumber: string) {
  if (!TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is not set in the environment variables.');
  }
  validatePhoneNumber(phoneNumber);
  validatePhoneNumber(TWILIO_PHONE_NUMBER);

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit code
  verificationCodes.set(phoneNumber, code); // Store the code temporarily

  try {
    // Using the correct format for sending form data to Twilio
    const formData = new URLSearchParams();
    formData.append('To', phoneNumber);
    formData.append('From', TWILIO_PHONE_NUMBER);
    formData.append('Body', `Your verification code is: ${code}`);

    await axios.post(
      TWILIO_API_URL,
      formData.toString(),
      {
        ...authHeader,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  } catch (error: any) {
    console.error('Error sending verification code:', error.response?.data || error.message);
    throw new Error('Failed to send verification code.');
  }
}

export async function verifyCode(phoneNumber: string, code: string) {
  const storedCode = verificationCodes.get(phoneNumber);
  if (storedCode && storedCode === code) {
    verificationCodes.delete(phoneNumber); // Remove the code after successful verification
    return true;
  }
  return false;
}

export async function sendAnnouncementSMS(title: string, body: string, mediaUrls: string[], region: string, city: string) {
  if (!TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is not set in the environment variables.');
  }
  validatePhoneNumber(TWILIO_PHONE_NUMBER);

  const users = await getUsersByArea(region, city);
  const message = `${title}\n\n${body}`;

  for (const user of users) {
    validatePhoneNumber(user.phoneNumber);
    try {
      // Using the correct format for sending form data to Twilio
      const formData = new URLSearchParams();
      formData.append('To', user.phoneNumber);
      formData.append('From', TWILIO_PHONE_NUMBER);
      formData.append('Body', message);
      
      // Add media URLs if provided
      if (mediaUrls.length > 0) {
        mediaUrls.forEach(url => {
          formData.append('MediaUrl', url);
        });
      }

      await axios.post(
        TWILIO_API_URL,
        formData.toString(),
        {
          ...authHeader,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
    } catch (error: any) {
      console.error(`Error sending SMS to ${user.phoneNumber}:`, error.response?.data || error.message);
    }
  }
}