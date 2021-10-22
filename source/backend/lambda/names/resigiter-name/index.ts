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

// Get the following parameters from enviroment settings of Lambda function
const aesEndpoint = process.env['AES_NODE_ENDPOINT']; // Elasticsearch Service endpoint
const aesIndex = process.env['AES_INDEX_NAME'] || 'photosearch'; // Elasticsearch Service index name

// Initialize access client for Amazon Elasticsearch Service
const ES_CLIENT = new ElasticSearchClient({
  node: `https://${aesEndpoint}`,
});

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  return registerNames(event, ES_CLIENT);
};

export const registerNames = async (
  event: APIGatewayProxyEvent,
  aesClient: ElasticSearchClient
): Promise<APIGatewayProxyResult> => {
  const body = JSON.parse(event.body || '{}');
  if (!validate(body)) return createResponse(400);

  const name: string = body['name'];
  const photoIds: Array<string> = body['photo_ids'];

  // Update documents in Amazon Elasticsearch Service
  for (const photoId of photoIds) {
    // Update name attribute of a document having photoId as _id
    try {
      await aesClient.update({
        index: aesIndex,
        id: photoId,
        body: { doc: { name } },
      });
    } catch (err) {
      // unknown ID. Lets continue
    }
  }

  // Return only HTTP status code 204 (No Content)
  return createResponse(204);
};

/**
 * Validate the body in client's request
 * @param body Body from the client's request
 * @returns "true" if the body has all requested parameters
 */
const validate = (body: { name: string; photo_ids: Array<string> }): boolean => {
  if (!('name' in body)) return false;
  if (typeof body['name'] != 'string') return false;
  if (body['name'].length == 0) return false;
  if (!('photo_ids' in body)) return false;
  if (typeof body['photo_ids'] != 'object') return false;
  for (const photoId of body['photo_ids']) {
    if (typeof photoId != 'string') return false;
  }

  return true;
};
