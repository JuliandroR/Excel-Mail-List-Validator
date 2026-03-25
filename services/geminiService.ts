import { GoogleGenAI } from "@google/genai";
import { ValidationResult, ValidationStatus } from "../types";

export const generateDataQualityReport = async (results: ValidationResult[]): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Filter for invalid emails to send to the model for analysis
  const invalidSamples = results
    .filter(r => r.status === ValidationStatus.INVALID_FORMAT)
    .slice(0, 20) // Limit to 20 samples to save tokens/context
    .map(r => r.original);

  const whitespaceCount = results.filter(r => r.status === ValidationStatus.WHITESPACE_ISSUE).length;
  const invalidCount = results.filter(r => r.status === ValidationStatus.INVALID_FORMAT).length;
  const duplicateCount = results.filter(r => r.status === ValidationStatus.DUPLICATE).length;
  const total = results.length;

  const prompt = `
    I have analyzed a dataset of ${total} emails.
    - ${invalidCount} were structurally invalid.
    - ${whitespaceCount} had whitespace issues.
    - ${duplicateCount} were exact duplicates.
    
    Here is a sample of the invalid emails:
    ${JSON.stringify(invalidSamples)}

    Please provide a concise data quality report (max 3 paragraphs). 
    1. Identify common patterns in the invalid emails (e.g., missing TLDs, spaces inside email, typos).
    2. Suggest specific cleaning actions (e.g., "trim whitespace", "filter out rows missing @", "remove duplicates").
    3. Rate the overall quality of this list (High, Medium, Low).
    
    Format the response using Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return "Failed to generate AI report. Please check your API key or network connection.";
  }
};