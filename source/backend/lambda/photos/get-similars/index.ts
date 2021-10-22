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
import { APIGatewayEventRequestContext, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { getImageLocation, aesSearchForImage, createResponse, makeResponseObject } from '../../common/common';
import sharp from 'sharp';
import { URL } from 'url';

const AES_PROTOCOL = process.env.AES_PROTOCOL || 'https';
const AES_INDEX_NAME = process.env.AES_INDEX_NAME || 'photosearch';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'testbucket';
const S3_RESIZED_PATH = process.env.S3_RESIZED_PATH || 'resized';
const CUSTOM_USER_AGENT = process.env.CUSTOM_USER_AGENT;

const AESCLIENT = new ElasticSearchClient({
  node: `${AES_PROTOCOL}://${process.env.AES_NODE_ENDPOINT}`,
});
const REKOGNITIONCLIENT = new AWS.Rekognition(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});
const S3CLIENT = new AWS.S3(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});

interface XYWH {
  x: number;
  y: number;
  w: number;
  h: number;
}

const searchByImage = async (
  rekognitionClient: AWS.Rekognition,
  bucket: string,
  key: string
): Promise<Array<string>> => {
  return new Promise((resolve, reject) => {
    rekognitionClient.searchFacesByImage(
      {
        CollectionId: AES_INDEX_NAME,
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
      },
      (err: AWS.AWSError, data: AWS.Rekognition.Types.SearchFacesByImageResponse) => {
        if (err) {
          reject(err);
          return;
        }
        const imageIds: Array<string> = [];
        if (data.FaceMatches) {
          for (const face of data.FaceMatches) {
            if (face.Face && face.Face.ExternalImageId) {
              imageIds.push(face.Face.ExternalImageId);
            }
          }
        }
        resolve(imageIds);
      }
    );
  });
};

const getObjectFromS3 = async (s3Client: AWS.S3, imageLocation: string): Promise<[AWS.S3.Body | undefined, string]> => {
  const s3url = new URL(imageLocation);
  const bucket = s3url.host;
  const key = s3url.pathname.substring(1);
  return new Promise((resolve, reject) => {
    s3Client.getObject(
      {
        Bucket: bucket,
        Key: key,
      },
      (err: AWS.AWSError, data: AWS.S3.Types.GetObjectOutput) => {
        if (err) {
          reject(err);
          return;
        }
        resolve([data.Body, bucket]);
      }
    );
  });
};

const uploadResizedImage = async (
  s3Client: AWS.S3,
  bucket: string,
  imageId: string,
  imageBlob: AWS.S3.Body | undefined,
  xywh: XYWH
): Promise<string> => {
  // resize and write as png.
  try {
    const image = sharp(imageBlob as Buffer);
    const metadata = await image.metadata();
    const left = Math.floor((metadata.width || 0) * xywh.x);
    const top = Math.floor((metadata.height || 0) * xywh.y);
    const width = Math.floor((metadata.width || 0) * xywh.w);
    const height = Math.floor((metadata.height || 0) * xywh.h);
    const buffer = await image.extract({ left, top, width, height }).toFormat('png').toBuffer();

    return new Promise((resolve, reject) => {
      const key = `${S3_RESIZED_PATH}/${imageId}/${xywh.x}_${xywh.y}_${xywh.w}_${xywh.h}.png`;
      s3Client.putObject(
        {
          Body: buffer,
          Bucket: bucket,
          ContentType: 'image/png',
          Key: key,
        },
        (err: AWS.AWSError, data: AWS.S3.PutObjectOutput) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(key);
        }
      );
    });
  } catch (err) {
    console.log(err);
    return '';
  }
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  return similars(event, AESCLIENT, REKOGNITIONCLIENT, S3CLIENT);
};

export const similars = async (
  event: APIGatewayProxyEvent,
  aesClient: ElasticSearchClient,
  rekognitionClient: AWS.Rekognition,
  s3Client: AWS.S3
): Promise<APIGatewayProxyResult> => {
  if (!event.pathParameters || !event.pathParameters.photo_id) {
    return createResponse(400, 'photo_id parameter is missing.');
  }
  if (!event.queryStringParameters || !event.queryStringParameters.location) {
    return createResponse(400, 'location parameter is missing.');
  }
  const xywh = { x: 0, y: 0, w: 0, h: 0 };
  try {
    const [w, h, x, y] = event.queryStringParameters.location.split(' ');
    xywh.x = +x;
    xywh.y = +y;
    xywh.w = +w;
    xywh.h = +h;
  } catch (err) {
    return createResponse(400, 'Invalid location parameter.');
  }

  try {
    const imageLocation = await getImageLocation(aesClient, event.pathParameters.photo_id, AES_INDEX_NAME);
    if (!imageLocation) {
      return createResponse(404, 'Image not found');
    }
    const [imageBlob, bucket] = await getObjectFromS3(s3Client, imageLocation);
    const resizedKey = await uploadResizedImage(s3Client, bucket, event.pathParameters.photo_id, imageBlob, xywh);
    if (!resizedKey) {
      return createResponse(400, 'Invalid image format.');
    }
    const imageIds = await searchByImage(rekognitionClient, bucket, resizedKey);
    const results = [];
    for (const imageId of imageIds) {
      const imageObj = await aesSearchForImage(aesClient, imageId, AES_INDEX_NAME);
      if (!imageObj) {
        continue;
      }
      results.push(makeResponseObject(s3Client, S3_BUCKET_NAME, imageId, imageObj));
    }
    return createResponse(
      200,
      JSON.stringify({
        results,
        page: 1,
        per_page: results.length,
      })
    );
  } catch (err) {
    console.log(err);
    if (err.code === 'NoSuchKey') {
      return createResponse(404, 'Image not found');
    }
    if (err.code === 'InvalidParameterException') {
      return createResponse(404, 'Image not found');
    }
    return createResponse(500);
  }
};
