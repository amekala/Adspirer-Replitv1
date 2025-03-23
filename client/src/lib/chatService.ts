import { queryClient, apiRequest } from "./queryClient";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Format the conversation response from the server
 * Handles different response formats: direct list, conversation+messages nested structure, etc.
 */
export function formatConversationResponse(data: any): {
  conversation: Conversation;
  messages: Message[];
} {
  console.log("Formatting conversation response:", data);
  
  // If we have the standard response format with conversation and messages
  if (data && data.conversation && Array.isArray(data.messages)) {
    console.log(`Found ${data.messages.length} messages for conversation ${data.conversation.id}`);
    return {
      conversation: data.conversation,
      messages: data.messages
    };
  }
  
  // If we have just a conversation object with id but no messages
  if (data && data.id && !Array.isArray(data)) {
    console.log(`Found conversation ${data.id} but no messages`);
    return {
      conversation: data,
      messages: []
    };
  }
  
  // Special case: if we're looking at the conversations list array for a specific conversation
  if (Array.isArray(data)) {
    // CRITICAL FIX: Check if this is an array with a nested messages array 
    // This is the structure causing the display issue
    if (data.messages && Array.isArray(data.messages)) {
      console.log(`Found array with nested messages array (${data.messages.length} messages)`);
      
      // Use the first item in the array as the conversation if it has an ID
      let conversation = null;
      for (const item of data) {
        if (item && item.id && typeof item.id === 'string' && item.title) {
          conversation = item;
          break;
        }
      }
      
      // If no conversation was found in the array, try to extract from URL
      if (!conversation) {
        const conversationId = window.location.pathname.split('/').pop();
        // Create a minimal conversation object with the ID from the URL
        conversation = {
          id: conversationId || "unknown",
          title: "Conversation",
          userId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      return {
        conversation: conversation,
        messages: data.messages
      };
    }
    
    // Check if this array contains messages directly (role, content properties)
    if (data.length > 0 && 
        (data[0].role === 'user' || data[0].role === 'assistant' || data[0].role === 'system')) {
      console.log(`Found array of messages (${data.length} items)`);
      
      // Extract conversation ID from URL
      const conversationId = window.location.pathname.split('/').pop();
      
      // Try to get conversation info from cache
      const existingData = queryClient.getQueryData([
        "/api/chat/conversations", 
        conversationId, 
        "specific"
      ]);
      
      let conversation = {
        id: conversationId || "unknown",
        title: "Conversation",
        userId: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (existingData && existingData.conversation) {
        conversation = existingData.conversation;
      }
      
      return {
        conversation: conversation,
        messages: data
      };
    }
    
    // Check if this is a list of conversations (not messages)
    if (data.length > 0 && data[0].id && data[0].title) {
      // Is this the list of conversations?
      const conversationId = window.location.pathname.split('/').pop();
      if (conversationId) {
        // Find the specific conversation in the list
        const conversation = data.find(c => c.id === conversationId);
        if (conversation) {
          console.log(`Found conversation ${conversation.id} in list but need to fetch messages`);
          
          // Check if we have existing messages in the cache we should preserve
          const existingData = queryClient.getQueryData([
            "/api/chat/conversations", 
            conversationId, 
            "specific"
          ]);
          
          if (existingData && existingData.messages && existingData.messages.length > 0) {
            console.log(`Preserving ${existingData.messages.length} existing messages from cache`);
            return {
              conversation: conversation,
              messages: existingData.messages
            };
          }
          
          return {
            conversation: conversation,
            messages: []  // Empty messages - need to be fetched separately
          };
        }
      }
      
      // Just return the first conversation from the list if we can't find the specific one
      if (data.length > 0) {
        console.log(`Using first conversation from list ${data[0].id}`);
        return {
          conversation: data[0],
          messages: []
        };
      }
    }
  }
  
  // Unable to parse the data format
  console.error("Unknown conversation format:", data);
  return {
    conversation: {
      id: "",
      title: "",
      userId: "",
      createdAt: "",
      updatedAt: ""
    },
    messages: []
  };
}

/**
 * Send a message and handle the streaming response
 * 
 * This implementation automatically determines whether to use:
 * 1. Advanced RAG (Retrieval-Augmented Generation) with campaign data
 * 2. Regular chat completions API for general queries
 * 
 * It uses an intelligence content detection approach, defaulting to RAG for
 * messages that appear to be about campaigns, metrics, or advertising data.
 * 
 * @param conversationId - ID of the conversation to send the message to
 * @param messageContent - The message content to send
 * @param onStreamUpdate - Callback function that receives streamed content updates
 */
// Create a global object to track streaming IDs
declare global {
  interface Window {
    streamingMessageId?: string;
    persistedMessageId?: string;
  }
}

export async function sendMessage(
  conversationId: string, 
  messageContent: string,
  onStreamUpdate: (content: string, streamingId?: string) => void
): Promise<void> {
  // Don't send empty messages
  if (!messageContent.trim() || !conversationId) return;
  
  try {
    // Generate a client-side streaming ID that will be used unless server provides one
    const clientStreamingId = `streaming-${Date.now()}`;
    window.streamingMessageId = clientStreamingId;
    
    // The message was already sent in the UI component, so we don't send it again here.
    // Instead, we'll just query for the latest conversation state
    queryClient.invalidateQueries({ 
      queryKey: ["/api/chat/conversations", conversationId] 
    });
    
    // Always use the Two-LLM RAG endpoint which intelligently detects whether
    // the query is about campaigns or not
    const endpoint = '/api/rag/query-two-llm';
    
    console.log(`Using Two-LLM RAG endpoint with streaming ID: ${clientStreamingId}`);
    
    // Add timestamp to avoid caching issues with the SSE stream
    const timestamp = Date.now();
    const completionResponse = await fetch(`${endpoint}?t=${timestamp}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({
        // Two-LLM RAG endpoint format
        conversationId: conversationId,
        query: messageContent,
        streamingId: clientStreamingId // Pass our streaming ID to the server
      }),
      credentials: 'include' // Include credentials for session authentication
    });

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      console.error('RAG query error:', errorText);
      throw new Error(`HTTP error! status: ${completionResponse.status}`);
    }

    // Process the streaming response
    console.log('Processing streaming response...');
    const reader = completionResponse.body?.getReader();
    if (!reader) {
      throw new Error('No reader available from response');
    }
    
    // First call to onStreamUpdate to create the placeholder with our ID
    onStreamUpdate('', clientStreamingId);
    
    const decoder = new TextDecoder();
    let streamedContent = '';
    let currentStreamingId = clientStreamingId;
    
    // Start reading the stream
    try {
      let done = false;
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          // Decode the chunk and parse it
          const chunk = decoder.decode(value, { stream: true });
          console.log('Received chunk:', chunk);
          
          // Process each line (could be multiple SSE events in one chunk)
          const lines = chunk.split('\n\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6); // Remove 'data: ' prefix
              
              if (data === '[DONE]') {
                console.log('Stream completed with ID:', currentStreamingId);
                done = true;
                break;
              }
              
              if (data === '[ERROR]') {
                console.error('Server reported an error');
                done = true;
                break;
              }
              
              try {
                // Parse the JSON data
                const parsedData = JSON.parse(data);
                
                // If the server sends a streaming ID, use that instead of our client one
                if (parsedData.streamingId) {
                  console.log(`Server assigned streaming ID: ${parsedData.streamingId}`);
                  currentStreamingId = parsedData.streamingId;
                  window.streamingMessageId = currentStreamingId;
                  // Update the UI with the new ID but keep current content
                  onStreamUpdate(streamedContent, currentStreamingId);
                }
                
                // Record the database-persisted message ID 
                if (parsedData.savedMessageId) {
                  console.log(`Server saved message with ID: ${parsedData.savedMessageId}`);
                  window.persistedMessageId = parsedData.savedMessageId;
                }
                
                if (parsedData.content) {
                  // Update the streamed content with the new chunk
                  streamedContent += parsedData.content;
                  onStreamUpdate(streamedContent, currentStreamingId);
                } else if (parsedData.error) {
                  // Handle error in the stream
                  console.error('Error from server:', parsedData.error);
                  streamedContent += `\n\nError: ${parsedData.error}`;
                  onStreamUpdate(streamedContent, currentStreamingId);
                  done = true;
                  break;
                }
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Instead of invalidating the cache immediately, delay it significantly
    // This ensures that:
    // 1. The streaming is complete and the message is shown to the user
    // 2. The server has time to persist the message to the database
    // 3. The UI doesn't flicker or lose the message during refresh
    
    // Store the final content to compare after refresh
    const finalContent = streamedContent;
    
    // Delay cache invalidation much longer to prevent race conditions 
    // Increase delay to 3000ms (3 seconds) to ensure server has processed and saved the message
    // The previous 2000ms was not enough time for the server to save the message
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Use refetchQueries instead of invalidateQueries to have more control
    // This ensures we replace the existing data properly
    try {
      // CRITICAL DEBUG: Log the streaming message we expect to see
      console.log(`Looking for message with ID ${window.persistedMessageId || currentStreamingId} and content ${finalContent.substring(0, 30)}...`);
      
      // Forcefully bypass cache by setting fetchPolicy to 'network-only'
      const result = await queryClient.fetchQuery({
        queryKey: ["/api/chat/conversations", conversationId, "specific"],
        staleTime: 0,
        refetchOnMount: true,
        networkMode: 'always' // Force a network request instead of using cache
      });
      
      // CRITICAL DEBUG: Log detailed info about the server response 
      console.log(`Server returned ${result ? 'data' : 'null'} for conversation ${conversationId}`);
      if (result) {
        console.log(`Response structure:`, Object.keys(result));
        if (result.messages) {
          console.log(`Found ${result.messages.length} messages in result.messages`);
        } else if (Array.isArray(result) && result.messages) {
          console.log(`Found ${result.messages.length} messages in array.messages`);
        } else if (Array.isArray(result)) {
          console.log(`Result is array with ${result.length} items`);
        }
      }
      
      // Format the result to ensure consistent structure no matter what the server returns
      const formatted = formatConversationResponse(result);
      const messages = formatted.messages || [];
      
      // First check for the precise streaming ID we saved
      let persistedId = window.persistedMessageId || currentStreamingId;
      let hasStreamedMessage = messages.some(m => m.id === persistedId);
      
      // If we don't find the message by ID, then fall back to content matching
      if (!hasStreamedMessage && finalContent) {
        hasStreamedMessage = messages.some(m => 
          m.role === 'assistant' && m.content === finalContent
        );
      }
      
      if (!hasStreamedMessage && finalContent) {
        console.log(`CRITICAL: Message with ID ${persistedId} not found in server response, adding it manually`);
        
        // Log detailed information for debugging
        console.log(`Recovery details - Messages in response: ${messages.length}, Expected ID: ${persistedId}, Content length: ${finalContent.length}`);
        
        // Create our complete message object to add with enhanced metadata for tracking
        const messageToAdd = {
          id: persistedId, // Use the same ID we generated earlier or received from server
          conversationId: conversationId,
          role: 'assistant' as const,
          content: finalContent,
          createdAt: new Date().toISOString(),
          metadata: {
            recoveryTimestamp: Date.now(),
            recovered: true,
            originalStreamingId: currentStreamingId,
            persistedId: window.persistedMessageId
          }
        };
        
        // Add the message to formatted response
        formatted.messages = [...messages, messageToAdd];
        
        // Update the cache with the properly formatted data
        queryClient.setQueryData(
          ["/api/chat/conversations", conversationId, "specific"],
          formatted
        );
        
        // CRITICAL FIX: Also ensure subsequent cache lookups find this message
        // The issue may be that different query keys are used in different places
        queryClient.setQueryData(
          ["/api/chat/conversations", conversationId],
          formatted
        );
      } else {
        // Even if the message was found, ensure consistent formatting
        queryClient.setQueryData(
          ["/api/chat/conversations", conversationId, "specific"],
          formatted
        );
        queryClient.setQueryData(
          ["/api/chat/conversations", conversationId],
          formatted
        );
      }
    } catch (refetchError) {
      console.error('Error refetching conversation:', refetchError);
      // If refetch fails, invalidate as a fallback, but with even longer delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/conversations", conversationId] 
      });
    }
    
  } catch (error) {
    console.error("Error in message send process:", error);
    throw error;
  }
}