import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { handler } from '../src/lambda/submitPayment';

process.env.TABLE_NAME = 'TestTable';

describe('Lambda Handler', () => {
  const cb = () => {};
  const ddbMock = mockClient(DynamoDBClient);

  beforeEach(() => {
    ddbMock.reset();
  });

  test('should return 422 if any parameter is missing', async () => {
    ddbMock.on(PutItemCommand).resolves({});

    const event = {
      paymentId: uuidv4(),
      userId: uuidv4(),
      paymentDate: '',
      description: 'Test payment',
      currency: 'USD',
      amount: 100,
    };

    const result = await handler(event, {} as any, cb);

    expect(result.statusCode).toBe(422);
    expect(JSON.parse(result.body)).toEqual({ message: 'Parameters not found' });
  });

  test('should return 200 if all parameters are provided', async () => {
    ddbMock.on(PutItemCommand).resolves({});

    const event = {
      paymentId: uuidv4(),
      userId: uuidv4(),
      paymentDate: '2024-08-02T12:00:00Z',
      description: 'Test payment',
      currency: 'USD',
      amount: 100,
    };

    const result = await handler(event, {} as any, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'Payment submission successful' });
  });

  test('should return 500 if there is an error with DynamoDB', async () => {
    ddbMock.on(PutItemCommand).rejects('DynamoDB error');

    const event = {
      paymentId: uuidv4(),
      userId: uuidv4(),
      paymentDate: '2024-08-02T12:00:00Z',
      description: 'Test payment',
      currency: 'USD',
      amount: 100,
    };

    const result = await handler(event, {} as any, cb);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: 'Error submitting payment' });
  });
});
