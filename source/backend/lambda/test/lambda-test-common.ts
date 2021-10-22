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
import { APIGatewayEventRequestContext, APIGatewayProxyEvent, S3Event } from 'aws-lambda';

export function createLambdaEvent(
  body: { [key: string]: any },
  headers: { [key: string]: string },
  pathParameters: { [key: string]: string },
  queryStringParameters: { [key: string]: string }
): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers,
    pathParameters,
    queryStringParameters,
    path: '',
    httpMethod: '',
    resource: '',
    isBase64Encoded: false,
    stageVariables: {},
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    requestContext: {
      requestId: '',
      requestTimeEpoch: 0,
      resourceId: '',
      resourcePath: '',
      accountId: '',
      apiId: '',
      stage: '',
      path: '',
      httpMethod: '',
      protocol: '',
      identity: {
        clientCert: null,
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        sourceIp: '',
        user: null,
        userArn: null,
        userAgent: null,
        principalOrgId: null,
      },
      authorizer: null,
    },
  };
}

export function createLambdaContext(): APIGatewayEventRequestContext {
  return {
    accountId: '',
    apiId: '',
    authorizer: {},
    protocol: '',
    httpMethod: '',
    identity: {
      clientCert: null,
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      sourceIp: '',
      user: null,
      userArn: null,
      userAgent: null,
      principalOrgId: null,
    },
    path: '',
    stage: '',
    requestId: '',
    requestTimeEpoch: 0,
    resourceId: '',
    resourcePath: '',
  };
}

export function createS3Event(bucketName: string, key: string): S3Event {
  return {
    Records: [{
      eventVersion: 'dummy',
      eventSource: 'dummy',
      awsRegion: 'dummy',
      eventTime: 'dummy',
      eventName: 'dummy',
      userIdentity: {
          principalId: 'dummy'
      },
      requestParameters: {
          sourceIPAddress: 'dummy'
      },
      responseElements: {
          'x-amz-request-id': 'dummy',
          'x-amz-id-2': 'dummy'
      },
      s3: {
        s3SchemaVersion: 'dummy',
        configurationId: 'dummy',
        bucket: {
          name: bucketName,
          ownerIdentity: {
            principalId: 'dummyprincipal'
          },
          arn: 'dummyArn'
        },
        object: {
          key: key,
          size: 100,
          eTag: 'dummyetag',
          sequencer: 'dummyseq'
        }
      }
    }]
  }
}