import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';

export class BitsAssignmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB
    const paymentTable = new Table(this, 'PaymentTable', {
      partitionKey: { name: 'paymentId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Lambda
    const submitPaymentFunction = new NodejsFunction(this, 'SubmitPaymentHandler', {
      runtime: Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../src/lambda/submitPayment.ts'),
      handler: 'handler',
      environment: {
        TABLE_NAME: paymentTable.tableName,
      },
    });

    // DB <> Lambda Permission
    paymentTable.grantReadWriteData(submitPaymentFunction);

    // API Gateway
    const submitPaymentApi = new LambdaRestApi(this, 'SubmitPaymentApi', {
      handler: submitPaymentFunction,
    });
  }
}
