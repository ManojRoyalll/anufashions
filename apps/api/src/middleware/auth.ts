import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as {
      id: string;
      email: string;
      role: string;
    };

    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
