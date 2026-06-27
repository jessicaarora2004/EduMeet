import Groq from 'groq-sdk';

const getClient = () => new Groq({ apiKey: process.env.GROQ_API_KEY });

export const generateSummary = async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ message: 'No transcript provided' });
    }

    const groq = getClient();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `You are an educational assistant. Based on the following lecture transcript, provide:
1. A clear and concise LECTURE SUMMARY (5-8 bullet points covering main topics)
2. A HOMEWORK SECTION with 3-5 specific homework tasks for students based on what was taught

Format your response exactly like this:
LECTURE SUMMARY:
- [point 1]
- [point 2]
...

HOMEWORK:
- [task 1]
- [task 2]
...

Transcript:
${transcript}`
        }
      ]
    });

    const text = completion.choices[0].message.content;
    const summaryMatch = text.split('HOMEWORK:');
    const summary = summaryMatch[0].replace('LECTURE SUMMARY:', '').trim();
    const homework = summaryMatch[1]?.trim() || '';

    res.status(200).json({ summary, homework });
  } catch (err) {
    console.error('Groq error:', err);
    res.status(500).json({ message: 'AI generation failed', error: err.message });
  }
};

export const generateQuiz = async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ message: 'No transcript provided' });
    }

    const groq = getClient();

    const completion = await groq.chat.completions.create({
     model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: `Based on this lecture transcript, generate 5 multiple choice questions to test student understanding.

Return ONLY a valid JSON array, no explanation, no markdown, just the raw JSON:
[
  {
    "question": "question text",
    "options": ["option A", "option B", "option C", "option D"],
    "correctAnswer": 0
  }
]
correctAnswer is the index (0-3) of the correct option.

Transcript:
${transcript}`
        }
      ]
    });

    let text = completion.choices[0].message.content.trim();
    text = text.replace(/```json|```/g, '').trim();
    const questions = JSON.parse(text);

    res.status(200).json({ questions });
  } catch (err) {
    console.error('Groq quiz error:', err);
    res.status(500).json({ message: 'Quiz generation failed', error: err.message });
  }
};