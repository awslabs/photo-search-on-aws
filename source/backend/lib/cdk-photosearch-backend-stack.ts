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
import * as ec2 from '@aws-cdk/aws-ec2';
import * as s3 from '@aws-cdk/aws-s3';
import * as es from '@aws-cdk/aws-elasticsearch';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import * as defaults from '@aws-solutions-constructs/core';
import * as s3lambda from '@aws-solutions-constructs/aws-s3-lambda';
import path from 'path';
import { Provider } from '@aws-cdk/custom-resources';
import * as privateapi from './privateapi';

interface PhotoSearchBackendStackProps extends cdk.NestedStackProps {
  bucketAllowOrigin: string;
  apiGatewayAllowOrigin: string;
  aesInstanceType: string;
}

export class PhotoSearchBackendStack extends cdk.NestedStack {
  public readonly apiId: string;
  public readonly identityPoolId: string;

  makeLambdaRole(idPrefix: string) {
    // Setup the IAM Role for Lambda Service
    const lambdaRole = new iam.Role(this, `PhotoSearchLambdaRole${idPrefix}`, {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // all lambda needs to create log and vpc.
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [`arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:*`],
      })
    );
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'ec2:CreateNetworkInterface',
          'ec2:DeleteNetworkInterface',
          'ec2:AssignPrivateIpAddresses',
          'ec2:UnassignPrivateIpAddresses',
          'ec2:DescribeNetworkInterfaces',
        ],
        resources: ['*'],
      })
    );
    // Find the X-Ray IAM Policy
    const cfnLambdafunctionDefPolicy = lambdaRole.node
      .tryFindChild('DefaultPolicy')
      ?.node.findChild('Resource') as iam.CfnPolicy;
    // Add the CFN NAG suppress to allow for "Resource": "*" for AWS X-Ray
    cfnLambdafunctionDefPolicy.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W12',
            reason:
              'Lambda needs the following minimum required permissions to send trace data to X-Ray, access ENIs in a VPC and Rekognition#DetectFace.',
          },
        ],
      },
    };
    return lambdaRole;
  }

  constructor(scope: cdk.Construct, id: string, props: PhotoSearchBackendStackProps) {
    super(scope, id);

    const rekognitionCollectionId = 'photosearch';
    // Define a deployment of Amazon VPC for Amazon Elasticsearch Service
    const myvpc = defaults.buildVpc(this, {
      defaultVpcProps: defaults.DefaultIsolatedVpcProps(), // eslint-disable-line new-cap
    });
    const rekvpceSg = defaults.buildSecurityGroup(
      this,
      'RekognitionSecurityGroup',
      {
        vpc: myvpc,
      },
      [{ peer: ec2.Peer.ipv4(myvpc.vpcCidrBlock), connection: ec2.Port.tcp(443) }],
      []
    );
    myvpc.addInterfaceEndpoint('RekognitionVPCE', {
      service: ec2.InterfaceVpcEndpointAwsService.REKOGNITION,
      securityGroups: [rekvpceSg],
    });

    // Define a deployment of Security Group in the VPC for Amazon Elasticsearch Service
    const aesSg = defaults.buildSecurityGroup(
      this,
      'AESSecurityGroup',
      {
        vpc: myvpc,
      },
      [{ peer: ec2.Peer.ipv4(myvpc.vpcCidrBlock), connection: ec2.Port.tcp(443) }],
      []
    );

    const aesDomainName = 'photosearch-domain';
    // Define a deployment of Amazon Elasticsearch Service Domain

    const cfnDomainProps: es.CfnDomainProps = {
      domainName: aesDomainName,
      elasticsearchVersion: '7.10',
      vpcOptions: {
        subnetIds: [myvpc.isolatedSubnets[0].subnetId, myvpc.isolatedSubnets[1].subnetId],
        securityGroupIds: [aesSg.securityGroupId],
      },
      elasticsearchClusterConfig: {
        dedicatedMasterCount: 3,
        dedicatedMasterEnabled: true,
        dedicatedMasterType: props.aesInstanceType,
        instanceCount: 2,
        instanceType: props.aesInstanceType,
        zoneAwarenessEnabled: true,
      },
      encryptionAtRestOptions: {
        enabled: true,
      },
      nodeToNodeEncryptionOptions: {
        enabled: true,
      },
      ebsOptions: {
        ebsEnabled: true,
        volumeSize: 100,
      },
      accessPolicies: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            principals: [new iam.AnyPrincipal()],
            actions: ['es:ESHttp*'],
            resources: [`arn:aws:es:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:domain/${aesDomainName}/*`],
          }),
        ],
      }),
      // `logPublishingOptions` is disabled due to the issue below. When you anable it, Custom Resource is required.
      // https://github.com/aws/aws-cdk/issues/5343
    };
    const esDomain = new es.CfnDomain(this, 'ElasticsearchDomain', cfnDomainProps);
    esDomain.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W28',
            reason:
              'The ES Domain is passed dynamically as as parameter and explicitly specified to ensure that IAM policies are configured to lockdown access to this specific ES instance only.',
          },
        ],
      },
    };

    // Amazon S3 Bucket for registration of photos
    const corsRule: [s3.CorsRule] = [
      {
        allowedOrigins: [props.bucketAllowOrigin],
        allowedMethods: [s3.HttpMethods.PUT],
        allowedHeaders: ['*'],
      },
    ];
    const [bucketForRegister] = defaults.buildS3Bucket(
      this,
      {
        bucketProps: {
          cors: corsRule,
        },
      },
      'S3BucketForRegister'
    );

    const restApi = new privateapi.PrivateApi(this, 'PrivateApi', { vpc: myvpc }).restApi;

    // securityGroup for lambda in VPC
    const securityGroup = defaults.buildSecurityGroup(
      this,
      'LambdaSecurityGroup',
      {
        vpc: myvpc,
      },
      [{ peer: ec2.Peer.ipv4(myvpc.vpcCidrBlock), connection: ec2.Port.tcp(443) }],
      []
    );

    // Define a common properties setting for Lambda functions
    const commonLambdaProps = {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      vpc: myvpc,
      securityGroups: [securityGroup],
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        AES_NODE_ENDPOINT: esDomain.attrDomainEndpoint,
        S3_BUCKET_NAME: bucketForRegister.bucketName,
        AES_INDEX_NAME: 'photosearch',
        CUSTOM_USER_AGENT: 'AwsSolution/SO0173/1.0.0',
        CORS_ALLOWED_ORIGIN: props.apiGatewayAllowOrigin,
      },
    };

    // Define Lambda functions to deploy
    const webApiLambdas = [
      {
        // Web API to get a photo
        functionName: 'GetPhotoWithId',
        webApiPath: 'photos/{photo_id}',
        httpMethod: 'GET',
        codePath: 'lambda/photos/get-photo/index.ts',
        grantingProcess: (lambdaFunction: lambda.Function) => {
          bucketForRegister.grantRead(lambdaFunction);
        },
      },
      {
        // Web API to get photos
        functionName: 'GetPhotos',
        webApiPath: 'photos',
        httpMethod: 'GET',
        codePath: 'lambda/photos/get-photos/index.ts',
        grantingProcess: (lambdaFunction: lambda.Function) => {
          bucketForRegister.grantRead(lambdaFunction);
        },
      },
      {
        // Web API to get urls to upload photos
        functionName: 'GetPhotoUploadURLs',
        webApiPath: 'photos/upload_urls',
        httpMethod: 'GET',
        codePath: 'lambda/photos/get-upload-urls/index.ts',
        grantingProcess: (lambdaFunction: lambda.Function) => {
          bucketForRegister.grantPut(lambdaFunction);
        },
      },
      {
        // Web API to delete specific photo
        functionName: 'DeletePhoto',
        webApiPath: 'photos/{photo_id}',
        httpMethod: 'DELETE',
        codePath: 'lambda/photos/delete-photo/index.ts',
        grantingProcess: (lambdaFunction: lambda.Function) => {
          bucketForRegister.grantRead(lambdaFunction);
          bucketForRegister.grantDelete(lambdaFunction);
          lambdaFunction.role!.addToPrincipalPolicy(
            new iam.PolicyStatement({
              actions: ['rekognition:DeleteFaces'],
              resources: [
                `arn:aws:rekognition:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:collection/${rekognitionCollectionId}`,
              ],
            })
          );
        },
      },
      {
        // Web API to set tags on specific photo
        functionName: 'SetPhotoTags',
        webApiPath: 'photos/{photo_id}/tags',
        httpMethod: 'PUT',
        codePath: 'lambda/photos/set-tags/index.ts',
      },
      {
        // Web API to set faces from specific photo
        functionName: 'GetPhotoFaces',
        webApiPath: 'photos/{photo_id}/faces',
        httpMethod: 'GET',
        codePath: 'lambda/photos/get-faces/index.ts',
        grantingProcess: (lambdaFunction: lambda.Function) => {
          bucketForRegister.grantRead(lambdaFunction);
          lambdaFunction.role!.addToPrincipalPolicy(
            new iam.PolicyStatement({
              actions: ['rekognition:DetectFaces'],
              resources: ['*'],
            })
          );
        },
      },
      {
        // Web API to set similar faces from specific photo
        functionName: 'GetSimilars',
        webApiPath: 'photos/{photo_id}/similars',
        httpMethod: 'GET',
        codePath: 'lambda/photos/get-similars/index.ts',
        grantingProcess: (lambdaFunction: lambda.Function) => {
          bucketForRegister.grantReadWrite(lambdaFunction);
          lambdaFunction.role!.addToPrincipalPolicy(
            new iam.PolicyStatement({
              actions: ['rekognition:SearchFaces', 'rekognition:SearchFacesByImage'],
              resources: [
                `arn:aws:rekognition:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:collection/${rekognitionCollectionId}`,
              ],
            })
          );
        },
      },
      {
        // Web API to register human name
        functionName: 'RegisterHumanName',
        webApiPath: 'names',
        httpMethod: 'PATCH',
        codePath: 'lambda/names/resigiter-name/index.ts',
      },
    ];

    for (const webApiLambda of webApiLambdas) {
      const bundling = {
        dockerImage: cdk.DockerImage.fromBuild(path.join(__dirname, 'bundling')),
        forceDockerBundling: true,
        nodeModules: webApiLambda.functionName === 'GetSimilars' ? ['sharp'] : undefined,
      };

      // Define an Lambda function
      const lambdaFunction = new NodejsFunction(this, webApiLambda.functionName, {
        entry: webApiLambda.codePath,
        bundling,
        role: this.makeLambdaRole(webApiLambda.functionName),
        ...commonLambdaProps,
      });

      // Define a function to build API path of API Gateway repeatedly
      const allowOrigins = [props.apiGatewayAllowOrigin];
      const getResource = (p: string, rs: apigateway.IResource) => {
        let newResource = rs.getResource(p);
        if (newResource == undefined) {
          newResource = rs.addResource(p);
          newResource.addCorsPreflight({ allowOrigins });
        }
        return newResource;
      };

      // Integrate among a Lambda function and the API Gateway
      const paths = webApiLambda.webApiPath.split('/');
      let resource = getResource(paths[0], restApi.root);
      for (let i = 1; i < paths.length; i++) {
        resource = getResource(paths[i], resource);
      }
      resource.addMethod(webApiLambda.httpMethod, new apigateway.LambdaIntegration(lambdaFunction));

      // Grant access rights to Lambda function according to the definition
      webApiLambda.grantingProcess && webApiLambda.grantingProcess(lambdaFunction);
      const cfnLambdafunction: lambda.CfnFunction = lambdaFunction.node.findChild('Resource') as lambda.CfnFunction;
      cfnLambdafunction.cfnOptions.metadata = {
        cfn_nag: {
          rules_to_suppress: [
            {
              id: 'W58',
              reason:
                'Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.',
            },
            {
              id: 'W92',
              reason: 'reserved capacity depends on how much users use this system.',
            },
          ],
        },
      };
    }
    restApi.methods.forEach((apiMethod) => {
      const child = apiMethod.node.findChild('Resource') as apigateway.CfnMethod;
      if (apiMethod.httpMethod === 'OPTIONS') {
        child.addPropertyOverride('AuthorizationType', 'NONE');
      } else {
        child.addPropertyOverride('AuthorizationType', 'AWS_IAM');
      }
    });

    // API authorization
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: true,
    });
    identityPool.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W57',
            reason: 'Proper restrictive IAM roles and permissions are established for unauthenticated users.',
          },
        ],
      },
    };

    const unauthPolicyDocument = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ['execute-api:Invoke'],
          resources: [`${restApi.arnForExecuteApi()}/*`],
          effect: iam.Effect.ALLOW,
        }),
      ],
    });

    const unauthRole = new iam.Role(this, 'PhotoSearchUnauthRole', {
      assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: { 'cognito-identity.amazonaws.com:aud': identityPool.ref },
        'ForAnyValue:StringLike': { 'cognito-identity.amazonaws.com:amr': 'unauthenticated' },
      }),
      inlinePolicies: { policy: unauthPolicyDocument },
    });

    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        unauthenticated: unauthRole.roleArn,
      },
    });

    // batch lambda function
    const s3triggerFunctionRole = this.makeLambdaRole('RegisterPhoto');
    const s3triggerFunction = new NodejsFunction(this, 'RegisterPhoto', {
      entry: 'lambda/batches/register-photo/index.ts',
      role: s3triggerFunctionRole,
      ...commonLambdaProps,
    });
    new s3lambda.S3ToLambda(this, 'S3ToLambda', {
      existingBucketObj: bucketForRegister,
      existingLambdaObj: s3triggerFunction,
    });
    s3triggerFunctionRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['rekognition:IndexFaces'],
        resources: [
          `arn:aws:rekognition:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:collection/${rekognitionCollectionId}`,
        ],
      })
    );
    bucketForRegister.grantRead(s3triggerFunction);

    const notificationHandler = cdk.Stack.of(this).node.tryFindChild(
      'BucketNotificationsHandler050a0587b7544547bf325f094a3db834'
    ) as lambda.Function;
    const s3ToLambdaFunction: lambda.CfnFunction = notificationHandler.node.findChild('Resource') as lambda.CfnFunction;
    const s3CfntriggerFunction: lambda.CfnFunction = s3triggerFunction.node.findChild('Resource') as lambda.CfnFunction;
    s3CfntriggerFunction.cfnOptions.metadata = s3ToLambdaFunction.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W58',
            reason:
              'Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.',
          },
          {
            id: 'W89',
            reason: 'This is not a rule for the general case, just for specific use cases/industries',
          },
          {
            id: 'W92',
            reason: 'Reserved capacity depends on how much users use this system.',
          },
        ],
      },
    };

    // backend custom resource to create rekognition and AES index
    const backendEventHandlerRole = this.makeLambdaRole('BackendEventHandler');
    const backendEventHandler = new NodejsFunction(this, 'backend-event-handler', {
      entry: 'lambda/custom-resources/backend-event-handler/index.ts',
      role: backendEventHandlerRole,
      ...commonLambdaProps,
    });
    const provider = new Provider(this, 'provider', {
      onEventHandler: backendEventHandler,
    });
    new cdk.CustomResource(this, 'cdk-event-handler', {
      serviceToken: provider.serviceToken,
      properties: {
        AesNodeEndpoint: esDomain.attrDomainEndpoint,
        AesIndexName: rekognitionCollectionId,
        RekognitionCollectionId: rekognitionCollectionId,
      },
    });
    backendEventHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['rekognition:CreateCollection'],
        resources: [
          `arn:aws:rekognition:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:collection/${rekognitionCollectionId}`,
        ],
      })
    );

    const eventHandlerFunction: lambda.CfnFunction = backendEventHandler.node.findChild(
      'Resource'
    ) as lambda.CfnFunction;
    const providerFunction: lambda.CfnFunction = provider.node
      .findChild('framework-onEvent')
      .node.findChild('Resource') as lambda.CfnFunction;
    const customResourceRules = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W58',
            reason:
              'Lambda functions has the required permission to write CloudWatch Logs. It uses custom policy instead of arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole with tighter permissions.',
          },
          {
            id: 'W89',
            reason: 'This is not a rule for the general case, just for specific use cases/industries',
          },
          {
            id: 'W92',
            reason: 'Reserved capacity depends on how much users use this system.',
          },
        ],
      },
    };

    myvpc.addGatewayEndpoint('S3GW', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    providerFunction.cfnOptions.metadata = eventHandlerFunction.cfnOptions.metadata = customResourceRules;

    this.apiId = restApi.restApiId;
    this.identityPoolId = identityPool.ref;

    new cdk.CfnOutput(this, 'region', {
      description: 'Region of the backend',
      value: this.region,
    });
    new cdk.CfnOutput(this, 'apiId', {
      description: 'Endpoint of Api Gateway',
      value: restApi.restApiId,
    });
  }
}
