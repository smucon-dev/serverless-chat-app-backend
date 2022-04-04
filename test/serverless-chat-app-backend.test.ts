// import * as cdk from 'aws-cdk-lib';
// import { Template } from 'aws-cdk-lib/assertions';
// import * as ServerlessChatAppBackend from '../lib/serverless-chat-app-backend-stack';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/serverless-chat-app-backend-stack.ts
// test('SQS Queue Created', () => {
//   const app = new cdk.App();
//     // WHEN
//   const stack = new ServerlessChatAppBackend.ServerlessChatAppBackendStack(app, 'MyTestStack');
//     // THEN
//   const template = Template.fromStack(stack);

//   template.hasResourceProperties('AWS::SQS::Queue', {
//     VisibilityTimeout: 300
//   });
// });

import {handler as chatConversationsGetHandler } from '../lambdas/chat-conversations-get'
import {handler as chatMessagesGetHandler } from '../lambdas/chat-messages-get'
import {handler as chatMessagesPostHandler } from '../lambdas/chat-messages-post'
import {handler as chatConversationPostHandler } from '../lambdas/chat-conversation-post'
import { Conversation } from '../models/model'


describe('lambda tests', () => {

  it('chat-conversations-get should return conversations list', async () => {

    const testEvent = {
      "cognitoUsername": "Student"
    }

    const result = await chatConversationsGetHandler(testEvent as any, {} as any)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].id).toBeDefined()
    expect(result[0].last).toBeDefined()
    expect(result[0].participants).toBeDefined()
  })

  // it('chat-proxy should cause a bad request as http method is not supported for conversations', async () => {
  //   const testEvent = {
  //     "httpMethod": "POST",
  //     "path": "/conversations"
  //   }
  //   const result = await chatProxyHandler(testEvent as any, {} as any)
  //   expect(result.statusCode).toBe(400)
  // })

  // it('chat-proxy should return one conversation', async () => {
  //   const testEvent = {
  //     "id": "1"
  //   }
  //   const result = await chatMessagesGetHandler(testEvent as any, {} as any)
  //   expect(result.id).toEqual('1')
  //   expect(result.last).toBeDefined()
  //   expect(result.messages.length).toBeGreaterThan(0)
  //   expect(result.participants.length).toBeGreaterThan(0)
  // })

  it('chat-proxy should post a new message', async () => {
    const testEvent1 = {
      "id": "1"
    }
    const convBefore: Conversation = await chatMessagesGetHandler(testEvent1 as any, {} as any)
    const numMessages = convBefore.messages.length

    const testEvent2 = {
      "id": "1",
      "cognitoUsername": "student",
      "message": "This is a new message"
    }
    await chatMessagesPostHandler(testEvent2 as any, {} as any)

    const convAfter: Conversation = await chatMessagesGetHandler(testEvent1 as any, {} as any)
    expect(convAfter.messages.length).toBe(numMessages+1)
  })

  it('should create a new conversation', async () => {
    const testEvent = {
      "cognitoUsername": "Student",
      "users" : ["Brian"]
    }

    const id = await chatConversationPostHandler(testEvent, {})

    expect(id).not.toBeNull()
    
  })

  // it('chat-proxy should cause a bad request as http method is not supported for conversations/xyz', async () => {
  //   const testEvent = {
  //     "httpMethod": "PUT",
  //     "path": "/conversations/1",
  //     "body": "This is a new message"
  //   }
  //   const result = await chatProxyHandler(testEvent as any, {} as any)
  //   expect(result.statusCode).toBe(400)
  // })

  // it('chat-proxy should return status code 400 (non existing id', async () => {
  //   const testEvent = {
  //     "path": "/conversations/-1"
  //   }
  //   const result = await chatProxyHandler(testEvent as any, {} as any)
  //   expect(result.statusCode).toEqual(400)
  // })

  // it('chat-proxy should return status code 400 (malformed path)', async () => {
  //   const testEvent = {
  //     "path": "/conversationsssss"
  //   }
  //   const result = await chatProxyHandler(testEvent as any, {} as any)
  //   expect(result.statusCode).toEqual(400)
  // })

})


