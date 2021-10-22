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
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as defaults from '@aws-solutions-constructs/core';

interface PrivateApiProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class PrivateApi extends cdk.Construct {
  readonly restApi: apigateway.RestApi;

  constructor(scope: cdk.Construct, id: string, props: PrivateApiProps) {
    super(scope, id);

    const apivpceSg = defaults.buildSecurityGroup(
      this,
      'APIGatewaySecurityGroup',
      {
        vpc: props.vpc,
      },
      [{ peer: ec2.Peer.ipv4(props.vpc.vpcCidrBlock), connection: ec2.Port.tcp(443) }],
      []
    );
    const vpceForApi = props.vpc.addInterfaceEndpoint('VCPEForAPIGW', {
      service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
      securityGroups: [apivpceSg],
    });

    const policy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          principals: [new iam.AnyPrincipal()],
          actions: ['execute-api:Invoke'],
          resources: ['execute-api:/*'],
          effect: iam.Effect.DENY,
          conditions: {
            StringNotEquals: { 'aws:SourceVpce': vpceForApi.vpcEndpointId },
          },
        }),
        new iam.PolicyStatement({
          principals: [new iam.AnyPrincipal()],
          actions: ['execute-api:Invoke'],
          resources: ['execute-api:/*'],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    const apilogGroup = defaults.buildLogGroup(scope, 'ApiAccessLogGroup');
    this.restApi = new apigateway.RestApi(this, 'PrivateAPI', {
      deployOptions: {
        stageName: 'api',
        accessLogDestination: new apigateway.LogGroupLogDestination(apilogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [vpceForApi],
      },
      policy: policy,
    });
    this.restApi.addUsagePlan('UsagePlan', {
      apiStages: [
        {
          api: this.restApi,
          stage: this.restApi.deploymentStage,
        },
      ],
    });
  }
}
