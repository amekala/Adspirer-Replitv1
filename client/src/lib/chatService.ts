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
    // Check if this is a list of conversations (not messages)
    if (data.length > 0 && data[0].id && data[0].title) {
      // Is this the list of conversations?
      const conversationId = window.location.pathname.split('/').pop();
      if (conversationId) {
        // Find the specific conversation in the list
        const conversation = data.find(c => c.id === conversationId);
        if (conversation) {
          console.log(`Found conversation ${conversation.id} in list but need to fetch messages`);
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
 * This implementation uses the advanced RAG (Retrieval-Augmented Generation) 
 * endpoint for advertising-related queries, which provides context-aware,
 * data-driven responses based on campaign metrics using a two-LLM architecture
 * 
 * @param conversationId - ID of the conversation to send the message to
 * @param messageContent - The message content to send
 * @param onStreamUpdate - Callback function that receives streamed content updates
 */
export async function sendMessage(
  conversationId: string, 
  messageContent: string,
  onStreamUpdate: (content: string) => void
): Promise<void> {
  // Don't send empty messages
  if (!messageContent.trim() || !conversationId) return;
  
  try {  
    // The message was already sent in the UI component, so we don't send it again here.
    // Instead, we'll just query for the latest conversation state
    queryClient.invalidateQueries({ 
      queryKey: ["/api/chat/conversations", conversationId] 
    });
    
    // Step 2: Use the advanced RAG endpoint with Two-LLM architecture
    const endpoint = '/api/rag/query-two-llm';
    console.log('Calling Two-LLM RAG query endpoint...');
    
    const completionResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: conversationId,
        query: messageContent
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
    
    const decoder = new TextDecoder();
    let streamedContent = '';
    
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
                console.log('Stream completed');
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
                if (parsedData.content) {
                  streamedContent += parsedData.content;
                  onStreamUpdate(streamedContent);
                } else if (parsedData.error) {
                  // Handle error in the stream
                  console.error('Error from server:', parsedData.error);
                  streamedContent += `\n\nError: ${parsedData.error}`;
                  onStreamUpdate(streamedContent);
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
    
    // Make sure we get the final state from the server
    queryClient.invalidateQueries({ 
      queryKey: ["/api/chat/conversations", conversationId] 
    });
    
  } catch (error) {
    console.error("Error in message send process:", error);
    throw error;
  }
}