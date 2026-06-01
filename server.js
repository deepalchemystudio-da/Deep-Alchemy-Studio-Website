const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");
const rateLimit = require("express-rate-limit");
let GoogleGenAI;
try {
  GoogleGenAI = require("@google/genai").GoogleGenAI;
} catch (err) {
  console.log("Could not require @google/genai. It might not be installed yet.");
}

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini LLM
// Warning: GEMINI_API_KEY must be in the environment to work with the LLM API.
let ai;
if (GoogleGenAI && process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
  console.log("GEMINI_API_KEY not found in environment. Chatbot will fall back to rule-based logic.");
}

const LEADS_FILE = path.join(__dirname, "leads.json");

app.post("/send", async (req, res) => {
  const { name, email, message, plan } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  // 1. Send Notification Email to Agency
  const appPassword = process.env.GMAIL_APP_PASSWORD || "your_app_password";
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "deepalchemystudio@gmail.com",
      pass: appPassword
    }
  });

  try {
    if (appPassword !== "your_app_password") {
      // Notify Agency
      await transporter.sendMail({
        from: `"Lead Alert" <${email}>`,
        to: "deepalchemystudio@gmail.com",
        subject: "🚀 New Lead Received - Deep Alchemy Studio",
        text: `New Lead Details:\n\nName: ${name}\nEmail: ${email}\nPlan: ${plan || "Not Selected"}\nMessage: ${message}`
      });

      // Auto-reply to User
      await transporter.sendMail({
        from: `"Deep Alchemy Studio" <deepalchemystudio@gmail.com>`,
        to: email,
        subject: "Thanks for contacting Deep Alchemy Studio!",
        text: `Hi ${name},\n\nThank you for reaching out to us. We have received your message and our team will get back to you within 24 hours.\n\nSummary of your request:\nPlan: ${plan || "Custom"}\nMessage: ${message}\n\nTalk soon,\nThe Deep Alchemy Team`
      });
    } else {
      console.log("\n--- MOCK EMAIL SENT ---");
      console.log("To send REAL emails, configure GMAIL_APP_PASSWORD.");
      console.log({ name, email, message, plan });
      console.log("-----------------------\n");
    }

    // 2. Save Lead to JSON with Enhanced Structu    // 2. Save Lead to JSON with Enhanced Structure
    const calculateScore = (plan, message) => {
      let score = 50; // Base score
      if (plan === 'Growth') score += 20;
      if (plan === 'Premium') score += 40;
      if (message.length > 100) score += 10;
      return Math.min(score, 100);
    };

    const newLead = { 
      id: Date.now().toString(), 
      name, 
      email, 
      message, 
      plan: plan || "Not Selected",
      score: calculateScore(plan, message),
      date: new Date().toLocaleString(), 
      status: "new" 
    };
    
    let leads = [];
    try {
      const data = await fs.readFile(LEADS_FILE, "utf8");
      leads = JSON.parse(data);
    } catch (err) {}
    
    leads.push(newLead);
    await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));

    res.json({ success: true, message: "Message sent and lead stored.", score: newLead.score });
  } catch (error) {
    console.error("Error processing lead:", error);
    res.status(500).json({ success: false, error: "Failed to process message." });
  }
});

// Chat Storage Endpoint
const CHATS_FILE = path.join(__dirname, "chats.json");
app.post("/save-chat", async (req, res) => {
  const { leadId, transcript } = req.body;
  try {
    let chats = {};
    try {
      const data = await fs.readFile(CHATS_FILE, "utf8");
      chats = JSON.parse(data);
    } catch (err) {}
    
    chats[leadId || Date.now()] = {
      date: new Date().toLocaleString(),
      transcript
    };
    
    await fs.writeFile(CHATS_FILE, JSON.stringify(chats, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save chat." });
  }
});

// Rate Limiting for Chat API to prevent spam
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  message: { error: "Too many requests, please try again later." }
});

app.post("/chat", chatLimiter, async (req, res) => {
  const { message, context } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Valid message required" });
  }

  const cleanMessage = message.trim().substring(0, 500);

  const generateFallbackResponse = (msg) => {
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes("price") || lowerMsg.includes("cost") || lowerMsg.includes("plan")) {
      return "We offer three premium plans: Starter (₹10,000), Growth (₹14,000), and Premium (₹22,000). Which one aligns with your goals?";
    } else if (lowerMsg.includes("service") || lowerMsg.includes("offer") || lowerMsg.includes("do you")) {
      return "We specialize in Web Design & Development, AI Integration, and cinematic digital experiences. How can we elevate your brand today?";
    } else if (lowerMsg.includes("process") || lowerMsg.includes("step") || lowerMsg.includes("work")) {
      return "Our process includes Discovery, Strategy, Design, and Development. It usually takes 2–4 weeks for a premium build.";
    }
    return "That's interesting! Tell me more about your business goals, and I can suggest the perfect alchemical solution.";
  };

  try {
    if (!ai) {
      return res.json({ reply: generateFallbackResponse(cleanMessage) });
    }

    const systemPrompt = `You are a Senior Sales Consultant for Deep Alchemy Studio.
Your goal is to qualify leads and provide expert advice on web development, design, and SEO.

Context from previous conversation: ${JSON.stringify(context || {})}

Rules:
1. Be professional, confident, and persuasive.
2. If the user mentions a budget or timeline, acknowledge it.
3. Guide the user toward the Growth or Premium plans if they need SEO or custom features.
4. Keep replies under 4 lines.

User: "${cleanMessage}"`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt
    });

    if (response && response.text) {
      res.json({ reply: response.text.trim() });
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error) {
    res.json({ reply: generateFallbackResponse(cleanMessage) });
  }
});

// Admin Authentication Middleware (Simple)
const ADMIN_PASSWORD = "alchemy2026";
const authAdmin = (req, res, next) => {
  const password = req.headers['x-admin-password'];
  if (password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// CRM Dashboard Endpoints
app.get("/leads", authAdmin, async (req, res) => {
  try {
    const data = await fs.readFile(LEADS_FILE, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.json([]);
  }
});

app.get("/chats", authAdmin, async (req, res) => {
  try {
    const data = await fs.readFile(CHATS_FILE, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.json({});
  }
});

app.put("/lead/:id", authAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const data = await fs.readFile(LEADS_FILE, "utf8");
    let leads = JSON.parse(data);
    const index = leads.findIndex(l => l.id === id);
    if (index !== -1) {
      leads[index].status = status;
      await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Lead not found" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to update lead" });
  }
});

app.delete("/lead/:id", authAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const data = await fs.readFile(LEADS_FILE, "utf8");
    let leads = JSON.parse(data);
    leads = leads.filter(l => l.id !== id);
    await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete lead" });
  }
});

// Admin Login Endpoint
app.post("/admin-login", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Invalid password" });
  }
});

// Check for "new" leads count for notification indicator
app.get("/leads/new-count", async (req, res) => {
  try {
    const data = await fs.readFile(LEADS_FILE, "utf8");
    const leads = JSON.parse(data);
    const newCount = leads.filter(l => l.status === 'new').length;
    res.json({ count: newCount });
  } catch (err) {
    res.json({ count: 0 });
  }
});

app.listen(5000, () => console.log("Server running on port 5000"));
port 5000"));