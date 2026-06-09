import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config";
import { prisma } from "../lib/prisma";

export const authRouter = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const body = authSchema.extend({ name: z.string().min(2) }).parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });

    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash
      }
    });

    return res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const body = authSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      config.jwtSecret,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
});
