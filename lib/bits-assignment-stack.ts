import * as path from 'path';
import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';

export class BitsAssignmentStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB
    const paymentTable = new Table(this, 'PaymentTable', {
      partitionKey: { name: 'paymentId', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const userPaymentPeriodIndex = 'UserPaymentPeriodIndex';
    paymentTable.addGlobalSecondaryIndex({
      indexName: userPaymentPeriodIndex,
      partitionKey: { name: 'userId', type: AttributeType.STRING },
      sortKey: { name: 'paymentYearMonth', type: AttributeType.STRING },
    });
    const paymentPeriodIndex = 'PaymentPeriodIndex';
    paymentTable.addGlobalSecondaryIndex({
      indexName: paymentPeriodIndex,
      partitionKey: { name: 'paymentYearMonth', type: AttributeType.STRING },
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
        USER_PAYMENT_PERIOD_INDEX_NAME: userPaymentPeriodIndex,
        PAYMENT_PERIOD_INDEX_NAME: paymentPeriodIndex,
      },
    });

    // Cloudwatch
    const generateMonthlyReportRule = new Rule(this, 'GenerateMonthlyReportRule', {
      schedule: Schedule.cron({
        minute: '0',
        hour: '0',
        day: '1',
        month: '*',
        year: '*',
      }),
    });

    // DB <> Lambda
    paymentTable.grantReadWriteData(submitPaymentFunction);
    paymentTable.grantReadData(generateReportFunction);

    // S3 <> Lambda
    reportsBucket.grantWrite(generateReportFunction);

    // Rule <> Lambda
    generateMonthlyReportRule.addTarget(new LambdaFunction(generateReportFunction));

    // API Gateway
    const submitPaymentApi = new LambdaRestApi(this, 'SubmitPaymentApi', {
      handler: submitPaymentFunction,
    });
  }
}
