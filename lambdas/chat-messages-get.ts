import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { AWSError, DynamoDB } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import { Message, Conversation } from "../models/model";



export async function handler(event: any, context: Context): Promise<Conversation | string> {

  const id = event.id
  const dbClient = new DynamoDB({region: 'eu-central-1'})
  const username = event.cognitoUsername

  const data = await dbClient.query({
                TableName: 'Chat-Messages',
                ProjectionExpression: '#T, Sender, Message',
                ExpressionAttributeNames: { '#T': 'Timestamp' },
                KeyConditionExpression: 'ConversationId = :id',
                ExpressionAttributeValues: { ':id': { S: id } }
              }).promise()

  // query messages and participants belonging to the conversation
  if (data && data!.Items!.length > 0) {

    const messages: Message[] = []
    await loadMessages(dbClient, data, id, messages)
    const participants = await loadParticipants(dbClient, id)
    
    if(!participants.includes(username)){
      return "Unauthorized!"
    }

    return {
      id: id,
      participants: participants,
      last: messages.length > 0 ? messages[messages.length - 1].time : undefined,
      messages: messages
    }
  } 
  else {
    return {
      id: id,
      participants: [],
      last: undefined,
      messages: []
    }
  }
}

const loadMessages = async (dbClient: DynamoDB, data: PromiseResult<DynamoDB.QueryOutput, AWSError>, id: string, messages: Message[]) => {
  
  // add messages
  data!.Items!.forEach((message) => {
    messages.push({
      sender: message.Sender.S!,
      time: Number(message.Timestamp.N),
      message: message.Message.S!
    });
  });

  // recursive call on pagination
  if (data.LastEvaluatedKey) {
    await dbClient.query({
      TableName: 'Chat-Messages',
      ProjectionExpression: '#T, Sender, Message',
      ExpressionAttributeNames: { '#T': 'Timestamp' },
      KeyConditionExpression: 'ConversationId = :id',
      ExpressionAttributeValues: { ':id': { S: id } }
    }).promise()
      .then(data => loadMessages(dbClient, data, id, messages))
  }
}


const loadParticipants = async (dbClient: DynamoDB, id: string): Promise<string[]> => {
  
  const participants: string[] = [] 

  const data = await dbClient.query({
    TableName: 'Chat-Conversations',
    Select: 'ALL_ATTRIBUTES',
    KeyConditionExpression: 'ConversationId = :id',
    ExpressionAttributeValues: { ':id': { S: id } }
  }).promise()
  
  data.Items?.forEach(item => {
    participants.push(item.Username.S!)
  })

  return participants
}
