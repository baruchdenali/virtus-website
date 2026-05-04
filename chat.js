// Vercel Serverless Function for AI Chat
// This calls Groq's API with the user's message and returns the AI response

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-8b-8192';

// System prompt that gives the AI context about Virtus Strategic Education Group
const SYSTEM_PROMPT = `You are an AI assistant for Virtus Strategic Education Group (VSEG), a prestigious educational consulting firm established in 1998. 

Your expertise covers:
- Strategic planning for educational institutions
- Executive coaching for C-Suite leaders in education
- Professional development for educators
- Parent coaching for future-ready children
- Policy design and governance
- The Master Instructor Summer Certificate (MISC) program

You are knowledgeable, professional, and helpful. You provide concise but thorough responses about educational leadership, strategy, and AI-driven solutions. 

If asked about pricing, specific packages, or complex custom solutions, suggest the visitor use the "Request a Call" button to speak with Dr. Phil Alcide or the PhD-level team directly.

Keep responses warm but authoritative. Use language that reflects the Ivy League meets Future-Tech aesthetic of the brand.`;

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Get API key from environment
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('GROQ_API_KEY not configured');
      res.status(500).json({ 
        error: 'AI service not configured',
        response: 'Our AI assistant is temporarily unavailable. Please click "Request a Call" to speak with our team directly.'
      });
      return;
    }

    // Build messages array from history + new message
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Call Groq API
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.9,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      console.error('Groq API error:', errorData);
      
      // Check if it's a rate limit
      if (groqResponse.status === 429) {
        res.status(200).json({
          response: 'I apologize, but our AI assistant is currently at capacity. Please try again in a moment, or click "Request a Call" to speak with our team directly.'
        });
        return;
      }

      throw new Error(`Groq API error: ${groqResponse.status}`);
    }

    const data = await groqResponse.json();
    const aiResponse = data.choices?.[0]?.message?.content || 
      'I apologize, but I am unable to provide a response at this moment. Please try again.';

    res.status(200).json({ response: aiResponse });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(200).json({
      response: 'I apologize, but I am experiencing technical difficulties. Please try again, or click "Request a Call" to speak with our PhD-level team directly.'
    });
  }
}
