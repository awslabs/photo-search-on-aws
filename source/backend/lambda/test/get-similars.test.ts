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
import sharp from 'sharp';
import * as LambdaTestCommon from './lambda-test-common';
import { similars } from '../photos/get-similars/index';

jest.mock('aws-sdk');
jest.mock('@elastic/elasticsearch');

const IMAGE_BUFFER = 'DUMMY PNG DATA!';
const RESIZED_IMAGE_BUFFER = 'DUMMY RESIZED PNG DATA!';

const EXISTING_IMAGE_ID = 'IMAGEID_12345';
const EXISTING_IMAGE_NAME = 'existing_name';
const EXISTING_IMAGE_LOCATION = 's3://foo/bar.png';
const EXISTING_IMAGE_BUCKET = 'foo';
const EXISTING_IMAGE_KEY = 'bar.png';

const NOT_ON_S3_IMAGE_ID = 'NOT_ON_S3'; // there is an entry in the AES, but not on S3
const NOT_ON_S3_IMAGE_NAME = 'not_on_s3_name';
const NOT_ON_S3_LOCATION = 's3://no/such.png';

const NOSIMILAR_IMAGE_ID = 'NOSIMILAR';
const NOSIMILAR_IMAGE_NAME = 'No Similar';
const NOSIMILAR_IMAGE_LOCATION = 's3://nosimilar/bar.png';
const NOSIMILAR_IMAGE_BUCKET = 'nosimilar';
const NOSIMILAR_IMAGE_KEY = 'bar.png';

const FOUND1_IMAGE_ID = 'FOUND1';
const FOUND1_IMAGE_NAME = 'NAME1';
const FOUND1_IMAGE_LOCATION = 's3://found/1.png';
const FOUND1_TAGS = ['tag1', 'tag2'];
const FOUND1_FILEPATH = '1.png';
const FOUND2_IMAGE_ID = 'FOUND2';
const FOUND2_IMAGE_NAME = 'NAME2';
const FOUND2_IMAGE_LOCATION = 's3://found/foo/bar/2.jpeg';
const FOUND2_FILEPATH = 'foo/bar/2.jpeg';

function mockAES() {
  mocked(ElasticSearchClient).mockImplementationOnce((): any => {
    return {
      get: (getParam: any) => {
        switch (getParam.id) {
          case EXISTING_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: EXISTING_IMAGE_ID,
                  name: EXISTING_IMAGE_NAME,
                  image_location: EXISTING_IMAGE_LOCATION,
                },
              },
            };
          case NOSIMILAR_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: NOSIMILAR_IMAGE_ID,
                  name: NOSIMILAR_IMAGE_NAME,
                  image_location: NOSIMILAR_IMAGE_LOCATION,
                },
              },
            };
          case NOT_ON_S3_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: NOT_ON_S3_IMAGE_ID,
                  name: NOT_ON_S3_IMAGE_NAME,
                  image_location: NOT_ON_S3_LOCATION,
                },
              },
            };
          case FOUND1_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: FOUND1_IMAGE_ID,
                  name: FOUND1_IMAGE_NAME,
                  image_location: FOUND1_IMAGE_LOCATION,
                  tags: FOUND1_TAGS,
                },
              },
            };
          case FOUND2_IMAGE_ID:
            return {
              statusCode: 200,
              body: {
                _source: {
                  image_id: FOUND2_IMAGE_ID,
                  name: FOUND2_IMAGE_NAME,
                  image_location: FOUND2_IMAGE_LOCATION,
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
      searchFacesByImage: (param: AWS.Rekognition.SearchFacesByImageRequest, callback: Function) => {
        if (
          param.Image.S3Object?.Bucket === EXISTING_IMAGE_BUCKET &&
          param.Image.S3Object?.Name?.startsWith('resize') &&
          param.Image.S3Object?.Name?.endsWith('png')
        ) {
          const res: AWS.Rekognition.Types.SearchFacesByImageResponse = {
            FaceMatches: [
              {
                Face: {
                  ExternalImageId: FOUND1_IMAGE_ID,
                },
              },
              {
                Face: {
                  ExternalImageId: FOUND2_IMAGE_ID,
                },
              },
            ],
          };
          callback(null, res);
        } else if (
          param.Image.S3Object?.Bucket === NOSIMILAR_IMAGE_BUCKET &&
          param.Image.S3Object?.Name?.startsWith('resize') &&
          param.Image.S3Object?.Name?.endsWith('png')
        ) {
          callback(null, {});
        } else {
          callback(new Error('error'), null);
        }
      },
    };
  });
}

function mockS3(location: string) {
  mocked(AWS.S3).mockImplementationOnce((): any => {
    return {
      getObject: (param: AWS.S3.GetObjectRequest, callback: Function) => {
        console.log(param.Bucket + ':' + param.Key);
        if (param.Bucket === EXISTING_IMAGE_BUCKET && param.Key === EXISTING_IMAGE_KEY) {
          callback(null, {
            Body: IMAGE_BUFFER,
          });
        } else if (param.Bucket === NOSIMILAR_IMAGE_BUCKET && param.Key === NOSIMILAR_IMAGE_KEY) {
          callback(null, {
            Body: IMAGE_BUFFER,
          });
        } else {
          // there is no such an image on the S3.
          const err = Error();
          // @ts-ignore
          err.code = 'NoSuchKey';
          callback(err, null);
        }
      },
      putObject: (param: AWS.S3.PutObjectRequest, callback: Function) => {
        const [w, h, x, y] = location.split(' ');
        const filename = `${x}_${y}_${w}_${h}.png`;
        if (
          param.Body === RESIZED_IMAGE_BUFFER &&
          param.Bucket === EXISTING_IMAGE_BUCKET &&
          param.ContentType === 'image/png' &&
          param.Key === `resized/${EXISTING_IMAGE_ID}/${filename}`
        ) {
          callback(null, {});
        } else if (
          param.Body === RESIZED_IMAGE_BUFFER &&
          param.Bucket === NOSIMILAR_IMAGE_BUCKET &&
          param.ContentType === 'image/png' &&
          param.Key === `resized/${NOSIMILAR_IMAGE_ID}/${filename}`
        ) {
          callback(null, {});
        } else {
          callback(new Error('error'), null);
        }
      },
      getSignedUrl: (param: any, callback: Function) => {
        return 'SIGNEDURL';
      },
    };
  });
}

test('Normal Case', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: EXISTING_IMAGE_ID,
    },
    {
      // queryStringParameters
      location: '100 200 10 20',
    }
  );

  mockAES();
  mockRekognition();
  mockS3(event.queryStringParameters!.location!);

  // call testee
  const resp = await similars(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  const res = [
    {
      id: FOUND1_IMAGE_ID,
      name: FOUND1_IMAGE_NAME,
      url: 'SIGNEDURL',
      tags: FOUND1_TAGS,
    },
    {
      id: FOUND2_IMAGE_ID,
      name: FOUND2_IMAGE_NAME,
      url: 'SIGNEDURL',
      tags: [],
    },
  ];
  const result = { results: res, page: 1, per_page: res.length };
  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(JSON.stringify(result));
});

test('No Path Parameter returns 400', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: '',
    },
    {
      // queryStringParameters
      location: '100 200 10 20',
    }
  );

  mockAES();
  mockRekognition();
  mockS3(event.queryStringParameters!.location!);

  // call testee
  const resp = await similars(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  expect(resp.statusCode).toEqual(400);
});

test('No Query Parameter returns 400', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: EXISTING_IMAGE_ID,
    },
    {
      // queryStringParameters
      location: '',
    }
  );

  mockAES();
  mockRekognition();
  mockS3(event.queryStringParameters!.location!);

  // call testee
  const resp = await similars(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

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
    {
      // queryStringParameters
      location: '100 200 10 20',
    }
  );

  mockAES();
  mockRekognition();
  mockS3(event.queryStringParameters!.location!);

  // call testee
  const resp = await similars(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  expect(resp.statusCode).toEqual(404);
});

test('Found in AES, but not found on S3', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: NOT_ON_S3_IMAGE_ID,
    },
    {
      // queryStringParameters
      location: '100 200 10 20',
    }
  );

  mockAES();
  mockRekognition();
  mockS3(event.queryStringParameters!.location!);

  // call testee
  const resp = await similars(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  expect(resp.statusCode).toEqual(404);
});

test('Rekognition did not find any similar faces', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: NOSIMILAR_IMAGE_ID,
    },
    {
      // queryStringParameters
      location: '100 200 10 20',
    }
  );

  mockAES();
  mockRekognition();
  mockS3(event.queryStringParameters!.location!);

  // call testee
  const resp = await similars(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  const res: Array<any> = [];
  const result = { results: res, page: 1, per_page: res.length };
  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(JSON.stringify(result));
});

function mockRekognitionReturningDeletedImages() {
  mocked(AWS.Rekognition).mockImplementationOnce((): any => {
    return {
      searchFacesByImage: (param: AWS.Rekognition.SearchFacesByImageRequest, callback: Function) => {
        const res: AWS.Rekognition.Types.SearchFacesByImageResponse = {
          FaceMatches: [
            {
              Face: {
                ExternalImageId: 'NO_SUCH_IMAGE_IN_AES',
              },
            },
          ],
        };
        callback(null, res);
      },
    };
  });
}

test('Rekognition found a similar image, but that image was not in the AES anymore.', async () => {
  const event = LambdaTestCommon.createLambdaEvent(
    {}, // body
    {}, // headers
    {
      // pathParameters
      photo_id: EXISTING_IMAGE_ID,
    },
    {
      // queryStringParameters
      location: '100 200 10 20',
    }
  );

  mockAES();
  mockRekognitionReturningDeletedImages();
  mockS3(event.queryStringParameters!.location!);

  // call testee
  const resp = await similars(event, new ElasticSearchClient({}), new AWS.Rekognition(), new AWS.S3());

  // test
  const res: Array<any> = [];
  const result = { results: res, page: 1, per_page: res.length };
  expect(resp.statusCode).toEqual(200);
  expect(resp.body).toEqual(JSON.stringify(result));
});
