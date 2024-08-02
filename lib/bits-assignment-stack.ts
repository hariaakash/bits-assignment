import * as path from 'path';
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Bucket } from 'aws-cdk-lib/aws-s3';

export class BitsAssignmentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB
    const paymentTable = new Table(this, 'PaymentTable', {
      partitionKey: { name: 'paymentId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    paymentTable.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: { name: 'userId', type: AttributeType.STRING },
    });

    // s3
    const reportsBucket = new Bucket(this, 'ReportsBucket');

    // Lambda
    const submitPaymentFunction = new NodejsFunction(this, 'SubmitPaymentHandler', {
      runtime: Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../src/lambda/submitPayment.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: paymentTable.tableName,
      },
    });

    const generateReportFunction = new NodejsFunction(this, 'GenerateReportHandler', {
      runtime: Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../src/lambda/generateReport.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: paymentTable.tableName,
        BUCKET_NAME: reportsBucket.bucketName,
      },
    });

    // DB <> Lambda Permission
    paymentTable.grantReadWriteData(submitPaymentFunction);
    paymentTable.grantReadData(generateReportFunction);

    // S3 <> Lambda Permission
    reportsBucket.grantWrite(generateReportFunction);

    // API Gateway
    const submitPaymentApi = new LambdaRestApi(this, 'SubmitPaymentApi', {
      handler: submitPaymentFunction,
    });
  }
}
