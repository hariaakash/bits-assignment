import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { handler } from '../src/lambda/generateReport';

process.env.TABLE_NAME = 'TestTable';
process.env.BUCKET_NAME = 'TestBucket';
process.env.USER_PAYMENT_DATE_INDEX_NAME = 'UserPaymentDateIndex';
process.env.PAYMENT_DATE_INDEX_NAME = 'PaymentDateIndex';

describe('Lambda Handler', () => {
  const cb = () => {};
  const ddbMock = mockClient(DynamoDBClient);
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    ddbMock.reset();
    s3Mock.reset();
  });

  test('should return 200 and no items message if there are no items', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      userId: uuidv4(),
      year: '2024',
      month: '08',
    };

    const result = await handler(event, {} as any, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'No items to generate report' });
  });

  test('should return 200 and generate reports if items are found', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { userId: { S: uuidv4() }, paymentDate: { S: '2024-08-01' }, amount: { N: '100' } },
        { userId: { S: uuidv4() }, paymentDate: { S: '2024-08-02' }, amount: { N: '150' } },
      ],
    });
    s3Mock.on(PutObjectCommand).resolves({});

    const event = {
      userId: uuidv4(),
      year: '2024',
      month: '08',
    };

    const result = await handler(event, {} as any, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'Report generation successful' });
  });

  test('should use current month if year and month are not provided', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const event = {
      userId: uuidv4(),
      year: '',
      month: '',
    };

    const result = await handler(event, {} as any, cb);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: 'No items to generate report' });
  });

  test('should return 500 if there is an error with DynamoDB', async () => {
    ddbMock.on(QueryCommand).rejects('DynamoDB error');

    const event = {
      userId: uuidv4(),
      year: '2024',
      month: '08',
    };

    const result = await handler(event, {} as any, cb);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: 'Error generating report' });
  });
});
