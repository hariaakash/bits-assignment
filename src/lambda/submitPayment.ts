import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';

const docClient = new DynamoDBClient();
const tableName = process.env.TABLE_NAME!;

interface HandlerEvent {
  paymentId: string;
  userId: string;
  timestamp: string;
  description: string;
  currency: string;
  amount: number;
}

export const handler: Handler = async (event: HandlerEvent, context) => {
  try {
    const { paymentId = null, userId = null, timestamp = null, description = null, currency = null, amount = null } = event;

    const isParamsAvailable = paymentId && userId && timestamp && description && currency && amount;
    if (!isParamsAvailable) {
      return {
        statusCode: 422,
        body: JSON.stringify({ message: 'Parameters not found' }),
      };
    }

    const params = {
      TableName: tableName,
      Item: {
        paymentId: { S: paymentId },
        userId: { S: userId },
        timestamp: { S: timestamp },
        description: { S: description },
        currency: { S: currency },
        amount: { N: amount.toString() },
      },
    };
    await docClient.send(new PutItemCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Payment submission successful' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error submitting payment' }),
    };
  }
};
