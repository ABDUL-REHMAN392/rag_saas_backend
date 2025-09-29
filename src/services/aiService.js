import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

class AIService {
  constructor() {
    this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    this.model = "Qwen/Qwen-7B-Chat";
  }

  async generateResponse(query, context = []) {
    const startTime = Date.now();

    try {
      // 🚨 اگر context بالکل خالی ہو — تو AI کو بالکل نہیں چلانا!
      if (!context || context.length === 0) {
        return {
          response:
            "میں نے آپ کے دیے گئے قرآن و حدیث کے ذخیرے میں کوئی متعلقہ معلومات نہیں پائی۔ براہ کرم سوال واضح کریں یا دوبارہ کوشش کریں۔",
          tokensUsed: 0,
          processingTime: Date.now() - startTime,
          model: "Qwen-7B-Chat",
        };
      }

      // Step 1: Prompt بناؤ — صرف context پر مبنی
      const prompt = this.buildQwenPrompt(query, context);

      // Step 2: Qwen-7B-Chat کو call کرو
      const response = await this.hf.textGeneration({
        model: this.model,
        inputs: prompt,
        parameters: {
          max_new_tokens: 600, // زیادہ لمبا جواب نہیں چاہیے
          temperature: 0.1, // بالکل focused — creativity = 0
          top_p: 0.8,
          repetition_penalty: 1.2,
          return_full_text: false,
        },
      });

      // Step 3: جواب کو صاف کر کے frontend کے لیے تیار کرو
      const cleanedResponse = this.cleanResponse(response.generated_text);

      // 🚫 اگر AI نے کچھ ایسا جواب دیا جو context سے باہر ہے — تو block کرو!
      if (
        cleanedResponse.includes("I don't know") ||
        cleanedResponse.includes("میں نہیں جانتا") ||
        cleanedResponse.includes("not found") ||
        cleanedResponse.length < 10 ||
        cleanedResponse === "Sorry, I couldn't generate a proper response."
      ) {
        return {
          response:
            "میں نے آپ کے دیے گئے قرآن و حدیث کے ذخیرے میں کوئی متعلقہ معلومات نہیں پائی۔",
          tokensUsed: Math.ceil(prompt.length / 4),
          processingTime: Date.now() - startTime,
          model: "Qwen-7B-Chat",
        };
      }

      return {
        response: cleanedResponse,
        tokensUsed: Math.ceil(prompt.length / 4),
        processingTime: Date.now() - startTime,
        model: "Qwen-7B-Chat",
      };
    } catch (error) {
      console.error("Error generating Qwen response:", error);
      return {
        response: "جواب تیار کرنے میں خرابی — براہ کرم دوبارہ کوشش کریں۔",
        tokensUsed: 0,
        processingTime: Date.now() - startTime,
        model: "Qwen-7B-Chat",
      };
    }
  }

  // 💡 Prompt Design — فقط قرآن و حدیث کے لیے
  buildQwenPrompt(query, context) {
    let contextText =
      "صرف درج ذیل معلومات کا استعمال کر کے سوال کا جواب دیں۔ اگر متعلقہ معلومات نہ ملیں تو کہیں کہ 'میں نہیں جانتا'۔\n\n" +
      context
        .map(
          (item, index) =>
            `📌 [حوالہ ${index + 1}] ${item.title || "عنوان"}:\n${
              item.content
            }\n`
        )
        .join("\n----------\n") +
      "\n\n";

    // ✅ Qwen کا سسٹم پرامپٹ — تمہارے control میں
    return `\
<|im_start|>system
آپ ایک مفتی ہیں جو صرف قرآن مجید اور صحیح احادیث کی روشنی میں جواب دیتے ہیں۔ اگر متعلقہ معلومات نہ ملیں تو کہیں: "میں نہیں جانتا"۔ اپنے دماغ سے کچھ نہ گھڑیں۔<|im_end|>
<|im_start|>user
${contextText}سوال: ${query}<|im_end|>
<|im_start|>assistant
`;
  }

  // ✨ جواب کو صاف ستھرا، اسلامی انداز میں پیش کریں
  cleanResponse(text) {
    if (!text) return "میں نہیں جانتا۔";

    // Prompt ke tags hatao
    text = text
      .replace(/<\|im_start\|>.*?<\|im_end\|>/gs, "")
      .replace(/<\|im_start\|>assistant/g, "")
      .replace(/<\|im_end\|>/g, "")
      .trim();

    // Extra spaces, newlines hatao
    text = text.replace(/\s+/g, " ");
    text = text.replace(/^[\s\W]+|[\s\W]+$/g, "");

    // Agar kuch meaningful na ho — block karo
    if (text.length < 10 || /sorry|don't know|not sure|unable/i.test(text)) {
      return "میں نے آپ کے دیے گئے قرآن و حدیث کے ذخیرے میں کوئی متعلقہ معلومات نہیں پائی۔";
    }

    // ✅ Islamic tone maintain karo — agar AI ne kuch modern/irrelevant likha ho to clean karo
    text = text
      .replace(/AI/g, "اسلامی ذخیرہ")
      .replace(/model/g, "علم")
      .replace(/I am an AI/gi, "میں ایک اسلامی معاون ہوں");

    return text;
  }
}

export const aiService = new AIService();
