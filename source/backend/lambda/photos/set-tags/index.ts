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
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { createResponse } from '../../common/common';

const AES_PROTOCOL = process.env.AES_PROTOCOL || 'https';
const AES_INDEX_NAME = process.env.AES_INDEX_NAME || 'photosearch';

const AESCLIENT = new ElasticSearchClient({
  node: `${AES_PROTOCOL}://${process.env.AES_NODE_ENDPOINT}`,
});

export const setTags = async (
  event: APIGatewayProxyEvent,
  aesClient: ElasticSearchClient
): Promise<APIGatewayProxyResult> => {
  if (!event.pathParameters || !event.pathParameters.photo_id) {
    return createResponse(400, 'photo_id parameter is missing.');
  }
  let tags;
  try {
    tags = JSON.parse(event.body || '[]');
    for (const t of tags) {
      if (typeof t != 'string') {
        throw new Error();
      }
    }
  } catch (err) {
    return createResponse(400, 'Invalid request body format');
  }

  try {
    await aesClient.update({
      index: AES_INDEX_NAME,
      id: event.pathParameters.photo_id,
      body: { doc: { tags } },
    });

    return createResponse(200, event.body);
  } catch (err) {
    if (err.meta && err.meta.statusCode === 404) {
      return createResponse(404, 'Image not found');
    }
    console.log(err);
    return createResponse(500);
  }
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  return setTags(event, AESCLIENT);
};
