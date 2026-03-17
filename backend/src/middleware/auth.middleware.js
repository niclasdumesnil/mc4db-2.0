const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only_please_change';

/**
 * Middleware to verify that a valid JWT is provided in the Authorization header.
 * Adds the decoded user payload to `req.user`.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Contains { id, login, name, is_admin, is_supporter, etc. }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
}

/**
 * Middleware to verify that the authenticated user has admin privileges.
 * Must be used AFTER requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin privileges required' });
  }
  next();
}

/**
 * Helper to generate a token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      login: user.login || user.username, 
      is_admin: !!user.is_admin,
      is_supporter: !!user.donation 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = {
  requireAuth,
  requireAdmin,
  generateToken,
};
