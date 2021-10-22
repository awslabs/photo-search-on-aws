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
import * as LambdaTestCommon from './lambda-test-common';
import '@aws-cdk/assert/jest';

// Mock settings for Elasticsearch Service access
import { mocked } from 'ts-jest/utils';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
jest.mock('@elastic/elasticsearch');

// This is an unit test module for Name Registration Web API
import { setTags } from '../photos/set-tags/index';

const EXISTING_IMAGE_ID = 'IMAGEID_12345';

function mockAES() {
  // Mock settings for update documents on Elasticsearch Service
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return {
      update: async (params: any) => {
        switch (params.id) {
          case EXISTING_IMAGE_ID:
            // OK
            return;
          default:
            const err = new Error();
            // @ts-ignore
            err.meta = {
              statusCode: 404,
            };
            throw err;
        }
      },
    };
  });
}

test('Normal Case', async () => {
  // Create an event object for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    ['Tag1', 'Tag2'], // body
    {}, // headers
    {
      photo_id: EXISTING_IMAGE_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();

  // call testee
  const resp = await setTags(event, new ElasticSearchClient({}));

  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(event.body);
});

test('photo_id parameter missing returns 400', async () => {
  // Create an event object for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    ['Tag1', 'Tag2'], // body
    {}, // headers
    {
      photo_id: '',
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();

  // call testee
  const resp = await setTags(event, new ElasticSearchClient({}));

  expect(resp.statusCode).toEqual(400);
});

test('unknown photo_id parameter returns 404', async () => {
  // Create an event object for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    ['Tag1', 'Tag2'], // body
    {}, // headers
    {
      photo_id: 'NOSUCHIMAGE',
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();

  // call testee
  const resp = await setTags(event, new ElasticSearchClient({}));

  expect(resp.statusCode).toEqual(404);
});

test('no tags still returns 200', async () => {
  // Create an event object for the Lambda handler
  const event = LambdaTestCommon.createLambdaEvent(
    [], // body
    {}, // headers
    {
      photo_id: EXISTING_IMAGE_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();

  // call testee
  const resp = await setTags(event, new ElasticSearchClient({}));

  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(event.body);
});
