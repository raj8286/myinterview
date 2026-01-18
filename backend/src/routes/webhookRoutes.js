import express from "express";
import { Webhook } from "svix";
import User from "../models/User.js";
import { upsertStreamUser, deleteStreamUser } from "../lib/stream.js";
import { ENV } from "../lib/env.js";

const router = express.Router();

// Clerk webhook endpoint - needs raw body for signature verification
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const WEBHOOK_SECRET = ENV.CLERK_WEBHOOK_SECRET;

    // Get the headers
    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    // If no headers, it's not from Clerk
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("❌ Missing svix headers");
      return res.status(400).json({ error: "Missing svix headers" });
    }

    // If no webhook secret configured
    if (!WEBHOOK_SECRET) {
      console.error("❌ CLERK_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    let payload;

    // Verify the webhook signature
    try {
      const wh = new Webhook(WEBHOOK_SECRET);
      payload = wh.verify(req.body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("❌ Webhook verification failed:", err.message);
      return res.status(400).json({ error: "Webhook verification failed" });
    }

    // Handle the event
    const { type, data } = payload;
    console.log("📨 Received Clerk webhook:", type);

    try {
      switch (type) {
        case "user.created": {
          const { id, email_addresses, first_name, last_name, image_url } = data;

          console.log("📥 Creating user:", id);

          const newUser = await User.create({
            clerkId: id,
            email: email_addresses[0]?.email_address,
            name: `${first_name || ""} ${last_name || ""}`.trim() || "User",
            profileImage: image_url || "",
          });

          // Also create user in Stream
          await upsertStreamUser({
            id: newUser.clerkId,
            name: newUser.name,
            image: newUser.profileImage,
          });

          console.log("✅ User created:", newUser.email);
          break;
        }

        case "user.deleted": {
          console.log("🗑️ Deleting user:", data.id);
          await User.deleteOne({ clerkId: data.id });
          await deleteStreamUser(data.id);
          console.log("✅ User deleted:", data.id);
          break;
        }

        default:
          console.log("ℹ️ Unhandled event type:", type);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("❌ Webhook handler error:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
