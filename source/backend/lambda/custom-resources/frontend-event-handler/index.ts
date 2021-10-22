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
import { OnEventRequest, OnEventResponse } from '@aws-cdk/custom-resources/lib/provider-framework/types';
import * as unzipper from 'unzipper';
import * as mime from 'mime-types';
import * as AWS from 'aws-sdk';

const DEPLOYMENT_BUCKET = process.env.BUCKET_NAME;
const DEPLOYMENT_BUCKET_KEY = process.env.SOLUTION_NAME + '/' + process.env.VERSION;
const UI_FILE = 'ui.zip';
const CONFIG_FILENAME = 'settings.js';

export const handler = async (event: OnEventRequest): Promise<OnEventResponse> => {
  console.log('event: ', event);

  switch (event.RequestType) {
    case 'Create':
    case 'Update':
      await createFrontendAssetsOnS3(event);
      return {};
    case 'Delete':
      return {};
  }
};

const createFrontendAssetsOnS3 = async (event: OnEventRequest) => {
  const bucketName = event.ResourceProperties['FrontendBucketName'];
  const s3Client = new AWS.S3();
  const files = s3Client
    .getObject({
      Bucket: DEPLOYMENT_BUCKET!,
      Key: `${DEPLOYMENT_BUCKET_KEY}/${UI_FILE}`,
    })
    .createReadStream()
    // eslint-disable-next-line new-cap
    .pipe(unzipper.Parse({ forceStream: true }));

  for await (const entry of files) {
    if (entry.type === 'Directory') {
      continue;
    }
    console.log('== uploading ' + entry.path);
    await s3Client
      .upload({
        ACL: 'private',
        Bucket: bucketName,
        Key: entry.path,
        Body: entry,
        ContentType: mime.lookup(entry.path) || 'application/octet-stream',
      })
      .promise();
  }

  await s3Client
    .putObject({
      ACL: 'private',
      Bucket: bucketName,
      Key: CONFIG_FILENAME,
      ContentType: 'text/javascript',
      Body: `window.env = {
    AWS_REGION: '${event.ResourceProperties['Region']}',
    APP_API_ID: '${event.ResourceProperties['AppApiId']}',
    IDENTITY_POOL_ID: '${event.ResourceProperties['IdentityPoolId']}',
  }`,
    })
    .promise();
};
