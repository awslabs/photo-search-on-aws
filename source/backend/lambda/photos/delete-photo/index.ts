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
import { URL } from 'url';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { esDelete, aesSearchForImage, createResponse } from '../../common/common';

const AES_PROTOCOL = process.env.AES_PROTOCOL || 'https';
const AES_INDEX = process.env.AES_INDEX || 'photosearch';
const CUSTOM_USER_AGENT = process.env.CUSTOM_USER_AGENT;

const AESCLIENT = new ElasticSearchClient({
  node: `${AES_PROTOCOL}://${process.env.AES_NODE_ENDPOINT}`,
});
const REKOGNITIONCLIENT = new AWS.Rekognition(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});
const S3CLIENT = new AWS.S3(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  return deletePhotos(event, AESCLIENT, REKOGNITIONCLIENT, S3CLIENT);
};

const deleteFromRekognition = async (rekognitionClient: AWS.Rekognition, faceId: string) => {
  await rekognitionClient
    .deleteFaces({
      CollectionId: AES_INDEX,
      FaceIds: [faceId],
    })
    .promise();
};

const deleteObjectFromS3 = async (s3Client: AWS.S3, imageLocation: string) => {
  const s3url = new URL(imageLocation);
  const bucket = s3url.host;
  const key = s3url.pathname.substring(1);
  try {
    const versionsOutput: AWS.S3.ListObjectVersionsOutput = await s3Client
      .listObjectVersions({
        Bucket: bucket,
        Prefix: key,
      })
      .promise();
    const objVersions: AWS.S3.ObjectIdentifierList = [];
    const versions = versionsOutput.Versions;
    if (versions) {
      for (const ver of versions) {
        objVersions.push({
          Key: key,
          VersionId: ver.VersionId,
        });
      }
    }

    await s3Client
      .deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: objVersions,
        },
      })
      .promise();
  } catch (err) {
    console.log(err); // lets continue with some logging rather than stopping the process.
  }
};

export const deletePhotos = async (
  event: APIGatewayProxyEvent,
  aesClient: ElasticSearchClient,
  rekognitionClient: AWS.Rekognition,
  s3Client: AWS.S3
): Promise<APIGatewayProxyResult> => {
  if (!event.pathParameters || !event.pathParameters.photo_id) {
    return createResponse(400, 'photo_id parameter is missing.');
  }
  try {
    const photoId = event.pathParameters.photo_id;
    const aesEntry = await aesSearchForImage(aesClient, photoId, AES_INDEX);
    if (aesEntry) {
      if (aesEntry.rekognition_id) {
        await deleteFromRekognition(rekognitionClient, aesEntry.rekognition_id);
      }
      await esDelete(aesClient, photoId, AES_INDEX);
      if (aesEntry.image_location) {
        await deleteObjectFromS3(s3Client, aesEntry.image_location);
      }
    }
    return createResponse(204);
  } catch (err) {
    console.log(err);
    return createResponse(500);
  }
};
