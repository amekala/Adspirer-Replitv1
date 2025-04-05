/**
 * Onboarding Component Verification Script
 * 
 * This script:
 * 1. Verifies if all required onboarding components exist
 * 2. Checks for any missing implementations in the components
 * 3. Reports issues that need to be fixed
 * 
 * Run with: node verify-onboarding-forms.js
 */

import fs from 'fs';
import path from 'path';

const CLIENT_DIR = './client/src';
const COMPONENT_DIR = path.join(CLIENT_DIR, 'components/onboarding');
const PAGES_DIR = path.join(CLIENT_DIR, 'pages');

// Define expected onboarding steps and their files
const expectedComponents = [
  { 
    name: 'Business Core', 
    step: 1, 
    component: 'step1-business-core.tsx',
    expectedProps: ['onNext', 'onPrevious', 'onSkip'],
    required: true
  },
  { 
    name: 'Connect Platforms', 
    step: 2, 
    component: 'step2-connect-platforms.tsx',
    expectedProps: ['onNext', 'onPrevious', 'onSkip'],
    required: true
  },
  { 
    name: 'Brand Identity', 
    step: 3, 
    component: 'step3-brand-identity.tsx',
    expectedProps: ['onNext', 'onPrevious', 'onSkip'],
    required: true
  },
  { 
    name: 'Products Services', 
    step: 4, 
    component: 'step4-products-services.tsx',
    expectedProps: ['onNext', 'onPrevious', 'onSkip'],
    required: true
  },
  { 
    name: 'Creative Examples', 
    step: 5, 
    component: 'step5-creative-examples.tsx',
    expectedProps: ['onNext', 'onPrevious', 'onSkip'],
    required: true
  },
  { 
    name: 'Performance Context', 
    step: 6, 
    component: 'step6-performance-context.tsx',
    expectedProps: ['onNext', 'onPrevious', 'onSkip'],
    required: true
  }
];

// Required files
const requiredFiles = [
  {
    path: path.join(COMPONENT_DIR, 'onboarding-wizard.tsx'),
    description: 'Main onboarding wizard component that manages steps'
  },
  {
    path: path.join(COMPONENT_DIR, 'onboarding-flow.tsx'),
    description: 'Onboarding flow controller'
  },
  {
    path: path.join(PAGES_DIR, 'onboarding.tsx'),
    description: 'Onboarding page'
  }
];

// Check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return false;
  }
}

// Read a file's content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return '';
  }
}

// Check if component imports exist in the onboarding flow
function checkComponentImports(flowContent) {
  const missingImports = [];
  
  for (const component of expectedComponents) {
    const importName = component.component
      .replace('.tsx', '')
      .split('-')
      .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    
    // Check if the component is imported
    if (!flowContent.includes(`import ${importName}`) && !flowContent.includes(`'${component.component}'`)) {
      missingImports.push({
        name: component.name,
        expectedImport: `import ${importName} from './${component.component.replace('.tsx', '')}';`
      });
    }
  }
  
  return missingImports;
}

// Check if switch statement in onboarding flow covers all steps
function checkFlowStepHandling(flowContent) {
  const missingSteps = [];
  
  for (const component of expectedComponents) {
    // Convert step name to component name format
    const componentName = component.name.replace(/\s+/g, '') + 'Step';
    
    // Check if the step is used in a case statement
    if (!flowContent.includes(`case OnboardingStep.${component.name.replace(/\s+/g, '')}:`) && 
        !flowContent.includes(`<${componentName}`)) {
      missingSteps.push({
        step: component.step,
        name: component.name,
        expectedCase: `case OnboardingStep.${component.name.replace(/\s+/g, '')}:\n  content = <${componentName} onNext={goToNextStep} onPrevious={goToPreviousStep} onSkip={skipStep} />;`
      });
    }
  }
  
  return missingSteps;
}

// Main verification function
async function verifyOnboardingComponents() {
  console.log('=== Verifying Onboarding Components ===\n');
  
  let hasIssues = false;
  
  // Check required files exist
  console.log('Checking required files:');
  for (const file of requiredFiles) {
    const exists = fileExists(file.path);
    console.log(`- ${file.path}: ${exists ? '✓ Found' : '✗ Missing'}`);
    
    if (!exists) {
      hasIssues = true;
      console.log(`  This file is required: ${file.description}`);
    }
  }
  console.log();
  
  // Check component files exist
  console.log('Checking step component files:');
  const missingComponents = [];
  for (const component of expectedComponents) {
    const componentPath = path.join(COMPONENT_DIR, component.component);
    const exists = fileExists(componentPath);
    console.log(`- Step ${component.step} (${component.name}): ${exists ? '✓ Found' : '✗ Missing'}`);
    
    if (!exists && component.required) {
      hasIssues = true;
      missingComponents.push(component);
    }
  }
  console.log();
  
  // Check flow file for imports and step handling if it exists
  const flowPath = path.join(COMPONENT_DIR, 'onboarding-flow.tsx');
  if (fileExists(flowPath)) {
    const flowContent = readFile(flowPath);
    
    // Check imports
    const missingImports = checkComponentImports(flowContent);
    if (missingImports.length > 0) {
      hasIssues = true;
      console.log('Missing component imports in onboarding-flow.tsx:');
      for (const missing of missingImports) {
        console.log(`- ${missing.name}: Add "${missing.expectedImport}"`);
      }
      console.log();
    }
    
    // Check step handling
    const missingSteps = checkFlowStepHandling(flowContent);
    if (missingSteps.length > 0) {
      hasIssues = true;
      console.log('Missing step handling in onboarding-flow.tsx:');
      for (const missing of missingSteps) {
        console.log(`- Step ${missing.step} (${missing.name}) not handled in switch statement`);
      }
      console.log();
    }
  }
  
  // Summary and recommendations
  console.log('=== Summary ===');
  if (hasIssues) {
    console.log('Issues were found with the onboarding components.\n');
    
    if (missingComponents.length > 0) {
      console.log('Missing required components:');
      for (const component of missingComponents) {
        console.log(`- Create ${component.component} for Step ${component.step} (${component.name})`);
      }
      console.log();
    }
    
    console.log('Recommendation:');
    console.log('1. Implement missing step components');
    console.log('2. Update onboarding-flow.tsx to import and use all step components');
    console.log('3. Ensure each component accepts and uses onNext, onPrevious, and onSkip props');
  } else {
    console.log('All onboarding components appear to be properly set up. ✓');
  }
}

// Run verification
verifyOnboardingComponents().catch(error => {
  console.error('Unhandled error in verification:', error);
});