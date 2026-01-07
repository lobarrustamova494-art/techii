import jwt from 'jsonwebtoken'

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  return jwt.sign(
    { userId },
    secret,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    } as jwt.SignOptions
  )
}

export const verifyToken = (token: string): { userId: string } => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string }
    
    return decoded
  } catch (error) {
    throw new Error('Invalid token')
  }
}