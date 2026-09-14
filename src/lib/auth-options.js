import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export const authOptions = {
  secret: process.env.AUTH_SECRET || "dev-only-secret-change-me",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const schema = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        });

        const parsed = schema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({ email: parsed.data.email.toLowerCase() })
          .lean()
          .exec();

        if (!user) {
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || "";
        session.user.role = token.role || "customer";
      }
      return session;
    },
  },
};
