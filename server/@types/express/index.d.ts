// Type declaration file for Express
import { User as SelectUser } from '@shared/schema';

declare global {
  namespace Express {
    // Define User interface to extend the SelectUser type
    interface User extends SelectUser {}
    
    // Augment the Request interface to include user property
    interface Request {
      user?: User;
    }
  }
}

// Empty export makes it a module
export {}; 