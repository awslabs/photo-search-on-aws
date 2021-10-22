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
import { faces } from '../photos/get-faces/index';

jest.mock('aws-sdk');
jest.mock('@elastic/elasticsearch');

const EXISTING_IMAGE_ID = 'IMAGEID_12345';
const EXISTING_IMAGE_LOCATION = 's3://foo/bar.png';
const EXISTING_IMAGE_BUCKET = 'foo';
const EXISTING_IMAGE_KEY = 'bar.png';
const EXISTING_IMAGE_BOUNDINGBOX = { Left: 1, Top: 2, Width: 10, Height: 20 };

const NOT_ON_S3_IMAGE_ID = 'NOT_ON_S3'; // there is an entry in the AES, but not on S3
const NOT_ON_S3_LOCATION = 's3://no/such.png';
const NOT_ON_S3_BUCKET = 'no';
const NOT_ON_S3_KEY = 'such.png';

const NOFACE_IMAGE_ID = 'NOFACE'; // there is an image both on AES/S3, but no face on it.
const NOFACE_IMAGE_LOCATION = 's3://noface/noface.png';
const NOFACE_IMAGE_BUCKET = 'noface';
const NOFACE_IMAGE_KEY = 'noface.png';

const INVALID_FORMAT_ID = 'WRONGIMAGE'; // there is an file both on AES/S3, but image format is invalid.
const INVALID_LOCATION = 's3://invalid/invalid.png';
const INVALID_IMAGE_BUCKET = 'invalid';
const INVALID_IMAGE_KEY = 'invalid.png';

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
          case NOT_ON_S3_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: NOT_ON_S3_IMAGE_ID,
                  image_location: NOT_ON_S3_LOCATION,
                },
              },
            };
          case NOFACE_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: NOFACE_IMAGE_ID,
                  image_location: NOFACE_IMAGE_LOCATION,
                },
              },
            };
          case INVALID_FORMAT_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: INVALID_FORMAT_ID,
                  image_location: INVALID_LOCATION,
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
      detectFaces: (param: any, callback: Function) => {
        if (param.Image.S3Object.Bucket === EXISTING_IMAGE_BUCKET && param.Image.S3Object.Name === EXISTING_IMAGE_KEY) {
          callback(null, {
            FaceDetails: [
              {
                BoundingBox: EXISTING_IMAGE_BOUNDINGBOX,
              },
            ],
          });
        } else if (
          param.Image.S3Object.Bucket === NOFACE_IMAGE_BUCKET &&
          param.Image.S3Object.Name === NOFACE_IMAGE_KEY
        ) {
          // there is an image, but Rekognition did not detected a face.
          callback(null, {
            FaceDetails: [],
          });
        } else if (param.Image.S3Object.Bucket === NOT_ON_S3_BUCKET && param.Image.S3Object.Name === NOT_ON_S3_KEY) {
          // there is no such an image on the S3.
          const err = new Error();
          // @ts-ignore
          err.code = 'InvalidS3ObjectException'; // I do not know how I can instantiate this type of err object. please fix this if you know.
          callback(err, null);
        } else if (
          param.Image.S3Object.Bucket === INVALID_IMAGE_BUCKET &&
          param.Image.S3Object.Name === INVALID_IMAGE_KEY
        ) {
          const err = new Error();
          // @ts-ignore
          err.code = 'InvalidImageFormatException';
          callback(err, null);
        } else {
          callback(new Error(), null);
        }
      },
    };
  });
}

function mockAESError() {
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return {
      get: (searchParam: any) => {
        throw new Error();
      },
    };
  });
}
function mockRekognitionError() {
  mocked(AWS.Rekognition).mockImplementationOnce((): any => {
    return {
      detectFaces: (param: any, callback: Function) => {
        callback(new Error(), null);
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
  mockRekognition();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());

  // test
  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(JSON.stringify([{ left: 1, top: 2, width: 10, height: 20 }]));
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
  mockRekognition();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());
  expect(resp.statusCode).toEqual(400);
});

test('No images found returns 404', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: 'NO_SUCH_ENTRY',
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockRekognition();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());
  expect(resp.statusCode).toEqual(404);
});

test('Found in AES, but not found on S3', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: NOT_ON_S3_IMAGE_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockRekognition();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());
  expect(resp.statusCode).toEqual(404);
});

test('Found in AES and S3, but Rekognition does not detect a face in it.', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: NOFACE_IMAGE_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockRekognition();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());
  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(JSON.stringify([]));
});

test('Found in AES and S3, but invalid image format.', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: INVALID_FORMAT_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockRekognition();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());
  expect(resp.statusCode).toEqual(400);
});

test('Something wrong with AES', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: EXISTING_IMAGE_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAESError();
  mockRekognition();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());
  expect(resp.statusCode).toEqual(500);
});

test('Something wrong with Rekognition', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      photo_id: EXISTING_IMAGE_ID,
    }, // pathParameters
    {} // queryStringParameters
  );

  mockAES();
  mockRekognitionError();

  // call testee
  const resp = await faces(event, new ElasticSearchClient({}), new AWS.Rekognition());
  expect(resp.statusCode).toEqual(500);
});
