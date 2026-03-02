import jwt from "jsonwebtoken"

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    return res.status(401).json({ error: "Token não enviado" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" })
  }
}