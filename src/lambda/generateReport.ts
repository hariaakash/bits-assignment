import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Handler } from 'aws-lambda';
import { getCurrentMonth } from '../helpers/utils';
import { IPaymentTable } from '../types/paymentTable.interface';

const docClient = new DynamoDBClient();
const s3 = new S3Client({});
const tableName = process.env.TABLE_NAME!;
const bucketName = process.env.BUCKET_NAME!;
const USER_PAYMENT_PERIOD_INDEX_NAME = process.env.USER_PAYMENT_PERIOD_INDEX_NAME!;
const PAYMENT_PERIOD_INDEX_NAME = process.env.PAYMENT_PERIOD_INDEX_NAME!;

interface HandlerEvent {
  userId: string;
  year: string;
  month: string;
}

export const handler: Handler = async (event: HandlerEvent, context) => {
  try {
    const { userId = null } = event;
    let { year = null, month = null } = event;

    const isParamsAvailable = year && month;
    if (!isParamsAvailable) {
      // return {
      //   statusCode: 422,
      //   body: JSON.stringify({ message: 'Parameters not found' }),
      // };
      const { year: y, month: m } = getCurrentMonth();
      year = y;
      month = m;
    }

    const currentMonthPrefix = `${year}-${month}`;

    let params: any = {
      TableName: tableName,
      IndexName: PAYMENT_PERIOD_INDEX_NAME,
      KeyConditionExpression: "paymentYearMonth = :prefix",
      ExpressionAttributeValues: {
        ':prefix': { S: currentMonthPrefix },
      },
    };
    if (userId) {
      params = {
        TableName: tableName,
        IndexName: USER_PAYMENT_PERIOD_INDEX_NAME,
        KeyConditionExpression: 'userId = :userId AND paymentYearMonth = :prefix',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':prefix': { S: currentMonthPrefix },
        },
      };
    }
    // console.log(params);
    const data = await docClient.send(new QueryCommand(params));
    // console.log(data);
    const items = data.Items ? data.Items.map(item => unmarshall(item)) : [];

    if (items.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No items to generate report' }),
      };
    }

    // Group items by userId
    const groupedItems: { [key: string]: IPaymentTable[] } = items.reduce((acc, item) => {
      (acc[item.userId] = acc[item.userId] || []).push(item);
      return acc;
    }, {} as { [key: string]: IPaymentTable[] });

    for (const [userId, userItems] of Object.entries(groupedItems)) {
      const reportData = {
          userId,
          month: currentMonthPrefix,
          items: userItems,
      };
      const reportKey = `${userId}/${currentMonthPrefix}-report.json`;
      await s3.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: reportKey,
          Body: JSON.stringify(reportData),
          ContentType: 'application/json',
      }));
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Report generation successful' }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error generating report' }),
    };
  }
};
