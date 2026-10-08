import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
  maxRetries: 0 // Prevents the SDK from spamming retries when rate limited
});

const DEFAULT_VISION_MODEL = "qwen/qwen3.8-27b";

export async function extractTextFromImage(base64DataUrl: string): Promise<string> {
  try {
    const response = await groq.chat.completions.create({
      model: DEFAULT_VISION_MODEL,
      max_tokens: 1000, 
      messages: [
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `
                Act as an expert OCR engine. Extract all readable text from this image exactly as written.
                For any tabular data or grids found in the image, do NOT use Markdown pipe syntax.
                Instead, format them using strict HTML table tags (<table>, <tr>, <th>, and <td>).
                Ensure the HTML is well-formed and clean. Return your final answer in fully formatted markdown.
                Return the data formatted as a JSON object in string text, so that it is decryptable with JSON.stringify();


        
            ` 
            },
            {
              type: "image_url",
              image_url: { url: base64DataUrl }
            }
          ]
        }
      ],
      temperature: 0.1
    });

    return response.choices?.[0]?.message?.content || 'No text content returned.';
  } catch (error: any) {
    if (error?.status === 429) {
      throw new Error("Groq Rate Limit Reached. Please wait 1 minute before refreshing.");
    }
    throw error;
  }
}