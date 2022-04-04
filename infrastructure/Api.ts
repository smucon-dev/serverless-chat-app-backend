import { Stack } from "aws-cdk-lib";
import { CognitoUserPoolsAuthorizer, MethodOptions, Model, RestApi, RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { apiModelConversationId, apiModelConversationList, apiModelNewConversation, apiModelNewMessage, apiModelUserList } from "../models/model";
import { LambdaWrapper } from "./LambdaWrapper";


export class Api {

  public restApi: RestApi
  private authorizer: CognitoUserPoolsAuthorizer
  
  constructor(stack: Stack, origin: string, lambdaWrapper: LambdaWrapper, authorizer: CognitoUserPoolsAuthorizer) {

    this.authorizer = authorizer

    const restApiProps: RestApiProps = {
      restApiName: 'ServerlessChatApp',
      description: 'A servers less rest api for chats',
      defaultCorsPreflightOptions: {
        allowHeaders: [
          'Content-Type',
          'Authorization',
        ],
        allowOrigins: [origin]
      },
    }
    this.restApi = new RestApi(stack, 'ServerlessChatApi', restApiProps)

    // add models
    const conversationListModel = this.restApi.addModel('conversation-list', {
      contentType: 'application/json',
      modelName: 'ConversationList',
      description: 'list of conversations',
      schema: apiModelConversationList
    })
    const conversationModel = this.restApi.addModel('conversation', {
      contentType: 'application/json',
      modelName: 'Conversation',
      description: 'conversation with lists of participants and messages',
      schema: apiModelConversationList
    })
    const newMessageModel = this.restApi.addModel('new-message', {
      contentType: 'application/json',
      modelName: 'NewMessage',
      description: 'new chat message',
      schema: apiModelNewMessage
    })
    const userListModel = this.restApi.addModel('user-list', {
      contentType: 'application/json',
      modelName: 'UserList',
      description: 'list cognito users',
      schema: apiModelUserList
    })
    const newConversationModel = this.restApi.addModel('new-conversation', {
      contentType: 'application/json',
      modelName: 'NewConversation',
      description: 'new conversation',
      schema: apiModelNewConversation
    })
    const conversationIdModel = this.restApi.addModel('conversation-id', {
      contentType: 'application/json',
      modelName: 'ConversationId',
      description: 'id of a new conversation',
      schema: apiModelConversationId
    })

    // add resources
    const conversationsResource = this.restApi.root.addResource('conversations')
    const conversationResource = conversationsResource.addResource('{id}')
    const usersResource = this.restApi.root.addResource('users')

    // add methods //

    // get conversations
    const conversationsMethodOptions: MethodOptions = {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': conversationListModel
          },
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }
      ],
      authorizer: this.authorizer
    }
    conversationsResource.addMethod('GET', lambdaWrapper.chatConversationsGetIntegration, conversationsMethodOptions)


    // get on conversation
    const messagesGetMethodOptions: MethodOptions = {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': conversationModel
          },
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        },
        {
          statusCode: '401',
          responseModels: {
            'application/json': Model.ERROR_MODEL
          }
        }
      ],
      authorizer: this.authorizer
    }
    conversationResource.addMethod('GET', lambdaWrapper.chatMessagesGetIntegration, messagesGetMethodOptions)

    // post new message
    const messagesPostMethodOptions: MethodOptions = {
      requestModels: {
        'application/json': newMessageModel
      },
      methodResponses: [
        {
          statusCode: '204',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }
      ],
      authorizer: this.authorizer
    }
    conversationResource.addMethod('POST', lambdaWrapper.chatMessagesPostIntegration, messagesPostMethodOptions)

    // get users
    const usersGetMethodOptions: MethodOptions = {
      methodResponses: [
        {
          statusCode: "200",
          responseModels: {
            'application/json': userListModel
          },
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }
      ],
      authorizer: this.authorizer
    }
    usersResource.addMethod('GET', lambdaWrapper.chatUsersGetIntegration, usersGetMethodOptions)

    const conversationPostMethodOptions: MethodOptions = {
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': conversationIdModel
          },
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }
      ],
      requestModels: {
        'application/json': newConversationModel
      },
      authorizer: this.authorizer
    }
    conversationsResource.addMethod('POST', lambdaWrapper.chatConversationPostIntegration, conversationPostMethodOptions)
    
  }

}