import { CfnOutput } from "aws-cdk-lib";
import { CognitoUserPoolsAuthorizer, RestApi } from "aws-cdk-lib/aws-apigateway";
import { UserPool, UserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Effect, ManagedPolicy, Policy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";



export class AuthorizerWrapper {

  private scope: Construct
  private api: RestApi
  
  public userPool: UserPool
  private userPoolClient: UserPoolClient
  public lambdaCognitoRole: Role
  public authorizer: CognitoUserPoolsAuthorizer


  constructor(scope: Construct) {
    this.scope = scope
    this.createUserPool()
    this.addUserPoolClient()
    this.createLambdaCognitoRole()
    this.createAuthorizer()
  }


  private createUserPool() {

    this.userPool = new UserPool(this.scope, 'ServerlessChatApp', {
      userPoolName: 'ServerlessChatApp',
      selfSignUpEnabled: true,
      signInAliases: {
        username: true,
        email: true
      }
    })
    new CfnOutput(this.scope, 'UserPoolId', {
      value: this.userPool.userPoolId
    })
  }

  private addUserPoolClient() {
    this.userPoolClient = this.userPool.addClient('ServerlessChatApp-Website', {
      userPoolClientName: 'ServerlessChatApp-Website',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true
      }
    })
    new CfnOutput(this.scope, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId
    })
  }

  private createAuthorizer(){
    this.authorizer = new CognitoUserPoolsAuthorizer(this.scope, 'ChatAppAuthorizer', {
      cognitoUserPools: [this.userPool],
      authorizerName: 'ChatAppAuthorizer',
      identitySource: 'method.request.header.Authorization',
    })
  }

  private createLambdaCognitoRole() {

    // create role
    this.lambdaCognitoRole = new Role(this.scope, 'serverless-chat-app-list-users-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'grant lambda rights to list users of ServerlessChatApp user pool',
    })

    // create policy document
    const policyDocument = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cognito-idp:ListUsers'],
          resources: [this.userPool.userPoolArn]
        })
      ]
    })

    // create policy
    const policy = new Policy(this.scope, 'serverless-chat-app-list-users', {
      policyName: 'serverless-chat-app-list-users',
      document: policyDocument,
    })
    this.lambdaCognitoRole.attachInlinePolicy(policy)
    

    // get managed policy from lambda basic execution role
    const managedPolicy = ManagedPolicy.fromAwsManagedPolicyName(
      'service-role/AWSLambdaBasicExecutionRole',
    );
    this.lambdaCognitoRole.addManagedPolicy(managedPolicy)


  }

}