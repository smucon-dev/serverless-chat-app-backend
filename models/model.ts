import { JsonSchema, JsonSchemaType } from "aws-cdk-lib/aws-apigateway"
import { ApiGateway } from "aws-cdk-lib/aws-events-targets"

/**
 * app models
 */
export interface Message {
  sender: string
  time: number
  message: string
}

export interface Conversation {
  id: string
  last: number | undefined
  participants: string[]
  messages: Message[]
}




/**
 * api models
 */

//ConversationList
export const apiModelConversationList = 
{
  type: JsonSchemaType.ARRAY,
  items: {
    type: JsonSchemaType.OBJECT,
    properties: {
      id: {
        type: JsonSchemaType.STRING
      },
      participants: {
        type: JsonSchemaType.ARRAY,
        items: {
          type: JsonSchemaType.STRING
        }
      },
      last: {
        type: JsonSchemaType.NUMBER,
        format: "utc-millisec"
      }
    }
  }
}

// Conversation
export const apiModelConversation = 
{
  type: JsonSchemaType.ARRAY,
  items: {
    type: JsonSchemaType.OBJECT,
    properties: {
      id: {
        type: JsonSchemaType.STRING
      },
      participants: {
        type: JsonSchemaType.ARRAY,
        items: {
          type: JsonSchemaType.STRING
        }
      },
      last: {
        type: JsonSchemaType.NUMBER,
        format: "utc-millisec"
      },
      messages: {
        type: JsonSchemaType.ARRAY,
        items: {
          type: JsonSchemaType.OBJECT,
          properties: {
            sender: {
              type: JsonSchemaType.STRING
            },
            time: {
              type: JsonSchemaType.NUMBER,
              format: "utc-millisec"
            },
            message: {
              type: JsonSchemaType.STRING
            }
          }
        }
      }
    }
  }
}

// NewMessage
export const apiModelNewMessage = {
  type: JsonSchemaType.STRING
}

// UserList
export const apiModelUserList = {
  type: JsonSchemaType.ARRAY,
  items: {
    type: JsonSchemaType.STRING
  }
}

// ConversationId
export const apiModelConversationId = {
  type: JsonSchemaType.STRING
}

// NewConversation
export const apiModelNewConversation = {
  type: JsonSchemaType.ARRAY,
  items: {
    type: JsonSchemaType.STRING
  }
}