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
    
    // Ensure all messages have required fields
    const validMessages = data.messages.filter((msg: any) => 
      msg && msg.role && typeof msg.content === 'string'
    );
    
    // Log any invalid messages that we filtered out
    if (validMessages.length !== data.messages.length) {
      console.warn(`Filtered out ${data.messages.length - validMessages.length} invalid messages`);
    }
    
    return {
      conversation: data.conversation,
      messages: validMessages
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
    // First check if this is an array of messages directly
    if (data.length > 0 && data[0].role && 
        (data[0].role === 'user' || data[0].role === 'assistant' || data[0].role === 'system')) {
      // This appears to be an array of messages
      console.log(`Found array of ${data.length} messages`);
      
      // We need to construct a placeholder conversation object
      const conversationId = window.location.pathname.split('/').pop() || 'unknown';
      return {
        conversation: {
          id: conversationId,
          title: "Conversation",
          userId: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        messages: data.filter((msg: any) => msg && msg.role && typeof msg.content === 'string')
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
 */
export async function sendMessage(
  conversationId: string, 
  messageContent: string,
  onStreamUpdate: (content: string) => void
): Promise<void> {
  // Don't send empty messages
  if (!messageContent.trim() || !conversationId) return;
  
  try {  
    console.log('Sending user message to conversation:', conversationId);
    
    // Step 1: Send the user message
    const messageResponse = await apiRequest("POST", `/api/chat/conversations/${conversationId}/messages`, {
      role: "user",
      content: messageContent,
    });
    
    const messageData = await messageResponse.json();
    console.log('User message saved successfully:', messageData);
    
    // Create an optimistic update with the user message visible immediately
    const currentData = queryClient.getQueryData(["/api/chat/conversations", conversationId]);
    if (currentData) {
      // If we have existing conversation data, add the user message to it
      const formattedData = formatConversationResponse(currentData);
      const updatedData = {
        conversation: formattedData.conversation,
        messages: [...formattedData.messages, messageData]
      };
      
      // Update the query cache with the new user message
      queryClient.setQueryData(
        ["/api/chat/conversations", conversationId],
        updatedData
      );
    }
    
    // Also refresh to ensure we have the latest data
    queryClient.invalidateQueries({ 
      queryKey: ["/api/chat/conversations", conversationId] 
    });
    
    // Step 2: Call the AI completions endpoint
    console.log('Calling AI completions endpoint...');
    const completionResponse = await fetch('/api/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: conversationId,
        message: messageContent
      }),
      credentials: 'include' // Include credentials for session authentication
    });

    if (!completionResponse.ok) {
      const errorText = await completionResponse.text();
      console.error('AI completion error:', errorText);
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