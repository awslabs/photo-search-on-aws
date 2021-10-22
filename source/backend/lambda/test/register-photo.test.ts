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
import { register } from '../batches/register-photo/index';

jest.mock('aws-sdk');
jest.mock('@elastic/elasticsearch');

const EXISTING_IMAGE_ID = 'IMAGEID_12345';
const EXISTING_IMAGE_LOCATION = 's3://foo/bar.png';

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
                  image_location: EXISTING_IMAGE_LOCATION,
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

function mockRekognition() {
  mocked(AWS.Rekognition).mockImplementationOnce((): any => {
    return {
      indexFaces: (param: any) => {
        return new Promise((res, rej) => {
          res({})
        });
      },
    };
  });
}


/*
 * Just Call Lambda Function
 */
test('Normal Case', async () => {
  const event = LambdaTestCommon.createS3Event('TESTBUCKET', 'TESTKEY');
  mockAES();
  mockRekognition();

  // call testee
  await register(event, new ElasticSearchClient({}), new AWS.Rekognition());

  // no response
});
