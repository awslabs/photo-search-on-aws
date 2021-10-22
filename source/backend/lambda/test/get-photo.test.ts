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
import * as AWS from 'aws-sdk';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import * as LambdaTestCommon from './lambda-test-common'; // Common module for unit tests for Lambda functions
// This is an unit test module for "get-faces" Web API
import { getPhoto } from '../photos/get-photo/index';

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
      get: (getParams: any) => {
        switch (getParams.id) {
          case EXISTING_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: EXISTING_IMAGE_ID,
                  name: EXISTING_IMAGE_NAME,
                  image_location: EXISTING_IMAGE_LOCATION,
                  tags: EXISTING_IMAGE_TAG,
                },
              },
            };
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


function mockS3() {
  mocked(AWS.S3).mockImplementationOnce((): any => {
    return {
      getSignedUrl: (param: any, callback: Function) => {
        return 'SIGNEDURL';
      },
    };
  });
}

/*
 * Just Call Lambda Function
 */
test('Normal Case', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: EXISTING_IMAGE_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockS3();
  // call testee
  const resp = await getPhoto(event, new ElasticSearchClient({}), new AWS.S3());

  // test
  const res = {
    id: EXISTING_IMAGE_ID,
    name: EXISTING_IMAGE_NAME,
    url: 'SIGNEDURL',
    tags: EXISTING_IMAGE_TAG,
  };
  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(JSON.stringify(res));
});

test('No Path Parameter returns 400', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: '',
    },
    {} // queryStringParameters
  );

  mockAES();

  // call testee
  const resp = await getPhoto(event, new ElasticSearchClient({}), new AWS.S3({}));

  // test
  expect(resp.statusCode).toEqual(400);
});

test('No image found returns 404.', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: 'NOSUCHIMAGEID',
    },
    {} // queryStringParameters
  );

  mockAES();

  // call testee
  const resp = await getPhoto(event, new ElasticSearchClient({}), new AWS.S3({}));

  // test
  expect(resp.statusCode).toEqual(404);
});
