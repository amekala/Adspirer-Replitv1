// Type declaration file for Express
import { User as UserType } from '@shared/schema';

declare global {
  namespace Express {
    // Define User interface to extend the UserType
    interface User extends UserType {}
    
    // Augment the Request interface to include user property
    interface Request {
      user?: UserType;
    }
  }
}

// Empty export makes it a module
export {}; 