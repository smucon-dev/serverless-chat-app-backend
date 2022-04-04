import { AWSError, CognitoIdentityServiceProvider } from "aws-sdk";

const USER_POOL_ID = process.env.USER_POOL_ID || ''
const cognito = new CognitoIdentityServiceProvider()


export async function handler(event: any, context: any) {

  try {    
    const data = await cognito.listUsers({
                      UserPoolId: USER_POOL_ID,
                      AttributesToGet: [],
                      Filter: '',
                      Limit: 60
                    }).promise()
    const logins: string[] = []
    data.Users?.forEach(user => {
      if (user.Username && event.cognitoUsername !== user.Username) {
        logins.push(user.Username)
      }
    })
    return logins

  } catch (error) {
    return error
  }

  

}