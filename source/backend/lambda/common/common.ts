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
import { APIGatewayProxyResult } from 'aws-lambda';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { S3 } from 'aws-sdk';

const CORS_ALLOWED_ORIGIN = process.env.CORS_ALLOWED_ORIGIN!;

export const aesSearchForImage = async (
  aesClient: ElasticSearchClient,
  photoId: string,
  aesIndex: string
): Promise<any> => {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const resp = await aesClient.get({
      index: aesIndex,
      id: photoId,
    });

    return resp.body._source;
  } catch (err) {
    if (err.meta && err.meta.statusCode === 404) {
      return null;
    }
    throw err;
  }
};

export const esDelete = async (aesClient: ElasticSearchClient, photoId: string, aesIndex: string): Promise<void> => {
  try {
    await aesClient.delete({
      index: aesIndex,
      id: photoId,
    });
  } catch (err) {
    if (err.meta && err.meta.body && err.meta.statusCode === 404) {
      return;
    }
    throw err;
  }
};

export const getImageLocation = async (
  aesClient: ElasticSearchClient,
  photoId: string,
  aesIndex: string
): Promise<string> => {
  const sourceObj = await aesSearchForImage(aesClient, photoId, aesIndex);
  if (!sourceObj) {
    return '';
  }
  return sourceObj.image_location;
};

interface ImageObject {
  id: string;
  name: string;
  url: string;
  tags: Array<string>;
}

export const makeResponseObject = (s3Client: S3, bucket: string, id: string, imageObj: any): ImageObject => {
  // Generate a Presigned URL to get photo from Amazon S3
  const url = s3Client.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: id,
    Expires: 60,
  });
  const tags: Array<string> = [];
  if (imageObj.tags) {
    for (const t of imageObj.tags) {
      tags.push(t);
    }
  }
  return {
    id,
    name: imageObj.name,
    url: url,
    tags,
  };
};

export const createResponse = (statusCode: number, body: string | null | undefined = ''): APIGatewayProxyResult => {
  return {
    statusCode,
    body: body || '',
    headers: {
      'Access-Control-Allow-Origin': CORS_ALLOWED_ORIGIN,
    },
  };
};
