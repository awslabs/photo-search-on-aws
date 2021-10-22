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
import { getImageLocation, createResponse } from '../../common/common';

const AES_PROTOCOL = process.env.AES_PROTOCOL || 'https';
const AES_INDEX_NAME = process.env.AES_INDEX_NAME || 'photosearch';
const CUSTOM_USER_AGENT = process.env.CUSTOM_USER_AGENT;

const AESCLIENT = new ElasticSearchClient({
  node: `${AES_PROTOCOL}://${process.env.AES_NODE_ENDPOINT}`,
});
const REKOGNITIONCLIENT = new AWS.Rekognition(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});

interface LTWH {
  left: number | undefined;
  top: number | undefined;
  width: number | undefined;
  height: number | undefined;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  return faces(event, AESCLIENT, REKOGNITIONCLIENT);
};

const detectFaces = async (rekognitionClient: AWS.Rekognition, imageLocation: string): Promise<Array<LTWH>> => {
  const [bucket, key] = imageLocation.split('://')[1].split('/');
  return new Promise((resolve, reject) => {
    rekognitionClient.detectFaces(
      {
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: key,
          },
        },
      },
      (err: Error, data: AWS.Rekognition.Types.DetectFacesResponse) => {
        if (err) {
          reject(err);
        } else {
          const faceDimensions: Array<LTWH> = [];
          if (data.FaceDetails) {
            for (const faceDetail of data.FaceDetails) {
              if (!faceDetail.BoundingBox) {
                continue;
              }
              const faceDimension: LTWH = {
                left: faceDetail.BoundingBox.Left,
                top: faceDetail.BoundingBox.Top,
                width: faceDetail.BoundingBox.Width,
                height: faceDetail.BoundingBox.Height,
              };
              faceDimensions.push(faceDimension);
            }
          }
          resolve(faceDimensions);
        }
      }
    );
  });
};

export const faces = async (
  event: APIGatewayProxyEvent,
  aesClient: ElasticSearchClient,
  rekognitionClient: AWS.Rekognition
): Promise<APIGatewayProxyResult> => {
  if (!event.pathParameters || !event.pathParameters.photo_id) {
    return createResponse(400, 'photo_id parameter is missing.');
  }
  try {
    const imageLocation = await getImageLocation(aesClient, event.pathParameters.photo_id, AES_INDEX_NAME);
    if (!imageLocation) {
      return createResponse(404, 'Image not found');
    }

    const faceDimensions = await detectFaces(rekognitionClient, imageLocation);
    return createResponse(200, JSON.stringify(faceDimensions));
  } catch (err) {
    if (err.code === 'InvalidS3ObjectException') {
      return createResponse(404, 'Image not found');
    } else if (err.code === 'InvalidImageFormatException') {
      return createResponse(400, 'Invalid image format. only jpeg and png are supported.');
    }
    console.log(err);
    return createResponse(500);
  }
};
