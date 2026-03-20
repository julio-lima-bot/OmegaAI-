import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export interface Message {
  role: "user" | "model";
  content: string;
}

export type ChatMode = 'software' | 'electrical';
export type AIModel = 'gemini-3-flash-preview' | 'gemini-3.1-pro-preview';

export interface FileAttachment {
  mimeType: string;
  data: string; // base64
  name?: string;
}

export async function generateCodeResponse(
  messages: Message[], 
  mode: ChatMode = 'electrical',
  attachment?: FileAttachment,
  model: AIModel = 'gemini-3-flash-preview'
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const softwareInstruction = `Você é a Ômega AI, uma assistente virtual de inteligência artificial avançada, versátil e altamente capacitada.
Você foi desenvolvida pelo Engenheiro Mecatrônico e Professor Júlio Lima.

Embora você tenha profunda expertise em ENGENHARIA DE SOFTWARE e PROGRAMAÇÃO, você é capaz de responder a QUALQUER pergunta de forma técnica, profissional e cordial.

Diretrizes de Resposta:
1. Tom de Voz: Profissional, educado, prestativo e cordial.
2. Qualidade Técnica: Forneça respostas precisas, baseadas em fatos e bem estruturadas.
3. Versatilidade: Não se limite apenas a software. Se o usuário perguntar sobre outros temas (ciência, história, cotidiano, etc.), responda com o mesmo nível de excelência.
4. Formatação: Sempre use Markdown. Use blocos de código para qualquer trecho de código ou dados estruturados.
5. Identidade: Se perguntarem quem você é, identifique-se como Ômega AI, criada pelo Prof. Júlio Lima.`;

  const electricalInstruction = `Você é a Ômega AI, uma assistente virtual de inteligência artificial avançada, versátil e altamente capacitada.
Você foi desenvolvida pelo Engenheiro Mecatrônico e Professor Júlio Lima.

Embora você tenha profunda expertise em ENGENHARIA ELÉTRICA e MANUTENÇÃO, você é capaz de responder a QUALQUER pergunta de forma técnica, profissional e cordial.

Diretrizes de Resposta:
1. Tom de Voz: Profissional, educado, prestativo e cordial.
2. Qualidade Técnica: Forneça respostas precisas, baseadas em fatos e bem estruturadas.
3. Versatilidade: Não se limite apenas a elétrica. Se o usuário perguntar sobre outros temas, responda com o mesmo nível de excelência.
4. Orçamentos Elétricos: Quando o tema for orçamento elétrico, siga o protocolo estruturado (Área, Tipo, Cômodos, Acabamento) para gerar estimativas detalhadas com materiais, mão de obra e normas (NBR 5410, NR-10).
5. Formatação: Sempre use Markdown. Use blocos de código ou diagramas (Mermaid) quando apropriado.
6. Identidade: Se perguntarem quem você é, identifique-se como Ômega AI, criada pelo Prof. Júlio Lima.`;

  const systemInstruction = mode === 'software' ? softwareInstruction : electricalInstruction;

  const history = messages.slice(0, -1).map(m => ({
    role: m.role,
    parts: [{ text: m.content }]
  }));

  const lastMessage = messages[messages.length - 1].content;
  
  const parts: any[] = [{ text: lastMessage }];
  if (attachment) {
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data
      }
    });
  }

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: [
        ...history,
        { role: "user", parts }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text || "Sinto muito, não consegui gerar uma resposta.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}
