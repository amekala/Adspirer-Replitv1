import { Express, Request, Response, NextFunction } from "express";
import { Strategy as LocalStrategy, IStrategyOptionsWithRequest, VerifyFunctionWithRequest } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import passport from "passport";
import jwt from "jsonwebtoken";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema"; // Fixed import from schema instead of types
import { insertUserSchema } from "@shared/schema";

// JWT auth middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: Error | null, user: Express.User | false | null, info: any) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    
    // Add the user to the request object
    req.user = user;
    
    // Type assertion to access id property safely - now using User type from schema
    const typedUser = user as User;
    
    // Log authentication success for debugging
    console.log(`User authenticated: ${typedUser.id} (${typedUser.email})`);
    
    next();
  })(req, res, next);
};

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  const jwtSecret = process.env.SESSION_SECRET;

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true
      } as IStrategyOptionsWithRequest,
      (async (req: Request, email: string, password: string, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          }
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }) as VerifyFunctionWithRequest
    )
  );

  // JWT strategy for token authentication - supporting both header and cookie
  passport.use(
    new JwtStrategy({
      jwtFromRequest: (req) => {
        // First try to get the token from the Authorization header
        let token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
        
        // If no token in header, try to get it from cookies
        if (!token && req.cookies && req.cookies.jwt) {
          token = req.cookies.jwt;
        }
        
        // If no token in cookies either, check session
        if (!token && req.session && req.session.jwt) {
          token = req.session.jwt;
        }
        
        return token;
      },
      secretOrKey: jwtSecret,
    }, async (payload: any, done: (error: Error | null, user?: Express.User | false | null) => void) => {
      try {
        // Find the user by ID from the JWT payload
        const user = await storage.getUser(payload.id);
        if (!user) {
          return done(null, false);
        }
        
        // Check if token is expired
        const now = Date.now() / 1000;
        if (payload.exp && payload.exp < now) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    })
  );

  passport.initialize();

  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: result.error.message });
      }

      const existingUser = await storage.getUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        ...result.data,
        password: await hashPassword(result.data.password),
      });

      // Generate JWT token - properly typed
      const typedUser = user as User;
      const token = jwt.sign(
        { 
          id: typedUser.id, 
          email: typedUser.email,
          role: typedUser.role || 'user' // Default to 'user' if role is undefined
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Return user details and token
      const { password, ...userWithoutPassword } = user;
      res.status(201).json({ 
        user: userWithoutPassword,
        token 
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate('local', { session: false }, (err: Error | null, user: Express.User | false | null) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: 'Invalid email or password' });
      
      // Generate JWT token - properly typed for login
      const typedUser = user as User;
      const token = jwt.sign(
        { 
          id: typedUser.id, 
          email: typedUser.email,
          role: typedUser.role || 'user' // Default to 'user' if role is undefined
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Return user details and token
      const { password, ...userWithoutPassword } = user;
      return res.json({ 
        user: userWithoutPassword,
        token 
      });
    })(req, res, next);
  });

  // Simple logout endpoint (client should discard the token)
  app.post("/api/logout", (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
  });

  // Get current user endpoint (requires valid JWT)
  app.get("/api/user", authenticate, (req, res) => {
    // The user from the DB includes password, but our shared type doesn't
    // Using a type assertion to handle this
    const userWithPassword = req.user as (User & { password: string });
    const { password, ...userWithoutPassword } = userWithPassword;
    res.json(userWithoutPassword);
  });
}