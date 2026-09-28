import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(express.json());

// Safe initialization (agar key na ho tab bhi server crash nahi hoga)
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

// Health check route
app.get('/', (req, res) => {
  res.send('KYRO WhatsApp AI Server is Running Live! 🚀');
});

// Meta Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// WhatsApp Messages Webhook
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object && body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
    const message = body.entry[0].changes[0].value.messages[0];
    const from = message.from;
    const userText = message.text?.body;

    if (userText) {
      const aiReply = await getAIResponse(userText);
      await sendWhatsAppMessage(from, aiReply);
    }
  }

  res.sendStatus(200);
});

// AI Response Logic
async function getAIResponse(userText) {
  if (!openai) {
    return 'Namaste! KYRO Service Hub mein swagat hai. Kripya apna vehicle model aur problem batayein.';
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are KYRO, a polite and smart vehicle service assistant in India.
- Reply naturally in the customer's language (Hinglish, Hindi, Telugu, or English).
- Collect details step by step: Vehicle model, Issue/Service required, Pickup or Drop, Time slot, and Area.
- Keep answers short, helpful, and under 3-4 lines.`
        },
        { role: 'user', content: userText }
      ],
      temperature: 0.5
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('AI Error:', error.message);
    return 'Namaste! KYRO mein connect karne ke liye shukriya. Hamari team aapse jald hi sampark karegi.';
  }
}

// WhatsApp Sender
async function sendWhatsAppMessage(to, text) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.log('WhatsApp credentials missing. Generated reply:', text);
    return;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('WhatsApp API Error:', error.response?.data || error.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
