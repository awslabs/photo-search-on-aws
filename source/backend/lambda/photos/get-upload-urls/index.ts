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
import { S3 } from 'aws-sdk';
import { ulid } from 'ulid';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { createResponse } from '../../common/common';

// Get the following parameters from enviroment settings of Lambda function
const s3BucketName = process.env['S3_BUCKET_NAME']; // S3 bucket name for uploading photos
const aesEndpoint = process.env['AES_NODE_ENDPOINT']; // Elasticsearch Service endpoint
const aesIndex = process.env['AES_INDEX_NAME'] || ''; // Elasticsearch Service index name

// Initialize access client for S3
const s3Client = new S3();

// Initialize access client for Amazon Elasticsearch Service
const aesClient = new ElasticSearchClient({
  node: `https://${aesEndpoint}`,
});

/**
 * AWS Lambda function handler method for Publish Photo Upload URLs API
 * @param event Request event info which handed over from API Gateway
 * @param context Request context info which handed over from API Gateway
 * @returns Response to the client called this Web API
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  // Validate inputs via a query string
  if (!event || !event.queryStringParameters || !event.queryStringParameters.type) {
    return createResponse(400, 'type parameter is missing');
  }

  if (!['search', 'register'].includes(event.queryStringParameters.type)) {
    return createResponse(400, 'Invalid type parameter');
  }
  const isSearchTarget = event.queryStringParameters.type === 'register';

  // Get inputed publish count for a upload url to Amazon S3 (default: 1)
  const count = parseInt(event.queryStringParameters['count'] || '1');

  // Publish upload URLs
  const uploadUrls = [];
  for (let i = 0; i < count; i++) {
    // Generate a photo ID
    const id = ulid();

    // Generate a Presigned URL to upload photo to Amazon S3
    const url = s3Client.getSignedUrl('putObject', {
      Bucket: s3BucketName,
      Key: id,
    });

    // Index a empty document with the photo ID to Amazon Elasticsearch Service
    await aesClient.index({
      index: aesIndex,
      id,
      body: {
        search_target: isSearchTarget,
        image_location: `s3://${s3BucketName}/${id}`,
      },
    });

    // Push the pair of the photo ID and the upload url to the array for a response
    uploadUrls.push({ id, url });
  }

  // Return published upload URLs
  return createResponse(200, JSON.stringify({ results: uploadUrls }));
};
