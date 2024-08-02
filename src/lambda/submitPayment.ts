import { DynamoDB } from 'aws-sdk';
import { Handler } from 'aws-lambda';

const docClient = new DynamoDB.DocumentClient();
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
      Item: { paymentId, userId, timestamp, description, currency, amount },
    };
    await docClient.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Payment submission successful' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error submitting payment', error }),
    };
  }
};
