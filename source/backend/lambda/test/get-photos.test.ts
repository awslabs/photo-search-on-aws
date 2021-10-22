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
import '@aws-cdk/assert/jest';
import { mocked } from 'ts-jest/utils';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import * as LambdaTestCommon from './lambda-test-common'; // Common module for unit tests for Lambda functions
// This is an unit test module for "get-faces" Web API
import { getPhotos, handler } from '../photos/get-photos/index';

jest.mock('aws-sdk');
jest.mock('@elastic/elasticsearch');

const EXISTING_IMAGE_ID = 'IMAGEID_12345';
const EXISTING_IMAGE_LOCATION = 's3://foo/bar.png';
const EXISTING_IMAGE_PATH = 'bar.png';
const EXISTING_IMAGE_NAME = 'Human Name';
const EXISTING_IMAGE_TAG = ['tag1', 'tag2'];

function mockAES() {
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return {
      search: (params: any) => {
        return {
          statusCode: 200
        };
      }
    };
  });
}

test('Normal Case', async () => {

  mockAES();

  // call testee
  const resp = await getPhotos(new ElasticSearchClient({}), 'tag1', 0, 10);
  
  // test
  expect(resp.statusCode).toEqual(200);
});

test('wrong page prameter returns 400', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {},  // pathParameters
    { page: 'a', } // queryStringParameters
  );
  // Create an context object for the Lambda handler
  const context = LambdaTestCommon.createLambdaContext();

  mockAES();

  // call testee
  const resp = await handler(event, context);
  // test
  expect(resp.statusCode).toEqual(400);
});

test('wrong per_page prameter returns 400', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {},  // pathParameters
    { per_page: 'a', } // queryStringParameters
  );
  // Create an context object for the Lambda handler
  const context = LambdaTestCommon.createLambdaContext();

  mockAES();

  // call testee
  const resp = await handler(event, context);

  // test
  expect(resp.statusCode).toEqual(400);
});