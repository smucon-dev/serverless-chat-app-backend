import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { AWSError, DynamoDB } from 'aws-sdk'
import { PromiseResult } from "aws-sdk/lib/request";

// const BUCKET_NAME = process.env.BUCKET_NAME || ''
const ORIGIN = process.env.ORIGIN || '*'

// entry
async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {

  const dbClient = new DynamoDB({ region: 'eu-central-1' })

  const result: APIGatewayProxyResult = {
    statusCode: 200,
    body: '',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ORIGIN
    }
  }

  // const params = {
  //   Bucket: BUCKET_NAME,
  //   Key: ''
  // }

  const path = event.path || '';


  // load messages and participants (call this function recursively in case of pagination)
  const loadMessages = async (dbClient: DynamoDB, data: PromiseResult<DynamoDB.QueryOutput, AWSError>, id: string, messages: any[], participants: string[]) => {
    // add mesages
    data!.Items!.forEach((message) => {
      messages.push({
        sender: message.Sender.S,
        time: Number(message.Timestamp.N),
        message: message.Message.S
      });
    });
    // recursive call on paginations
    if (data.LastEvaluatedKey) {
      await dbClient.query({
        TableName: 'Chat-Messages',
        ProjectionExpression: '#T, Sender, Message',
        ExpressionAttributeNames: { '#T': 'Timestamp' },
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeValues: { ':id': { S: id } }
      }).promise()
        .then(data => loadMessages(dbClient, data, id, messages, participants))
    }
    // query participants 
    else {
      await dbClient.query({
        TableName: 'Chat-Conversations',
        Select: 'ALL_ATTRIBUTES',
        KeyConditionExpression: 'ConversationId = :id',
        ExpressionAttributeValues: { ':id': { S: id } }
      }).promise()
        .then(data => {
          data.Items?.forEach(item => {
            participants.push(item.Username.S!)
          })
        })
    }
  }

  // query for converstions by ids
  const handleIdQuery = async (dbClient: DynamoDB, data: PromiseResult<DynamoDB.QueryOutput, AWSError>, ids: string[], convos: any[], username: string) => {
    console.log("Username query results: " + JSON.stringify(data));
    // collect ids
    data!.Items!.forEach((item: any) => {
      ids.push(item.ConversationId.S);
    });
    // recursive call on pagination
    if (data.LastEvaluatedKey) {
      await dbClient.query({
        TableName: 'Chat-Conversations',
        IndexName: 'Username-ConversationId-index',
        Select: 'ALL_PROJECTED_ATTRIBUTES',
        KeyConditionExpression: 'Username = :username',
        ExpressionAttributeValues: { ':username': { S: username } },
        ExclusiveStartKey: data.LastEvaluatedKey
      }).promise()
        .then(data => handleIdQuery(dbClient, data, ids, convos, username))
    }
    // load conversation details
    else {
      console.log("Loading details");

      ids.forEach(function (id) {
        var convo = { id: id };
        convos.push(convo);
      })

      if (convos.length > 0) {
        await Promise.all(convos.map(async (convo: any) => {
          // query for last timestamp of conversation
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
          // query for participants of conversation
          await dbClient.query({
            TableName: 'Chat-Conversations',
            Select: 'ALL_ATTRIBUTES',
            KeyConditionExpression: 'ConversationId = :id',
            ExpressionAttributeValues: { ':id': { S: convo.id } }
          }).promise().then(data => {
            const participants: any = [];
            data!.Items!.forEach((item: any) => {
              participants.push(item.Username.S);
            });
            convo.participants = participants;
          })
        }))
      } 
    }
  }

  try {
    // read all conversations
    if (path === '/conversations' && event.httpMethod === 'GET') {
      const convos: any[] = []
      await dbClient.query({
        TableName: 'Chat-Conversations',
        IndexName: 'Username-ConversationId-index',
        Select: 'ALL_PROJECTED_ATTRIBUTES',
        KeyConditionExpression: 'Username = :username',
        ExpressionAttributeValues: { ':username': { S: 'Student' } }
      }).promise()
        .then(data => handleIdQuery(dbClient, data, [], convos, 'Student'))
        .then(() => result.body = JSON.stringify(convos))

    }
    // read a single conversation
    else if (path.startsWith('/conversations/')) {
      const id = path.substring('/conversations/'.length)
      switch(event.httpMethod) {
        case 'GET':      
          const messages: any[] = []
          const participants: string[] = []
          const data = await dbClient.query({
            TableName: 'Chat-Messages',
            ProjectionExpression: '#T, Sender, Message',
            ExpressionAttributeNames: { '#T': 'Timestamp' },
            KeyConditionExpression: 'ConversationId = :id',
            ExpressionAttributeValues: { ':id': { S: id } }
          }).promise()
          if (data && data!.Items!.length > 0) {
            // query messages and participants belonging to the conversation
            await loadMessages(dbClient, data, id, messages, participants)
            // set result body
            result.body = JSON.stringify({
              id: id,
              participants: participants,
              last: messages.length > 0 ? messages[messages.length - 1].time : undefined,
              messages: messages
            })
          } else {
            result.statusCode = 400
            result.body = 'No assets hit'
          }
          break;
        case 'POST': 
           await dbClient.putItem(
            {
              TableName: 'Chat-Messages',
              Item: {
                ConversationId: {S: id},
                Timestamp: {
                    N: "" + new Date().getTime()
                },
                Message: {S: event.body!},
                Sender: {S: 'Student'}
              }
            }
           ).promise()
          break

        default:
          result.statusCode = 400
          result.body = 'No cases hit'
      }
    } else {
      result.statusCode = 400
      result.body = 'No assets hit'
    }
  } catch (error) {
    result.statusCode = 400
    result.body = JSON.stringify(error)
  }

  return result
}



export { handler }