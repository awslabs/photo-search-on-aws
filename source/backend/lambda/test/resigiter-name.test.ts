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

// This is an unit test module for Name Registration Web API
import LambdaFunction = require('../names/resigiter-name/index');

/*
 * Success
 */
test('Name Registration Web API Test: Success', async () => {
  // Create event and context objects for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {
      name: 'test_name',
      photo_ids: ['c31ee154-3cd7-4ec9-8064-ddba47064e2b', 'fc5a99c3-f2a6-4865-b0c9-ba1fa1464e14'],
    },
    {},
    {},
    {}
  );

  // Mock settings for update documents on Elasticsearch Service
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return { update: async (params: any) => {} };
  });

  // Call Lambda handler to do unit test
  const resp = await LambdaFunction.registerNames(event, new ElasticSearchClient({}));

  // Http status code in the response must be 204 if process succeeded
  expect(resp.statusCode).toEqual(204);
});

/*
 * Validation Error #1 No Name
 */
test('Name Registration Web API Test: Validation Error #1 No Name', async () => {
  // Create event and context objects for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {
      photo_ids: ['c31ee154-3cd7-4ec9-8064-ddba47064e2b', 'fc5a99c3-f2a6-4865-b0c9-ba1fa1464e14'],
    },
    {},
    {},
    {}
  );

  // Call Lambda handler to do unit test
  const resp = await LambdaFunction.registerNames(event, new ElasticSearchClient({}));

  // Http status code in the response must be 400 (Bad Request) if process succeeded
  expect(resp.statusCode).toEqual(400);
});

/*
 * Validation Error #2 Name is not String
 */
test('Name Registration Web API Test: Validation Error #2 Name is not String', async () => {
  // Create event and context objects for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {
      name: 123,
      photo_ids: ['c31ee154-3cd7-4ec9-8064-ddba47064e2b', 'fc5a99c3-f2a6-4865-b0c9-ba1fa1464e14'],
    },
    {},
    {},
    {}
  );

  // Call Lambda handler to do unit test
  const resp = await LambdaFunction.registerNames(event, new ElasticSearchClient({}));

  // Http status code in the response must be 400 (Bad Request) if process succeeded
  expect(resp.statusCode).toEqual(400);
});

/*
 * Validation Error #3 Name is blank
 */
test('Name Registration Web API Test: Validation Error #3 Name is blank', async () => {
  // Create event and context objects for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {
      name: '',
      photo_ids: ['c31ee154-3cd7-4ec9-8064-ddba47064e2b', 'fc5a99c3-f2a6-4865-b0c9-ba1fa1464e14'],
    },
    {},
    {},
    {}
  );

  // Call Lambda handler to do unit test
  const resp = await LambdaFunction.registerNames(event, new ElasticSearchClient({}));

  // Http status code in the response must be 400 (Bad Request) if process succeeded
  expect(resp.statusCode).toEqual(400);
});

/*
 * Validation Error Validation Error #4 No Photo ID
 */
test('Name Registration Web API Test: Validation Error #4 No Photo ID', async () => {
  // Create event and context objects for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {
      name: 'test_name',
    },
    {},
    {},
    {}
  );

  // Call Lambda handler to do unit test
  const resp = await LambdaFunction.registerNames(event, new ElasticSearchClient({}));

  // Http status code in the response must be 400 (Bad Request) if process succeeded
  expect(resp.statusCode).toEqual(400);
});

/*
 * Validation Error Validation Error #5 Photo IDs is not Array
 */
test('Name Registration Web API Test: Validation Error #5 Photo IDs is not Array', async () => {
  // Create event and context objects for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {
      name: 'test_name',
      photo_ids: 'photo_ids',
    },
    {},
    {},
    {}
  );

  // Call Lambda handler to do unit test
  const resp = await LambdaFunction.registerNames(event, new ElasticSearchClient({}));

  // Http status code in the response must be 400 (Bad Request) if process succeeded
  expect(resp.statusCode).toEqual(400);
});

/*
 * Validation Error #6 Photo IDs with not-string values
 */
test('Name Registration Web API Test: Validation Error #6 Photo IDs with not-string values', async () => {
  // Create event and context objects for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    {
      name: 'test_name',
      photo_ids: ['c31ee154-3cd7-4ec9-8064-ddba47064e2b', 123],
    },
    {},
    {},
    {}
  );

  // Call Lambda handler to do unit test
  const resp = await LambdaFunction.registerNames(event, new ElasticSearchClient({}));

  // Http status code in the response must be 400 (Bad Request) if process succeeded
  expect(resp.statusCode).toEqual(400);
});
