import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { IPaymentTable } from '../types/paymentTable.interface';

const docClient = new DynamoDBClient();
const tableName = process.env.TABLE_NAME!;

interface HandlerEvent extends IPaymentTable {}

export const handler: Handler = async (event: HandlerEvent, context) => {
  try {
    const { paymentId = uuidv4(), userId = null, paymentDate = null, description = null, currency = null, amount = null } = event;

    const isParamsAvailable = paymentId && userId && paymentDate && description && currency && amount;
    if (!isParamsAvailable) {
      return {
        statusCode: 422,
        body: JSON.stringify({ message: 'Parameters not found' }),
      };
    }

    const date = new Date(paymentDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const paymentYearMonth = `${year}-${month}`;
    const params = {
      TableName: tableName,
      Item: {
        paymentId: { S: paymentId },
        userId: { S: userId },
        paymentDate: { S: paymentDate },
        paymentYearMonth: { S: paymentYearMonth },
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
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error submitting payment' }),
    };
  }
};
