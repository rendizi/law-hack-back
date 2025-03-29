import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017');
let db: any;

export async function connectToDatabase() {
  await client.connect();
  db = client.db('law-hack');
}

export async function getUserByPhone(phoneNumber: string) {
  return db.collection('users').findOne({ phoneNumber });
}

export async function createUser(phoneNumber: string, role: string, region: string, city: string) {
  const user = { phoneNumber, role, region, city, createdAt: new Date() };
  await db.collection('users').insertOne(user);
  return user;
}

export async function createChat(userId: string) {
  const chat = { userId, messages: [], createdAt: new Date() };
  const result = await db.collection('chats').insertOne(chat);
  return result.insertedId;
}

export async function addMessage(chatId: string, type: string, content: string, botResponse: string | null) {
  const userMessage = {
    type, // 'text', 'image', or 'video'
    content,
    role: 'user',
    timestamp: new Date(),
  };

  const assistantMessage = botResponse
    ? {
        type: 'text',
        content: botResponse,
        role: 'assistant',
        timestamp: new Date(),
      }
    : null;

  const messagesToPush = [userMessage, ...(assistantMessage ? [assistantMessage] : [])];

  console.log(messagesToPush, chatId);

  await db.collection('chats').updateOne(
    { _id: new ObjectId(chatId) }, // Ensure chatId is treated as an ObjectId
    { $push: { messages: { $each: messagesToPush } } } // Push multiple messages if needed
  );
}

export async function getChatHistory(chatId: string) {
  return db.collection('chats').findOne({ _id: new ObjectId(chatId) });
}

export async function getAdminChats(adminId: string) {
  return db.collection('chats').find({ adminId: new ObjectId(adminId) }).toArray();
}

export async function terminateChat(chatId: string) {
  await db.collection('chats').deleteOne({ _id: new ObjectId(chatId) });
}

export async function saveAnnouncement(title: string, body: string, mediaUrls: string[], region: string, city: string) {
  const announcement = { title, body, mediaUrls, region, city, createdAt: new Date() };
  const result = await db.collection('announcements').insertOne(announcement);
  return result.insertedId;
}

export async function getAnnouncementsForUser(userId: string) {
  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error('User not found');

  return db.collection('announcements')
    .find({ region: user.region, city: user.city })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getUsersByArea(region: string, city: string) {
  return db.collection('users').find({ region, city }).toArray();
}

export async function getAllUsers() {
  return db.collection('users').find().toArray();
}

export async function createReport(title: string, location: { coordinates: [number, number]; region: string; city: string }, mediaUrls: string[], body: string, time: string) {
  const report = { title, location, mediaUrls, body, time, status: 'open', createdAt: new Date() };
  const result = await db.collection('reports').insertOne(report);
  return result.insertedId;
}

export async function getReports() {
  return db.collection('reports').find({ status: 'open' }).sort({ createdAt: -1 }).toArray();
}

export async function closeReport(reportId: string) {
  await db.collection('reports').updateOne({ _id: new ObjectId(reportId) }, { $set: { status: 'closed' } });
}
