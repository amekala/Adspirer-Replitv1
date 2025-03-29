/**
 * Quick test script to manually check campaign creation with typo
 */

import { detectCampaignCreationIntent } from './server/services/openai.js';

// Test strings with campaign typos
const testStrings = [
  'I want to create a camoaign',
  'I need to set up a campaing',
  'help me make a new campain',
  'build a camapign for me',
  'start a campiagn',
  'run a campaign'
];

// Test each string
console.log('Testing campaign creation intent detection with typos:');
console.log('==================================================');

testStrings.forEach(testString => {
  const result = detectCampaignCreationIntent(testString);
  console.log(`"${testString}" => ${result ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
}); 