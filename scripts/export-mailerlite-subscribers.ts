import axios from "axios";
import { createObjectCsvWriter } from "csv-writer";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.MAILERLITE_API_KEY;

if (!API_KEY) {
  throw new Error("MAILERLITE_API_KEY is missing");
}

const client = axios.create({
  baseURL: "https://connect.mailerlite.com/api",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

interface Subscriber {
  id: string;
  email: string;
  status: string;
  source: string;
  sent: number;
  opens_count: number;
  clicks_count: number;
  open_rate: number;
  click_rate: number;
  ip_address: string | null;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
  opted_in_at: string | null;
  optin_ip: string | null;
  fields: Record<string, any>;
}

async function getAllSubscribers(): Promise<Subscriber[]> {
  const subscribers: Subscriber[] = [];

  let cursor: string | undefined;

  while (true) {
    const params: Record<string, any> = {
      limit: 1000,
    };

    if (cursor) {
      params.cursor = cursor;
    }

    console.log(
      `Fetching page${cursor ? ` (cursor: ${cursor.slice(0, 20)}...)` : ""}`
    );

    const response = await client.get("/subscribers", {
      params,
    });

    subscribers.push(...response.data.data);

    cursor = response.data.meta?.next_cursor;

    if (!cursor) {
      break;
    }
  }

  return subscribers;
}

async function exportSubscribers() {
  const subscribers = await getAllSubscribers();

  console.log(`Fetched ${subscribers.length} subscribers`);

  // Find every custom/default field used
  const fieldNames = new Set<string>();

  for (const subscriber of subscribers) {
    Object.keys(subscriber.fields || {}).forEach((f) => fieldNames.add(f));
  }

  const customFields = [...fieldNames].sort();

  const rows = subscribers.map((s) => {
    const row: Record<string, any> = {
      id: s.id,
      email: s.email,
      status: s.status,
      source: s.source,
      sent: s.sent,
      opens_count: s.opens_count,
      clicks_count: s.clicks_count,
      open_rate: s.open_rate,
      click_rate: s.click_rate,
      ip_address: s.ip_address,
      subscribed_at: s.subscribed_at,
      unsubscribed_at: s.unsubscribed_at,
      created_at: s.created_at,
      updated_at: s.updated_at,
      opted_in_at: s.opted_in_at,
      optin_ip: s.optin_ip,
    };

    for (const field of customFields) {
      row[field] = s.fields?.[field] ?? "";
    }

    return row;
  });

  const csvWriter = createObjectCsvWriter({
    path: "subscribers.csv",
    header: [
      { id: "id", title: "id" },
      { id: "email", title: "email" },
      { id: "status", title: "status" },
      { id: "source", title: "source" },
      { id: "sent", title: "sent" },
      { id: "opens_count", title: "opens_count" },
      { id: "clicks_count", title: "clicks_count" },
      { id: "open_rate", title: "open_rate" },
      { id: "click_rate", title: "click_rate" },
      { id: "ip_address", title: "ip_address" },
      { id: "subscribed_at", title: "subscribed_at" },
      { id: "unsubscribed_at", title: "unsubscribed_at" },
      { id: "created_at", title: "created_at" },
      { id: "updated_at", title: "updated_at" },
      { id: "opted_in_at", title: "opted_in_at" },
      { id: "optin_ip", title: "optin_ip" },
      ...customFields.map((field) => ({
        id: field,
        title: field,
      })),
    ],
  });

  await csvWriter.writeRecords(rows);

  console.log(`Exported ${rows.length} subscribers to subscribers.csv`);
}

exportSubscribers().catch((err) => {
  console.error(err.response?.data || err);
  process.exit(1);
});
