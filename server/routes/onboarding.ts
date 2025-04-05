import { Request, Response } from "express";
import { db } from "../db";
import { authenticate } from "../auth";
import { 
  onboardingProgress, 
  businessCore, 
  brandIdentity, 
  productsServices, 
  creativeExamples, 
  performanceContext,
  insertOnboardingProgressSchema,
  insertBusinessCoreSchema,
  insertBrandIdentitySchema,
  insertProductsServicesSchema,
  insertCreativeExamplesSchema,
  insertPerformanceContextSchema,
  amazonTokens,
  googleTokens
} from "../../shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Helper function to get the user ID from the request
function getUserId(req: Request): string {
  // @ts-ignore: Property 'user' does exist on type 'Request'
  return req.user?.id || '';
}

export async function registerOnboardingRoutes(app: any) {
  // Get onboarding progress
  app.get("/api/onboarding/progress", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Get progress from database
      const progress = await db.query.onboardingProgress.findFirst({
        where: eq(onboardingProgress.userId, userId)
      });

      if (!progress) {
        // Create new progress entry if none exists
        const newProgress = await db.insert(onboardingProgress).values({
          userId,
          currentStep: 1,
          isComplete: false
        }).returning();

        return res.json({
          currentStep: 1,
          completed: false,
          steps: {}
        });
      }

      // Get completion status for each step
      const businessCoreData = await db.query.businessCore.findFirst({
        where: eq(businessCore.userId, userId)
      });
      
      const brandIdentityData = await db.query.brandIdentity.findFirst({
        where: eq(brandIdentity.userId, userId)
      });
      
      const productsServicesData = await db.query.productsServices.findFirst({
        where: eq(productsServices.userId, userId)
      });
      
      const creativeExamplesData = await db.query.creativeExamples.findFirst({
        where: eq(creativeExamples.userId, userId)
      });
      
      const performanceContextData = await db.query.performanceContext.findFirst({
        where: eq(performanceContext.userId, userId)
      });

      // Format response
      return res.json({
        currentStep: progress.currentStep,
        completed: progress.isComplete,
        steps: {
          1: {
            completed: !!businessCoreData,
            lastUpdated: businessCoreData?.updatedAt?.toISOString()
          },
          2: {
            completed: false, // Platform connections are tracked elsewhere
            lastUpdated: null
          },
          3: {
            completed: !!brandIdentityData,
            lastUpdated: brandIdentityData?.updatedAt?.toISOString()
          },
          4: {
            completed: !!productsServicesData,
            lastUpdated: productsServicesData?.updatedAt?.toISOString()
          },
          5: {
            completed: !!creativeExamplesData,
            lastUpdated: creativeExamplesData?.updatedAt?.toISOString()
          },
          6: {
            completed: !!performanceContextData,
            lastUpdated: performanceContextData?.updatedAt?.toISOString()
          }
        }
      });
    } catch (error) {
      console.error("Error fetching onboarding progress:", error);
      return res.status(500).json({ message: "Failed to fetch onboarding progress" });
    }
  });

  // Update onboarding progress
  app.post("/api/onboarding/progress", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const schema = z.object({
        currentStep: z.number().min(1).max(7),
        isComplete: z.boolean().optional()
      });

      const validatedData = schema.parse(req.body);

      // Update or create progress
      const existingProgress = await db.query.onboardingProgress.findFirst({
        where: eq(onboardingProgress.userId, userId)
      });

      if (existingProgress) {
        await db.update(onboardingProgress)
          .set({
            currentStep: validatedData.currentStep,
            isComplete: validatedData.isComplete !== undefined ? validatedData.isComplete : existingProgress.isComplete,
            lastUpdated: new Date()
          })
          .where(eq(onboardingProgress.userId, userId));
      } else {
        await db.insert(onboardingProgress).values({
          userId,
          currentStep: validatedData.currentStep,
          isComplete: validatedData.isComplete || false
        });
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error updating onboarding progress:", error);
      return res.status(500).json({ message: "Failed to update onboarding progress" });
    }
  });

  // Business Core
  app.post("/api/onboarding/business-core", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate the request body
      const validatedData = insertBusinessCoreSchema.parse(req.body);

      // Check if a record already exists
      const existingRecord = await db.query.businessCore.findFirst({
        where: eq(businessCore.userId, userId)
      });

      if (existingRecord) {
        // Update existing record
        await db.update(businessCore)
          .set({
            ...validatedData,
            updatedAt: new Date()
          })
          .where(eq(businessCore.userId, userId));
      } else {
        // Create new record
        await db.insert(businessCore).values({
          ...validatedData,
          userId
        });

        // Update progress if this is a new submission
        await updateProgress(userId, 2, false);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error saving business core data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to save business information" });
    }
  });

  // Platform Connections
  app.post("/api/onboarding/connect-platforms", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Platform connections are handled elsewhere,
      // this just updates the progress
      await updateProgress(userId, 3, false);

      return res.json({ success: true });
    } catch (error) {
      console.error("Error processing platform connections:", error);
      return res.status(500).json({ message: "Failed to process platform connections" });
    }
  });

  // Brand Identity
  app.post("/api/onboarding/brand-identity", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate the request body
      const validatedData = insertBrandIdentitySchema.parse(req.body);

      // Check if a record already exists
      const existingRecord = await db.query.brandIdentity.findFirst({
        where: eq(brandIdentity.userId, userId)
      });

      if (existingRecord) {
        // Update existing record
        await db.update(brandIdentity)
          .set({
            ...validatedData,
            updatedAt: new Date()
          })
          .where(eq(brandIdentity.userId, userId));
      } else {
        // Create new record
        await db.insert(brandIdentity).values({
          ...validatedData,
          userId
        });

        // Update progress if this is a new submission
        await updateProgress(userId, 4, false);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error saving brand identity data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to save brand identity information" });
    }
  });

  // Products and Services
  app.post("/api/onboarding/products-services", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate the request body
      const validatedData = insertProductsServicesSchema.parse(req.body);

      // Check if a record already exists
      const existingRecord = await db.query.productsServices.findFirst({
        where: eq(productsServices.userId, userId)
      });

      if (existingRecord) {
        // Update existing record
        await db.update(productsServices)
          .set({
            ...validatedData,
            updatedAt: new Date()
          })
          .where(eq(productsServices.userId, userId));
      } else {
        // Create new record
        await db.insert(productsServices).values({
          ...validatedData,
          userId
        });

        // Update progress if this is a new submission
        await updateProgress(userId, 5, false);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error saving products/services data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to save products and services information" });
    }
  });

  // Creative Examples
  app.post("/api/onboarding/creative-examples", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate the request body
      const validatedData = insertCreativeExamplesSchema.parse(req.body);

      // Check if a record already exists
      const existingRecord = await db.query.creativeExamples.findFirst({
        where: eq(creativeExamples.userId, userId)
      });

      if (existingRecord) {
        // Update existing record
        await db.update(creativeExamples)
          .set({
            ...validatedData,
            updatedAt: new Date()
          })
          .where(eq(creativeExamples.userId, userId));
      } else {
        // Create new record
        await db.insert(creativeExamples).values({
          ...validatedData,
          userId
        });

        // Update progress if this is a new submission
        await updateProgress(userId, 6, false);
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error saving creative examples data:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to save creative examples information" });
    }
  });

  // Performance Context
  app.post("/api/onboarding/performance-context", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Prepare data with the userId explicitly included
      const requestData = {
        ...req.body,
        userId, // Add userId to the request data
        keyMetrics: req.body.keyMetrics || ['conversions'] // Ensure keyMetrics exists
      };

      try {
        // Validate the request body
        const validatedData = insertPerformanceContextSchema.parse(requestData);

        // Check if a record already exists
        const existingRecord = await db.query.performanceContext.findFirst({
          where: eq(performanceContext.userId, userId)
        });

        if (existingRecord) {
          // Update existing record
          await db.update(performanceContext)
            .set({
              ...validatedData,
              updatedAt: new Date()
            })
            .where(eq(performanceContext.userId, userId));
        } else {
          // Create new record
          await db.insert(performanceContext).values({
            ...validatedData
            // userId is already included in validatedData
          });
        }

        // Mark onboarding as complete
        await updateProgress(userId, 7, true);

        return res.json({ success: true });
      } catch (validationError) {
        console.error("Error saving performance context data:", validationError);
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ message: "Validation error", errors: validationError.errors });
        }
        throw validationError; // Re-throw for the outer catch block
      }
    } catch (error) {
      console.error("Error in performance context endpoint:", error);
      return res.status(500).json({ message: "Failed to save performance context information" });
    }
  });

  // Add User data retrieval endpoints for settings page

  // Business Core data retrieval
  app.get("/api/user/business-core", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = await db.query.businessCore.findFirst({
        where: eq(businessCore.userId, userId)
      });

      return res.json(data);
    } catch (error) {
      console.error("Error fetching business core data:", error);
      return res.status(500).json({ message: "Failed to fetch business information" });
    }
  });

  // Brand Identity data retrieval
  app.get("/api/user/brand-identity", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = await db.query.brandIdentity.findFirst({
        where: eq(brandIdentity.userId, userId)
      });

      return res.json(data);
    } catch (error) {
      console.error("Error fetching brand identity data:", error);
      return res.status(500).json({ message: "Failed to fetch brand identity information" });
    }
  });

  // Products and Services data retrieval
  app.get("/api/user/products-services", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = await db.query.productsServices.findFirst({
        where: eq(productsServices.userId, userId)
      });

      return res.json(data);
    } catch (error) {
      console.error("Error fetching products/services data:", error);
      return res.status(500).json({ message: "Failed to fetch products and services information" });
    }
  });

  // Creative Examples data retrieval
  app.get("/api/user/creative-examples", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = await db.query.creativeExamples.findFirst({
        where: eq(creativeExamples.userId, userId)
      });

      return res.json(data);
    } catch (error) {
      console.error("Error fetching creative examples data:", error);
      return res.status(500).json({ message: "Failed to fetch creative examples information" });
    }
  });

  // Performance Context data retrieval
  app.get("/api/user/performance-context", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const data = await db.query.performanceContext.findFirst({
        where: eq(performanceContext.userId, userId)
      });

      return res.json(data);
    } catch (error) {
      console.error("Error fetching performance context data:", error);
      return res.status(500).json({ message: "Failed to fetch performance context information" });
    }
  });

  // Get Connected Platforms
  app.get("/api/user/connected-platforms", authenticate, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Check for Amazon connections
      const amazonConnections = await db.query.amazonTokens.findFirst({
        where: eq(amazonTokens.userId, userId)
      });

      // Check for Google connections
      const googleConnections = await db.query.googleTokens.findFirst({
        where: eq(googleTokens.userId, userId)
      });

      // Return connected platforms status
      return res.json({
        amazon: !!amazonConnections,
        google: !!googleConnections,
        facebook: false,
        instagram: false,
        tiktok: false,
        pinterest: false,
        snapchat: false,
        platformPreferences: {
          mainPlatforms: [],
          secondaryPlatforms: []
        }
      });
    } catch (error) {
      console.error("Error fetching connected platforms:", error);
      return res.status(500).json({ message: "Failed to fetch connected platforms" });
    }
  });
}

// Helper function to update onboarding progress
async function updateProgress(userId: string, currentStep: number, isComplete: boolean) {
  try {
    const existingProgress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId)
    });

    if (existingProgress) {
      await db.update(onboardingProgress)
        .set({
          currentStep,
          isComplete,
          lastUpdated: new Date()
        })
        .where(eq(onboardingProgress.userId, userId));
    } else {
      await db.insert(onboardingProgress).values({
        userId,
        currentStep,
        isComplete
      });
    }
  } catch (error) {
    console.error("Error updating onboarding progress:", error);
    throw error;
  }
}