import GenAI from './genai.js';

class ChatGPT extends GenAI {
  constructor(openai, model) {
    super(model);
    this.openai = openai;
  }

  async chatQuery(systemInstruction, query) {
    const chatResponse = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: query }
      ],
    });

    return chatResponse.choices[0].message.content ?? '';
  }

  async textToSpeech(textToSpeech) {
    const mp3 = await this.openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "echo",
      instructions: "Speak in the style of a professional news reporter. Maintain a clear, steady pace with deliberate phrasing. Use neutral intonation with slight emphasis on key facts and transitions. Your tone should be informative and confident, avoiding dramatization. Pause briefly after commas and periods to allow for clarity. Treat punctuation naturally: rise slightly at commas, and pause at periods and dashes. Avoid overly casual language; use formal or semi-formal phrasing appropriate for a news broadcast.",
      input: textToSpeech,
    });

    return await mp3.arrayBuffer();
  }
}

export default ChatGPT;
