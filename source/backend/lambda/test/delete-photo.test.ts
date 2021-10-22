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
import { deletePhotos } from '../photos/delete-photo/index';

jest.mock('aws-sdk');
jest.mock('@elastic/elasticsearch');

const EXISTING_IMAGE_ID = 'IMAGEID_12345';
const EXISTING_IMAGE_LOCATION = 's3://foo/bar.png';
const EXISTING_REKOGNITION_ID = 'IMAGEID_12345_rekognition_id';
const EXISTING_IMAGE_BUCKET = 'foo';
const EXISTING_IMAGE_KEY = 'bar.png';
const EXISTING_VERSIONID = 'version-id-existing';

const NOT_ON_S3_IMAGE_ID = 'NOT_ON_S3';
const NOT_ON_S3_LOCATION = 's3://no/such/file.png';
const NOT_ON_S3_REKOGNITION_ID = 'NOT_ON_S3_REKOGNITION_ID';

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
                  rekognition_id: EXISTING_REKOGNITION_ID,
                },
              },
            };
          case NOT_ON_S3_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: NOT_ON_S3_IMAGE_ID,
                  image_location: NOT_ON_S3_LOCATION,
                  rekognition_id: NOT_ON_S3_REKOGNITION_ID,
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
      delete: (deleteParam: any) => {
        switch (deleteParam.id) {
          case EXISTING_IMAGE_ID:
          case NOT_ON_S3_IMAGE_ID:
            return { statusCode: 200 };
          default:
            return { statusCode: 404 };
        }
      },
    };
  });
}

function mockRekognition() {
  mocked(AWS.Rekognition).mockImplementationOnce((): any => {
    return {
      deleteFaces: (param: AWS.Rekognition.Types.DeleteFacesRequest) => {
        return {
          promise: () => {
            return new Promise((resolve) => {
              resolve({});
            });
          },
        };
      },
    };
  });
}

function mockS3() {
  mocked(AWS.S3).mockImplementationOnce((): any => {
    return {
      listObjectVersions: (param: AWS.S3.ListObjectVersionsRequest) => {
        return {
          promise: () => {
            if (param.Bucket === EXISTING_IMAGE_BUCKET && param.Prefix === EXISTING_IMAGE_KEY) {
              return new Promise((resolve, reject) => {
                const res: AWS.S3.ListObjectVersionsOutput = {
                  Versions: [{ VersionId: EXISTING_VERSIONID, Key: EXISTING_IMAGE_KEY }],
                };
                resolve(res);
              });
            }
            return new Promise((resolve, reject) => {
              reject(new Error());
            });
          },
        };
      },
      deleteObjects: (param: AWS.S3.DeleteObjectsRequest) => {
        if (
          param.Bucket === EXISTING_IMAGE_BUCKET &&
          param.Delete.Objects[0].Key === EXISTING_IMAGE_KEY &&
          param.Delete.Objects[0].VersionId
        ) {
          return {
            promise: () => {
              return new Promise((resolve) => {
                resolve({});
              });
            },
          };
        } else {
          throw new Error(); // this might be different from real S3 behavior, but the test needs to check parameters.
        }
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
  mockRekognition();

  // call teste
  const resp = await deletePhotos(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  expect(resp.statusCode).toEqual(204);
  expect(resp.body).toEqual('');
});

test('No parameter returns 400', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: '',
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockS3();
  mockRekognition();

  // call testee
  const resp = await deletePhotos(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());
  expect(resp.statusCode).toEqual(400);
});

test('No such entry in AES, but it still returns 204', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: 'NO_SUCH_ENTRY',
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockS3();
  mockRekognition();

  // call teste
  const resp = await deletePhotos(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  expect(resp.statusCode).toEqual(204);
  expect(resp.body).toEqual('');
});

test('No such file on the S3, but it still returns 204', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: 'NOT_ON_S3',
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockS3();
  mockRekognition();

  // call teste
  const resp = await deletePhotos(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  expect(resp.statusCode).toEqual(204);
  expect(resp.body).toEqual('');
});
