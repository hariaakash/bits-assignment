import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { Handler } from 'aws-lambda';

const docClient = new DynamoDBClient();
const s3 = new S3Client({});
const tableName = process.env.TABLE_NAME!;
const bucketName = process.env.BUCKET_NAME!;

interface HandlerEvent {
  userId: string;
  year: string;
  month: string;
}

export const handler: Handler = async (event: HandlerEvent, context) => {
  try {
    const { userId = null, year = null, month = null } = event;

    const isParamsAvailable = userId && year && month;
    if (!isParamsAvailable) {
      return {
        statusCode: 422,
        body: JSON.stringify({ message: 'Parameters not found' }),
      };
    }

    const currentMonthPrefix = `${year}-${month}`;
    console.log(currentMonthPrefix);

    const params = {
      TableName: tableName,
      IndexName: 'userId-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': { S: userId },
        // ':prefix': { S: currentMonthPrefix },
      },
    };
    const data = await docClient.send(new QueryCommand(params));
    console.log(data);
    const items = data.Items ? data.Items.map(item => unmarshall(item)) : [];

    if (items.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No items to generate report' }),
      };
    }

    const reportData = {
        userId,
        month: currentMonthPrefix,
        items: items,
    };
    const reportKey = `${userId}/${currentMonthPrefix}-report.json`;
    await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: reportKey,
        Body: JSON.stringify(reportData),
        ContentType: 'application/json',
    }));
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
