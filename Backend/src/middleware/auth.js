import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_local_jwt_key_123";

/**
 * Middleware to verify JWT token from Authorization header
 */
export const authenticateToken = (req, res, next) => {
  // Get token from "Authorization: Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No authentication token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId; // Attach the user ID to the request
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};
