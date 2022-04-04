import { App } from "aws-cdk-lib";
import { ChatAppStack } from "./ChatAppStack";

const app = new App()
new ChatAppStack(app, 'serverless-chat-app', {
  stackName: 'ServerlessChatApp'
})