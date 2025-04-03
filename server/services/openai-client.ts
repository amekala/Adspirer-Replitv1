/**
 * OpenAI client setup
 * 
 * This module initializes and exports a configured OpenAI client
 * to ensure consistent API connections across the application.
 */

import OpenAI from "openai";

// Initialize the OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("WARNING: OPENAI_API_KEY environment variable is not set");
}

export const openai = new OpenAI({
  apiKey: apiKey || "dummy-key-for-development",
});