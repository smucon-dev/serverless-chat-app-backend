import { DynamoDB } from 'aws-sdk'
import { v4 } from 'uuid'


const dbClient = new DynamoDB({region: 'eu-central-1'})

export async function handler(event: any, context: any): Promise<string> {
  
  const id: string = v4()
  const users: string[] = event.users
  users.push(event.cognitoUsername)
  const records: any[] = []
  users.forEach(user => {
    records.push({
      PutRequest: {
        Item: {
          ConversationId: {S: id},
          Username: {S: user}
        }
      }
    })
  });

  try {
    await dbClient.batchWriteItem({
      RequestItems: {
        'Chat-Conversations': records
      }
    }).promise()
    return id
  } catch (error) {
    return '' + error
  }

}