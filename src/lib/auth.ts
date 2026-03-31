import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      email: string;
      role: UserRole;
      displayName: string;
      badgeNumber: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: UserRole;
    displayName: string;
    badgeNumber: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: UserRole;
    displayName: string;
    badgeNumber: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours

  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) return null;

        // Check if account is locked due to failed login attempts
        if (
          user.failedLoginAttempts >= 5 &&
          user.lockedUntil &&
          user.lockedUntil > new Date()
        ) {
          return null;
        }

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) {
          const newAttempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              ...(newAttempts >= 5 && {
                lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
              }),
            },
          });
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        });

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          displayName: `${user.firstName} ${user.lastName}`,
          badgeNumber: user.id.slice(0, 8).toUpperCase(),
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.displayName = user.displayName;
        token.badgeNumber = user.badgeNumber;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        userId: token.userId,
        email: token.email!,
        role: token.role,
        displayName: token.displayName,
        badgeNumber: token.badgeNumber,
      };
      return session;
    },
  },
};
