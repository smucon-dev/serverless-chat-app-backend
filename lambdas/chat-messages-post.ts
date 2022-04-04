import { Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk";



export async function handler(event: any, context: Context) {

  const dbClient = new DynamoDB({region: 'eu-central-1'})
  const timeStamp = new Date().getTime()

  try {

    await dbClient.putItem(
      {
        TableName: 'Chat-Messages',
        Item: {
          ConversationId: {S: event.id},
          Timestamp: {
              N: "" + timeStamp
          },
          Message: {S: event.message},
          Sender: {S: event.cognitoUsername}
        }
      }
     ).promise()

  } catch (error) {
    console.log(error)   
  }

}