import { CfnOutput, Fn, Stack, StackProps } from "aws-cdk-lib";
import { ContentHandling, Cors, LambdaIntegration, MethodOptions, PassthroughBehavior, RestApi, RestApiProps } from "aws-cdk-lib/aws-apigateway";
import { AttributeType, GlobalSecondaryIndexProps, Table, TableProps } from "aws-cdk-lib/aws-dynamodb";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs/lib/construct";
import { join } from "path";
import { apiModelConversationList } from "../models/model";
import { Api } from "./Api";
import { AuthorizerWrapper } from "./AuthorizerWrapper";
import { LambdaWrapper } from "./LambdaWrapper";
import { WebAppDeployment } from "./WebAppDeployment";


export class ChatAppStack extends Stack {

  private api: Api
  private suffix: string
  private webAppDeployment: WebAppDeployment
  private chatMessagesTable: Table
  private chatConversationsTable: Table
  // private chatConversationsGet: NodejsFunction
  // private chatConversationsGetIntegration: LambdaIntegration
  private lambdaWrapper: LambdaWrapper
  private authorizer: AuthorizerWrapper


  constructor(scope: Construct, id: string, props: StackProps) {

    super(scope, id, props)
    this.initializeSuffix()
    this.webAppDeployment = new WebAppDeployment(this, this.suffix)
    this.authorizer = new AuthorizerWrapper(this)
    this.lambdaWrapper = new LambdaWrapper(this, this.webAppDeployment.deploymentBucket.bucketWebsiteUrl, this.authorizer)
    this.api = new Api(this, this.webAppDeployment.deploymentBucket.bucketWebsiteUrl, this.lambdaWrapper, this.authorizer.authorizer)
    this.authorizer.authorizer._attachToApi(this.api.restApi)
    this.initializeDbTables() 
  }


  // extract suffix from stack id (will be used to make bucket name unique)
  private initializeSuffix() {
    const shortStackId = Fn.select(2, Fn.split('/', this.stackId))
    const suffix = Fn.select(4, Fn.split('-', shortStackId))
    this.suffix = suffix
  }


  private initializeDbTables() {

    // table properties messages
    const tablePropsMessages: TableProps = {
      tableName: 'Chat-Messages',
      partitionKey: {
        name: 'ConversationId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'Timestamp',
        type: AttributeType.NUMBER
      },
      readCapacity: 1,
      writeCapacity: 1,
    }

    // create messages table
    this.chatMessagesTable = new Table(this, 'chat-messages-table', tablePropsMessages)
    this.chatMessagesTable.grantReadData(this.lambdaWrapper.chatConversationsGet)
    this.chatMessagesTable.grantReadData(this.lambdaWrapper.chatMessagesGet)
    this.chatMessagesTable.grantWriteData(this.lambdaWrapper.chatMessagesPost)


    // table properties conversations
    const tablePropsConversations: TableProps = {
      tableName: 'Chat-Conversations',
      partitionKey: {
        name: 'ConversationId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'Username',
        type: AttributeType.STRING
      },
      readCapacity: 1,
      writeCapacity: 1,
    }

    // global seconday index props
    const gsiProps: GlobalSecondaryIndexProps = {
      indexName: 'Username-ConversationId-index',
      partitionKey: {
        name: 'Username',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'ConversationId',
        type: AttributeType.STRING
      },
      readCapacity: 1,
      writeCapacity: 1
    }

    // creat converations table
    this.chatConversationsTable = new Table(this, 'chat-conversations-table', tablePropsConversations)
    this.chatConversationsTable.addGlobalSecondaryIndex(gsiProps)
        
    // grant lambda rights
    this.chatConversationsTable.grantReadData(this.lambdaWrapper.chatConversationsGet)
    this.chatConversationsTable.grantReadData(this.lambdaWrapper.chatMessagesGet)
    this.chatConversationsTable.grantWriteData(this.lambdaWrapper.chatCoversationPost)

  }

}

