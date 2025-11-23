import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 你可以把 PDF 一戰遠因內容貼到這裡
const knowledgeBase = `
（在這裡貼入你的教材內容，例如從 PDF 複製的「一戰遠因」章節）
`;

app.post("/api/ask", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "缺少 question。" });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位香港初中世界歷史科老師，專門講解第一次世界大戰的遠因。" +
            "你只能根據『知識庫』內容回答；不足部分可以推論，但要說明是推論。",
        },
        {
          role: "user",
          content:
            "以下是知識庫內容：\n\n" +
            knowledgeBase +
            "\n\n請用繁體中文回答這條問題：" +
            question,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "未能取得回答。";
    res.json({ answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI API 錯誤。" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WW1 AI backend running on port ${PORT}`);
});
