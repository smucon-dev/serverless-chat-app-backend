import { CfnOutput, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment } from "aws-cdk-lib/aws-s3-deployment";


export class WebAppDeployment {

  private stack: Stack
  private suffix: string
  public deploymentBucket: Bucket

  constructor(stack: Stack, bucketSuffix: string) {
    this.stack = stack
    this.suffix = bucketSuffix
    this.initialize()
  }

  private initialize() {

    // create bucket
    const bucketName = 'serverless-chat-app-' + this.suffix
    this.deploymentBucket = new Bucket(
      this.stack,
      'serverless-chat-app-bucket',
      {
        bucketName: bucketName,
        publicReadAccess: true,
        websiteIndexDocument: 'index.hmtml'
      }
    )

    // deploy sources into bucket
    // new BucketDeployment(
    //   this.stack,
    //   'serverless-web-app-bucket-deployment',
    //   {
    //     destinationBucket: this.deploymentBucket
    //   }
    // )

    new CfnOutput(this.stack, 'ServerlessChatAppS3Url', {
      value: this.deploymentBucket.bucketWebsiteUrl
    })

  }

}