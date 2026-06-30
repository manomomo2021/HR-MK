// app/actions.ts
"use server";
import { neon } from "@neondatabase/serverless";

/**
 * Example server action that queries Neon PostgreSQL.
 * The DATABASE_URL environment variable must be defined on the server
 * (e.g., in .env.local or Vercel environment variables). It is never
 * exposed to client‑side code because this file is marked with "use server".
 */
export async function getData() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined in environment variables");
    }
    const sql = neon(process.env.DATABASE_URL);
    // Replace the placeholder query with your actual SQL.
    const data = await sql`SELECT * FROM your_table LIMIT 10`;
    return data;
}

// NOTE: Keep Neon credentials secure – do NOT commit the DATABASE_URL value
// to the repository. Add it to .env.local (which should be listed in .gitignore)
// and configure it in Vercel's Project Settings under Environment Variables.
