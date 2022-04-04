import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { AWSError, DynamoDB } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import { Conversation } from "../models/model";

const ORIGIN = process.env.ORIGIN || '*'


async function handler(event: any, context: Context): Promise<Conversation[]> {

  const dbClient = new DynamoDB({region: 'eu-central-1'})
  const convos: Conversation[] = []

  // query for conversations
  await dbClient.query({
    TableName: 'Chat-Conversations',
    IndexName: 'Username-ConversationId-index',
    Select: 'ALL_PROJECTED_ATTRIBUTES',
    KeyConditionExpression: 'Username = :username',
    ExpressionAttributeValues: { ':username': { S: event.cognitoUsername } }
  }).promise()
    .then(data => handleIdQuery(dbClient, data, convos, event.cognitoUsername))
  
    return convos
}

// initialize conversation objects
const handleIdQuery = async (dbClient: DynamoDB, data: PromiseResult<DynamoDB.QueryOutput, AWSError>, convos: any[], username: string) => {
  
  console.log("Username query results: " + JSON.stringify(data));

  // collect ids
  const ids: string[] = []
  data!.Items!.forEach((item: any) => {
    ids.push(item.ConversationId.S);
  });

  // recursive call in case of pagination 
  if (data.LastEvaluatedKey) {
    await dbClient.query({
      TableName: 'Chat-Conversations',
      IndexName: 'Username-ConversationId-index',
      Select: 'ALL_PROJECTED_ATTRIBUTES',
      KeyConditionExpression: 'Username = :username',
      ExpressionAttributeValues: { ':username': { S: username } },
      ExclusiveStartKey: data.LastEvaluatedKey
    }).promise()
      .then(data => handleIdQuery(dbClient, data, convos, username))
  }

  // load conversation details
  else {

    // create conversation objects and initialize them with their id
    ids.forEach(function (id) {
      const convo: Conversation = { 
        id: id, 
        last: 0,
        participants: [],
        messages: []
      };
      convos.push(convo);
    })

    if (convos.length > 0) {

      await Promise.all(convos.map(async (convo: Conversation) => {

        // set timestamp of last conversation message
        await dbClient.query({
          TableName: 'Chat-Messages',
          ProjectionExpression: '#T',
          Limit: 1,
          ScanIndexForward: false,
          KeyConditionExpression: 'ConversationId = :id',
          ExpressionAttributeNames: { '#T': 'Timestamp' },
          ExpressionAttributeValues: { ':id': { S: convo.id } }
        }).promise().then(data => {
          if (data!.Items!.length === 1) {
            convo.last = Number(data!.Items![0].Timestamp.N);
          }
        })

        // load conversation participants
        await dbClient.query({
          TableName: 'Chat-Conversations',
          Select: 'ALL_ATTRIBUTES',
          KeyConditionExpression: 'ConversationId = :id',
          ExpressionAttributeValues: { ':id': { S: convo.id } }
        }).promise().then(data => {
          data!.Items!.forEach((item: any) => {
            convo.participants.push(item.Username.S);
          });
        })
      }))
    } 
  }
}

export { handler }