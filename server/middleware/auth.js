import jwt from 'jsonwebtoken'
import moongoose from 'mongoose'
import { config } from '../config/index.js'
import User from '../models/User.js'

function tokenFromHeader(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim()
}

function extractUser(req) {
  const token = tokenFromHeader(req)
  if (!token) return null
  try {
    const payload = jwt.verify(token, config.jwtSecret)
    if (!payload || !payload.sub) return null
    return payload.sub
  } catch {
    return null
  }
}

// Attach the authenticated user to req.user (404s if the token user is gone).
export async function authRequired(req, res, next) {
  const userId = extractUser(req)
  if (!userId) return res.status(401).json({ error: 'Authentication required.' })
  const user = await User.findById(userId)
  if (!user) return res.status(401).json({ error: 'Session user no longer exists.' })
  req.user = user
  next()
}

// Best-effort auth: attach req.user when a valid token is present, otherwise continue.
export async function optionalAuth(req, _res, next) {
  const userId = extractUser(req)
  if (userId && moongoose.isValidObjectId(userId)) {
    req.user = await User.findById(userId).catch(() => null)
  }
  next()
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' })
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden: insufficient permissions.' })
    next()
  }
}

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, { expiresIn: '7d' })
}