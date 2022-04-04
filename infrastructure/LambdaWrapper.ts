import { Stack } from "aws-cdk-lib"
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway"
import { Role } from "aws-cdk-lib/aws-iam"
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs"
import { join } from "path"
import { AuthorizerWrapper } from "./AuthorizerWrapper"



export class LambdaWrapper {

  public chatConversationsGet: NodejsFunction
  public chatMessagesGet: NodejsFunction
  public chatMessagesPost: NodejsFunction
  public chatUsersGet: NodejsFunction
  public chatCoversationPost: NodejsFunction
  public chatConversationsGetIntegration: LambdaIntegration
  public chatMessagesGetIntegration: LambdaIntegration
  public chatMessagesPostIntegration: LambdaIntegration
  public chatUsersGetIntegration: LambdaIntegration
  public chatConversationPostIntegration: LambdaIntegration
  private stack: Stack
  private origin: string
  private authorizerWrapper: AuthorizerWrapper


  constructor(stack: Stack, origin: string, authorizerWrapper: AuthorizerWrapper) {

    this.stack = stack
    this.origin = origin
    this.authorizerWrapper = authorizerWrapper
    this.createLambdas()
    this.createLambdaIntegrations()
  }


  // create lambda functions
  private createLambdas() { 
    this.chatConversationsGet = this.createLambdaFunction('chat-conversations-get')
    this.chatMessagesGet = this.createLambdaFunction('chat-messages-get')
    this.chatMessagesPost = this.createLambdaFunction('chat-messages-post')
    this.chatUsersGet = this.createLambdaFunction('chat-users-get', this.authorizerWrapper.lambdaCognitoRole)
    this.chatCoversationPost = this.createLambdaFunction('chat-conversation-post')
  }


  // create lambda integrations
  private createLambdaIntegrations() {

    // get conversations
    this.chatConversationsGetIntegration = new LambdaIntegration(this.chatConversationsGet, {
      proxy: false,
      integrationResponses: [
        {
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': `'${this.origin}'`
          },
          responseTemplates: {
                            'application/json': `#set($inputRoot = $input.path("$"))
                                      [
                                      #foreach($elem in $inputRoot)
                                        {
                                          "id" : "$elem.id",
                                          "last" : $elem.last,
                                          "participants": $elem.participants
                                        }#if($foreach.hasNext),#end
                                      
                                      #end
                                      ]`
                            },
          statusCode: '200',
        }
      ],        
      requestTemplates: {
        'application/json': `#set($inputRoot = $input.path('$'))
        {
            "cognitoUsername": "$context.authorizer.claims['cognito:username']"
        }`
      },
      
    })

    // get messages (one conversation)
    this.chatMessagesGetIntegration = new LambdaIntegration(this.chatMessagesGet, {
      proxy: false,
      integrationResponses: [
        {
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': `'${this.origin}'`
          },
          statusCode: '200'
        },
        {
          statusCode: '401',
          selectionPattern: '.*Unauthorized.*'
        }
      ],
      requestTemplates: {
        'application/json': `#set($inputRoot = $input.path('$'))
                            {
                              "cognitoUsername": "$context.authorizer.claims['cognito:username']",
                              "id": "$input.params('id')"
                            }`
      }
    })

    // post message 
    this.chatMessagesPostIntegration = new LambdaIntegration(this.chatMessagesPost, {
      proxy: false,
      integrationResponses: [
        {
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': `'${this.origin}'`
          },
          statusCode: '204'
        },
      ],
      requestTemplates: {
        'application/json': `#set($inputRoot = $input.path('$'))
                            {
                                "id": "$input.params('id')",
                                "message": "$inputRoot",
                                "cognitoUsername": "$context.authorizer.claims['cognito:username']"
                            }`                           
      }
    })

    // get users
    this.chatUsersGetIntegration = new LambdaIntegration(this.chatUsersGet, {
      proxy: false,
      integrationResponses: [
        {
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': `'${this.origin}'`
          },
          statusCode: '200'
        }
      ],        
      requestTemplates: {
        'application/json': `#set($inputRoot = $input.path('$'))
        {
            "cognitoUsername": "$context.authorizer.claims['cognito:username']"
        }`
      }
    })

    // post conversation
    this.chatConversationPostIntegration = new LambdaIntegration(this.chatCoversationPost, {
      proxy: false,
      integrationResponses: [
        {
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': `'${this.origin}'`
          }
        }
      ],
      requestTemplates: {
        "application/json": `#set($inputRoot = $input.path('$'))
        {
          "cognitoUsername": "$context.authorizer.claims['cognito:username']",
          "users":
          [
            #foreach($elem in $inputRoot)
            "$elem"
            #if($foreach.hasNext),#end
            #end
          ]
        }`
      }
    })

  }

  // create a single lambda function
  private createLambdaFunction(id: string, role?: Role) {
    
    return new NodejsFunction(this.stack, id, {
      entry: join(__dirname, '..', 'lambdas', `${id}.ts`),
      handler: 'handler',
      functionName: id,
      environment: {
        ORIGIN: this.origin,
        USER_POOL_ID: this.authorizerWrapper.userPool.userPoolId
      },
      role: role
    })

  }





  


}