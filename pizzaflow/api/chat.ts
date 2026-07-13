import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const SYSTEM_PROMPT = `
You are the PizzaFlow customer support assistant.

You must answer only questions related to:
- PizzaFlow menu
- pizza bases
- pizzas
- toppings
- prices
- quantities
- discounts
- GST
- payment methods
- order support

PizzaFlow business rules:
- Quantity must be between 1 and 10.
- A 10% discount applies when quantity is 5 or more.
- GST is 18% and is calculated after the discount.
- Payment modes are Cash, Card, and UPI.
- Never ask for card numbers, UPI PINs, OTPs, passwords, or sensitive credentials.
- Do not claim that an order was submitted unless the application confirms it.
- For unrelated questions, politely say you can only assist with PizzaFlow orders and menu questions.

Menu:

Bases:
- Thin Crust: ₹50
- Cheese Burst: ₹90
- Pan Base: ₹70

Pizzas:
- Margherita: ₹150
- Farmhouse: ₹220
- Paneer Pizza: ₹250

Toppings:
- Extra Cheese: ₹40
- Olives: ₹30
- Jalapeno: ₹35

Unit price is:
base price + pizza price + topping price.
`;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    if (message.trim().length > 500) {
      return res.status(400).json({
        success: false,
        error: "Message must be 500 characters or fewer",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${SYSTEM_PROMPT}\n\nCustomer question: ${message.trim()}`,
    });

    const reply =
      response.text ||
      "Sorry, I could not generate a response. Please try again.";

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey && sessionId) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase.from("pizzaflow_chat_messages").insert([
        {
          session_id: sessionId,
          sender: "USER",
          message: message.trim(),
        },
        {
          session_id: sessionId,
          sender: "ASSISTANT",
          message: reply,
        },
      ]);
    }

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Chat service failed",
    });
  }
}
