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
import { aesSearchForImage, makeResponseObject, createResponse } from '../../common/common';

const AES_PROTOCOL = process.env.AES_PROTOCOL || 'https';
const AES_INDEX_NAME = process.env.AES_INDEX_NAME || 'photosearch';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'testbucket';
const CUSTOM_USER_AGENT = process.env.CUSTOM_USER_AGENT;
const AESCLIENT = new ElasticSearchClient({
  node: `${AES_PROTOCOL}://${process.env.AES_NODE_ENDPOINT}`,
});
const S3CLIENT = new AWS.S3(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  return getPhoto(event, AESCLIENT, S3CLIENT);
};

export const getPhoto = async (
  event: APIGatewayProxyEvent,
  aesClient: ElasticSearchClient,
  s3Client: AWS.S3
): Promise<APIGatewayProxyResult> => {
  if (!event.pathParameters || !event.pathParameters.photo_id) {
    return createResponse(400, 'photo_id parameter is missing.');
  }
  try {
    const imageId = event.pathParameters.photo_id;
    const imageObj = await aesSearchForImage(aesClient, imageId, AES_INDEX_NAME);
    if (!imageObj) {
      return createResponse(404, 'Image not found');
    }

    return createResponse(200, JSON.stringify(makeResponseObject(s3Client, S3_BUCKET_NAME, imageId, imageObj)));
  } catch (err) {
    console.log(err);
    return createResponse(500);
  }
};
