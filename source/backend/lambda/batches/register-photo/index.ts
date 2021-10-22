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
import AWS from 'aws-sdk';
import { S3Event, Context } from 'aws-lambda';
import { Client as ElasticSearchClient } from '@elastic/elasticsearch';
import { aesSearchForImage } from '../../common/common';

const AES_INDEX_NAME = process.env.AES_INDEX_NAME || 'photosearch';
const CUSTOM_USER_AGENT = process.env.CUSTOM_USER_AGENT;

// Initialize access client for Rekognition
const REKOGNITIONCLIENT = new AWS.Rekognition(CUSTOM_USER_AGENT ? { customUserAgent: CUSTOM_USER_AGENT } : {});

// Initialize access client for Amazon Elasticsearch Service
const ESCLIENT = new ElasticSearchClient({
  node: `https://${process.env.AES_NODE_ENDPOINT}`,
});

export const register = async (event: S3Event, aesClient: ElasticSearchClient, rekognitionClient: AWS.Rekognition): Promise<void> => {
  // Process each uploaded photo
  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const photoId = record.s3.object.key; // This is equal to file name placed on S3 bucket
  
    const imageObj = await aesSearchForImage(aesClient, photoId, AES_INDEX_NAME);
    if (imageObj && imageObj.search_target) {
      // Add face to the collection in Rekognition
      const resp = await rekognitionClient.indexFaces({
        CollectionId: AES_INDEX_NAME,
        ExternalImageId: photoId,
        Image: {
          S3Object: {
            Bucket: bucketName,
            Name: photoId,
          },
        },
      }).promise();
  
      if (resp.FaceRecords && resp.FaceRecords[0].Face) {
        await aesClient.update({
          index: AES_INDEX_NAME,
          id: photoId,
          body: {
            doc: {
              rekognition_id: resp.FaceRecords[0].Face.FaceId,
              image_location: `s3://${bucketName}/${photoId}`,
            },
          },
        });
      }
    }
  }
}

/**
 * AWS Lambda function handler method triggered by S3 file upload to analyze using Rekognition
 * @param event Request event info about file uploading to S3
 * @param context Request context info about file uploading to S3
 */
export const handler = async (event: S3Event, context: Context): Promise<void> => {
  return register(event, ESCLIENT, REKOGNITIONCLIENT);
};
