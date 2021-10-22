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

import * as cdk from '@aws-cdk/core';
import { PhotoSearchBackendStack } from './cdk-photosearch-backend-stack';
import { PhotoSearchFrontendStack } from './cdk-photosearch-web-stack';

export class PhotoSearchStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    const props = {
      description: 'SO0173 Ver 1.0.0',
    };
    super(scope, id, props);

    const apiGatewayAllowOrigin = new cdk.CfnParameter(this, 'ApiGatewayAllowOrigin', {
      type: 'String',
      description: 'Enter allowed origin for the api gateway',
      default: '*',
    });
    const bucketAllowOrigin = new cdk.CfnParameter(this, 'S3BucketAllowOrigin', {
      type: 'String',
      description: 'Enter allowed origin for the s3 bucket to upload images',
      default: '*',
    });
    const webConsoleAllowedIpAddressCidr = new cdk.CfnParameter(this, 'WebConsoleAllowedIpAddressCidr', {
      description: 'Enter IP address range allowed to access the web console. The format is like; x.x.x.x/y',
      type: 'String',
    });
    const aesInstanceType = new cdk.CfnParameter(this, 'AESInstanceType', {
      description: 'Enter Amazon Elasticsearch Service InstanceType',
      type: 'String',
      default: 't3.small.elasticsearch',
    });
    const backendStack = new PhotoSearchBackendStack(this, 'Backend', {
      bucketAllowOrigin: bucketAllowOrigin.valueAsString,
      apiGatewayAllowOrigin: apiGatewayAllowOrigin.valueAsString,
      aesInstanceType: aesInstanceType.valueAsString,
    });

    const frontendStack = new PhotoSearchFrontendStack(this, 'Frontend', {
      apiId: backendStack.apiId,
      identityPoolId: backendStack.identityPoolId,
      webConsoleAllowedIpAddressCidr: webConsoleAllowedIpAddressCidr.valueAsString,
    });

    new cdk.CfnOutput(this, 'WebConsoleURL', {
      description: 'URL to the web console',
      value: frontendStack.distributionDomainName,
    });
  }
}
