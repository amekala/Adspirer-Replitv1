import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tag, Target, Calendar, DollarSign, Package, KeyRound, Ban } from "lucide-react";

interface CampaignInfo {
  campaignName?: string;
  dailyBudget?: number;
  startDate?: string;
  endDate?: string;
  targetingType?: string;
  adGroupName?: string;
  defaultBid?: number;
  asins?: string[];
  skus?: string[];
  keywords?: string[];
  matchType?: string;
  negativeKeywords?: string[];
  biddingStrategy?: string;
  state?: string;
  step?: number;
}

interface Props {
  campaignData: CampaignInfo;
}

export const CampaignCreationCard: React.FC<Props> = ({ campaignData }) => {
  // Function to determine completion percentage
  const getCompletionPercentage = () => {
    if (!campaignData.step) return 0;
    // Total of 12 steps in the campaign creation process
    return Math.min(Math.round((campaignData.step / 12) * 100), 100);
  };

  // Get the completion percentage
  const completionPercentage = getCompletionPercentage();

  return (
    <Card className="w-full border border-blue-200 dark:border-blue-800 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-blue-800 dark:text-blue-300">
            Campaign {campaignData.campaignName ? `"${campaignData.campaignName}"` : 'Creation'}
          </CardTitle>
          {campaignData.state && (
            <Badge 
              variant={campaignData.state === 'enabled' ? 'default' : 'secondary'}
              className={campaignData.state === 'enabled' ? 'bg-green-500' : ''}
            >
              {campaignData.state}
            </Badge>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 dark:bg-gray-700">
          <div 
            className="bg-blue-600 h-2.5 rounded-full dark:bg-blue-500" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
          {completionPercentage}% Complete
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3 pt-4">
        {/* Display campaign information as it gets collected */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {campaignData.campaignName && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Name:</span>
              <span className="text-sm">{campaignData.campaignName}</span>
            </div>
          )}
          
          {campaignData.dailyBudget && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Budget:</span>
              <span className="text-sm">${campaignData.dailyBudget}/day</span>
            </div>
          )}
          
          {campaignData.startDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Start Date:</span>
              <span className="text-sm">{campaignData.startDate}</span>
            </div>
          )}
          
          {campaignData.targetingType && (
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Targeting:</span>
              <span className="text-sm capitalize">{campaignData.targetingType}</span>
            </div>
          )}
          
          {campaignData.adGroupName && (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Ad Group:</span>
              <span className="text-sm">{campaignData.adGroupName}</span>
            </div>
          )}
          
          {campaignData.defaultBid && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Default Bid:</span>
              <span className="text-sm">${campaignData.defaultBid}</span>
            </div>
          )}
        </div>
        
        {/* Products */}
        {(campaignData.asins || campaignData.skus) && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-cyan-500" />
              <span className="text-sm font-medium">Products:</span>
            </div>
            <div className="flex flex-wrap gap-1 ml-6">
              {campaignData.asins?.map((asin, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {asin}
                </Badge>
              ))}
              {campaignData.skus?.map((sku, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {sku}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Keywords */}
        {campaignData.keywords && campaignData.keywords.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <KeyRound className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Keywords:</span>
              {campaignData.matchType && (
                <Badge variant="secondary" className="text-xs">
                  {campaignData.matchType} match
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1 ml-6">
              {campaignData.keywords.map((keyword, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Negative Keywords */}
        {campaignData.negativeKeywords && campaignData.negativeKeywords.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <Ban className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Negative Keywords:</span>
            </div>
            <div className="flex flex-wrap gap-1 ml-6">
              {campaignData.negativeKeywords.map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  {keyword}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Bidding Strategy */}
        {campaignData.biddingStrategy && (
          <div className="flex items-center gap-2 mt-3">
            <DollarSign className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Bidding Strategy:</span>
            <span className="text-sm">
              {campaignData.biddingStrategy === 'autoForSales' && 'Dynamic bids - down only'}
              {campaignData.biddingStrategy === 'autoForConversions' && 'Dynamic bids - up and down'}
              {campaignData.biddingStrategy === 'fixed' && 'Fixed bids'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignCreationCard; 