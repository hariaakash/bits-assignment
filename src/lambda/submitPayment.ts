import { DynamoDB } from 'aws-sdk';
import { APIGatewayProxyEvent } from 'aws-lambda';

const docClient = new DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME!;

export const handler = async (event: any) => {
  const { paymentId, userId, timestamp, description, currency, amount } = event;

  const params = {
    TableName: tableName,
    Item: {
      paymentId,
      userId,
      timestamp,
      description,
      currency,
      amount,
    },
  };
  console.log(params);

  try {
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
