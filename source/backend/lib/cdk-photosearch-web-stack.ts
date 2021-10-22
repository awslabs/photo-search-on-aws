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
import * as iam from '@aws-cdk/aws-iam';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Provider } from '@aws-cdk/custom-resources';
import * as cloudfrontS3 from '@aws-solutions-constructs/aws-cloudfront-s3';
import * as waf from '@aws-cdk/aws-waf';

interface PhotoSearchFrontendStackProps extends cdk.NestedStackProps {
  apiId: string;
  identityPoolId: string;
  webConsoleAllowedIpAddressCidr: string;
}
export class PhotoSearchFrontendStack extends cdk.NestedStack {
  public readonly distributionDomainName: string;

  // get the name of the bucket which contains lambda and frontend assets.
  private getAssetSourceBucketName(): string {
    // %%BUCKET_NAME%% part is replaced by build-s3-dist.sh.
    // regional assets are stored in the "bucketprefix-{region}"
    return `%%BUCKET_NAME%%-${cdk.Aws.REGION}`;
  }

  constructor(scope: cdk.Construct, id: string, props: PhotoSearchFrontendStackProps) {
    super(scope, id, props);

    const wafIPSet = new waf.CfnIPSet(this, 'WafIPSet', {
      name: 'whiteList',
      ipSetDescriptors: [
        {
          type: 'IPV4',
          value: props.webConsoleAllowedIpAddressCidr,
        },
      ],
    });

    const wafActivatedRule = new waf.CfnRule(this, 'WafRule', {
      metricName: 'whiteListRule',
      name: 'whiteListRule',
      predicates: [
        {
          dataId: wafIPSet.ref,
          negated: false,
          type: 'IPMatch',
        },
      ],
    });

    const webAcl = new waf.CfnWebACL(this, 'WebAcl', {
      name: 'WebAcl',
      metricName: 'WebAcl',
      defaultAction: {
        type: 'BLOCK',
      },
      rules: [
        {
          action: { type: 'ALLOW' },
          priority: 1,
          ruleId: wafActivatedRule.ref,
        },
      ],
    });

    const { cloudFrontWebDistribution, s3Bucket } = new cloudfrontS3.CloudFrontToS3(this, 'cloudfront-s3', {
      insertHttpSecurityHeaders: false,
      cloudFrontDistributionProps: {
        webAclId: webAcl.ref,
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/',
            ttl: cdk.Duration.minutes(5),
          },
        ],
      },
    });

    if (!s3Bucket) throw new Error('failed to create s3 bucket for frontend assets.');

    const srcBucket = s3.Bucket.fromBucketName(this, 'SourceBucket', this.getAssetSourceBucketName());
    const lambdaRole = new iam.Role(this, 'PhotoSearchLambdaRoleFrontendEventHandler', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });
    lambdaRole.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
    });
    s3Bucket.grantReadWrite(lambdaRole);
    s3Bucket.grantDelete(lambdaRole);
    srcBucket.grantRead(lambdaRole);
    const cfnLambdafunctionDefPolicy = lambdaRole.node
      .tryFindChild('DefaultPolicy')
      ?.node.findChild('Resource') as iam.CfnPolicy;
    cfnLambdafunctionDefPolicy.cfnOptions.metadata = {
      cfn_nag: {
        rules_to_suppress: [
          {
            id: 'W12',
            reason: 'Lambda needs the minimum required permissions to create frontend assets in S3.',
          },
        ],
      },
    };

    const frontendEventHandler = new NodejsFunction(this, 'frontend-event-handler', {
      entry: 'lambda/custom-resources/frontend-event-handler/index.ts',
      role: lambdaRole,
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        BUCKET_NAME: srcBucket.bucketName,
        SOLUTION_NAME: '%%SOLUTION_NAME%%',
        VERSION: '%%VERSION%%',
      },
    });
    const provider = new Provider(this, 'provider', {
      onEventHandler: frontendEventHandler,
    });
    const eventHandlerFunction: lambda.CfnFunction = frontendEventHandler.node.findChild(
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
    providerFunction.cfnOptions.metadata = eventHandlerFunction.cfnOptions.metadata = customResourceRules;

    new cdk.CustomResource(this, 'cdk-event-handler', {
      serviceToken: provider.serviceToken,
      properties: {
        FrontendBucketName: s3Bucket.bucketName,
        Region: cdk.Stack.of(this).region,
        AppApiId: props.apiId,
        IdentityPoolId: props.identityPoolId,
      },
    });

    this.distributionDomainName = cloudFrontWebDistribution.distributionDomainName;

    new cdk.CfnOutput(this, 'frontendBucketName', {
      description: 'Name of the bucket for frontend',
      value: s3Bucket.bucketName,
    });
  }
}
