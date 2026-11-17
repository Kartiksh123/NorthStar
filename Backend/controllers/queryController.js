import { answerQuestion } from '../services/queryService.js';

export async function askQuestion(req, res) {
  try {
    const result = await answerQuestion(req.user.userId, req.body || {});
    return res.json(result);
  } catch (error) {
    const missingConfiguration = error.message.includes('GEMINI_API_KEY');
    const sourceMissing = error.message.includes('not found');
    const invalidRequest = error.message.includes('Provide a question')
      || error.message.includes('Choose one or more')
      || error.message.includes('Choose no more than');

    if (missingConfiguration) return res.status(503).json({ message: error.message });
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (sourceMissing) return res.status(404).json({ message: error.message });
    if (invalidRequest) return res.status(400).json({ message: error.message });

    console.error('Question processing failed:', error.message);
    return res.status(400).json({ message: 'The question could not be safely answered.' });
  }
}
