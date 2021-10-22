/**
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
 *  with the License. A copy of the License is located at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 */
import LambdaTestCommon = require('./lambda-test-common'); // Common module for unit tests for Lambda functions
import '@aws-cdk/assert/jest';

// Mock settings for Elasticsearch Service access
import { mocked } from 'ts-jest/utils';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
jest.mock('@elastic/elasticsearch');

process.env['S3_BUCKET_NAME'] = 'datastoresstack2-s3bucketforregisters3buckete2f9e-1iaae7ab6hbhv';

// This is an unit test module for Name Registration Web API
import LambdaFunction = require('../photos/get-upload-urls/index');

test('Norma Case', async () => {
  // Create an event object for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {}, // pathParameters
    {
      count: '2',
      type: 'search',
    } // queryStringParameters
  );

  // Mock settings for update documents on Elasticsearch Service
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return { update: async (params: any) => {} };
  });

  // Create an context object for the Lambda handler
  const context = LambdaTestCommon.createLambdaContext();

  // Call testee
  const resp = await LambdaFunction.handler(event, context);
  const respBody = JSON.parse(resp.body);

  expect(resp.statusCode).toEqual(200);
  expect(respBody.results).toHaveLength(parseInt(event.queryStringParameters!.count!));
  expect(respBody.results[0]).toHaveProperty('url');
  expect(respBody.results[0]).toHaveProperty('id');
  expect(respBody.results[1]).toHaveProperty('url');
  expect(respBody.results[1]).toHaveProperty('id');
});

test('type parameter missing returns 400', async () => {
  // Create an event object for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {}, // pathParameters
    {
      count: '2',
      type: '',
    } // queryStringParameters
  );

  // Mock settings for update documents on Elasticsearch Service
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return { update: async (params: any) => {} };
  });

  // Create an context object for the Lambda handler
  const context = LambdaTestCommon.createLambdaContext();

  // Call testee
  const resp = await LambdaFunction.handler(event, context);
  expect(resp.statusCode).toEqual(400);
});

test('Unknown type parameter returns 400', async () => {
  // Create an event object for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {}, // pathParameters
    {
      count: '2',
      type: 'foobar',
    } // queryStringParameters
  );

  // Mock settings for update documents on Elasticsearch Service
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return { update: async (params: any) => {} };
  });

  // Create an context object for the Lambda handler
  const context = LambdaTestCommon.createLambdaContext();

  // Call testee
  const resp = await LambdaFunction.handler(event, context);
  expect(resp.statusCode).toEqual(400);
});
