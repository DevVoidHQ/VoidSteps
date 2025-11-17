import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper function to encode strings (replaces Buffer in Convex)
function encodeToken(data: string): string {
  // Using btoa for base64 encoding (available in Convex runtime)
  return btoa(data);
}

// Helper function to decode strings (replaces Buffer in Convex)
function decodeToken(token: string): string | null {
  try {
    return atob(token);
  } catch {
    return null;
  }
}

// Simple auth using environment variables (matching current backend)
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Get credentials from environment
    const validEmail = process.env.USER_EMAIL;
    const validPassword = process.env.USER_PASSWORD;

    if (!validEmail || !validPassword) {
      throw new Error("Server authentication not configured");
    }

    if (args.email !== validEmail || args.password !== validPassword) {
      throw new Error("Invalid credentials");
    }

    // In a real app, you would generate a session token here
    // For now, we'll just return success with user info
    return {
      success: true,
      user: { email: validEmail },
      // Note: In production, you'd want to use Convex Auth or implement proper session management
      token: encodeToken(`${validEmail}:${Date.now()}`),
    };
  },
});

export const verify = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Simple token verification (decode and check)
      const decoded = decodeToken(args.token);
      if (!decoded) {
        return { valid: false };
      }

      const [email] = decoded.split(":");

      if (email === process.env.USER_EMAIL) {
        return {
          valid: true,
          user: { email },
        };
      }

      return { valid: false };
    } catch (error) {
      return { valid: false };
    }
  },
});
