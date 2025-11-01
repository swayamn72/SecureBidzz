// backend/middleware/verifyToken.js
import { verifyToken } from '../utils/jwt.js';

/**
 * verifyToken middleware:
 * - expects Authorization: Bearer <JWT_TOKEN>
 * - verifies the JWT token and attaches `req.user = decodedToken`
 */
export default async function verifyTokenMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer\s+(.+)$/);
    if (!match) return res.status(401).json({ error: "No token provided" });

    const token = match[1];
    const decoded = verifyToken(token);

    // attach decoded token (id, email, etc.) to req.user
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token verify failed:", err);
    return res.status(401).json({ error: "Unauthorized: " + err.message });
  }
}
