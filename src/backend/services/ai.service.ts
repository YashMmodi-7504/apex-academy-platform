import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MISSING_API_KEY',
});

/**
 * Parses raw text extracted from a PDF material and generates multiple-choice questions.
 * @param text The raw text extracted from the PDF.
 * @param count The number of questions to generate (default 5).
 */
export async function generateQuizFromText(text: string, count: number = 5): Promise<any> {
  if (process.env.GEMINI_API_KEY === 'MISSING_API_KEY' || !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }

  const prompt = `
    You are an expert curriculum designer. Given the following educational text extracted from a course material, generate ${count} multiple-choice questions that test the learner's understanding of the key concepts.
    
    TEXT START:
    ${text.substring(0, 30000)} // Limiting text length to avoid token limits just in case
    TEXT END
    
    Ensure that the questions are challenging and educational.
  `;

  // Define the expected JSON schema for structured output
  const responseSchema: Schema = {
    type: Type.ARRAY,
    description: 'A list of multiple choice questions generated from the text.',
    items: {
      type: Type.OBJECT,
      properties: {
        question_text: {
          type: Type.STRING,
          description: 'The question text.',
        },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              option_text: {
                type: Type.STRING,
                description: 'The text for this option.',
              },
              is_correct: {
                type: Type.BOOLEAN,
                description: 'Whether this option is the correct answer.',
              },
            },
            required: ['option_text', 'is_correct'],
          },
          description: 'The possible answer options. There should be exactly 4 options, with exactly 1 correct option.',
        },
        explanation: {
          type: Type.STRING,
          description: 'A detailed explanation of why the correct option is correct.',
        },
      },
      required: ['question_text', 'options', 'explanation'],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
        temperature: 0.2, // Low temperature for more deterministic/factual output
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('No text returned from Gemini API');
    }
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Error in AI Quiz Generation:', error);
    throw error;
  }
}
