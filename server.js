// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 載入 .env（OPENAI_API_KEY 等）
dotenv.config();

const app = express();

// 如你想限制只有 Google Sites 才可以 call，可以改成：
// app.use(cors({ origin: "https://sites.google.com" }));
app.use(cors());
app.use(express.json());

// ---------- OpenAI 客戶端設定 ----------
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️ 未設定 OPENAI_API_KEY，請在 Render / 本機 .env 設定。");
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- 計算目前檔案所在路徑（ESM 用法） ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- 載入參考資料庫 ww1_knowledge.txt ----------
const knowledgePath = path.join(__dirname, "ww1_knowledge.txt");
let knowledgeBase = "";

try {
  knowledgeBase = fs.readFileSync(knowledgePath, "utf8");
  console.log("✅ 知識庫載入成功，長度（字元數）：", knowledgeBase.length);
} catch (err) {
  console.error("❌ 無法載入 ww1_knowledge.txt：", err.message);
  knowledgeBase =
    "（警告：知識庫讀取失敗，請檢查 ww1_knowledge.txt 是否存在，以及部署時是否有一併上載。）";
}

// ---------- 健康檢查路由（方便用瀏覽器直接測試） ----------
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    message:
      "WW1 AI backend 正常運行中。請用 POST /api/ask 並提供 JSON：{ question: \"你的問題\" }。",
  });
});

// ---------- 主要 AI 問答 API ----------
app.post("/api/ask", async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({
      error: "缺少 question 欄位，或 question 不是字串。",
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "伺服器未設定 OPENAI_API_KEY。",
    });
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // 如有需要可改為你帳戶有的模型，例如 "gpt-4o-mini"
      messages: [
        {
          role: "system",
          content:
            "你是一位香港初中世界歷史科老師，專門講解第一次世界大戰。" +
            "你只能根據『知識庫』內容作答；若資料不足，要坦白說明，並可以合理推論，但要清楚標明「這部份屬於推論」。" +
            "如何繁體中文提問，便用回答請用繁體中文，語氣清楚、段落分明，適合初中學生理解。",
        },
        {
          role: "user",
          content:
            "以下是你可用的知識庫內容（節錄自教材）：\n\n" +
            knowledgeBase +
            "\n\n現在請根據上述知識庫，回答這條問題：\n\n" +
            question +
            "\n\n回答要求：\n1. 先用 1–2 句直接回答問題。\n2. 再用 1–3 段簡單解釋原因或背景。\n3. 如內容涉及推論，請在句子中標示「根據推論」。",
        },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "抱歉，未能取得回答內容。";

    res.json({ answer });
  } catch (err) {
    console.error("❌ OpenAI API 錯誤：", err.response?.data || err.message);
    res.status(500).json({
      error: "伺服器在呼叫 OpenAI API 時出現錯誤，請稍後再試。",
    });
  }
});

// ---------- 啟動伺服器 ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WW1 AI backend 正在執行，port: ${PORT}`);
});
