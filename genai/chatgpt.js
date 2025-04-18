
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
}

export default ChatGPT;
