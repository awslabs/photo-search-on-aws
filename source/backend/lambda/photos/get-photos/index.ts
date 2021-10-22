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
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { makeResponseObject, createResponse } from '../../common/common';

const ES_PROTOCOL = process.env.AES_PROTOCOL || 'https';
const AES_INDEX_NAME = process.env.AES_INDEX_NAME || 'photosearch';
const ES_ENDPOINT = process.env.AES_NODE_ENDPOINT || 'localhost:9200';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'testbucket';
const CUSTOM_USER_AGENT = process.env.CUSTOM_USER_AGENT;

// Initialize access client for S3
const s3Client = new S3(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});
const DEFAULT_PER_PAGE = 100;
const DEFAULT_SEARCH_TYPE = 'dfs_query_then_fetch';

const ES_CLIENT = new ElasticSearchClient({
  node: `${ES_PROTOCOL}://${ES_ENDPOINT}`,
});

export const handler = async (
  event: APIGatewayProxyEvent,
  context: APIGatewayEventRequestContext
): Promise<APIGatewayProxyResult> => {
  const params = event.queryStringParameters!;
  if (!validate(params)) {
    return createResponse(400);
  }

  const page = params && params['page'] ? parseInt(params['page']) : 0;
  const perPage = params && params['per_page'] ? parseInt(params['per_page']) : DEFAULT_PER_PAGE;
  try {
    const photos = await getPhotos(
      ES_CLIENT,
      params && params['query'] ? params['query'] : '',
      page * perPage,
      perPage
    );

    return createResponse(
      200,
      JSON.stringify({
        results: photos.body.hits.hits.map((hit: any) =>
          makeResponseObject(s3Client, S3_BUCKET_NAME, hit._id, hit._source)
        ), // eslint-disable-line @typescript-eslint/no-explicit-any
        page,
        per_page: perPage,
        page_count: Math.ceil(parseFloat(photos.body.hits.total.value) / perPage),
      })
    );
  } catch (err) {
    console.log(err);
    return createResponse(500);
  }
};

const validate = (params: any): boolean => {
  if (!params) {
    return true;
  }
  if (params['page'] && isNaN(parseInt(params['page']))) {
    return false;
  }
  if (params['per_page'] && isNaN(parseInt(params['per_page']))) {
    return false;
  }
  return true;
};

export const getPhotos = async (aesClient: ElasticSearchClient, nameOrTagQuery: string, from: number, size: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = [
    {
      match: {
        search_target: true,
      },
    },
  ];

  if (nameOrTagQuery) {
    q.push({
      bool: {
        should: [
          {
            match: {
              name: {
                query: nameOrTagQuery,
                operator: 'and',
              },
            },
          },
          {
            match: {
              tags: {
                query: nameOrTagQuery,
              },
            },
          },
        ],
      },
    });
  }
  return aesClient.search({
    index: AES_INDEX_NAME,
    search_type: DEFAULT_SEARCH_TYPE,
    body: {
      track_total_hits: true,
      query: {
        bool: {
          must: q,
        },
      },
      sort: ['_score', { _id: { order: 'desc' } }],
      from,
      size,
    },
  });
};
