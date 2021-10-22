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
import React from 'react';
import { Helmet } from 'react-helmet';
import { AWS_REGION, APP_API_ID } from 'utils/consts';

const s3Source = AWS_REGION === 'us-east-1' ? 'https://*.s3.amazonaws.com': `https://*.s3.${AWS_REGION}.amazonaws.com`;
const sources = [
  `https://cognito-identity.${AWS_REGION}.amazonaws.com/`,
  `https://${APP_API_ID}.execute-api.${AWS_REGION}.amazonaws.com`,
  s3Source
].join(' ');

export const CSP: React.FC = () => {
  return (
    <Helmet>
      <meta
        httpEquiv="Content-Security-Policy"
        // eslint-disable-next-line max-len
        content={`upgrade-insecure-requests; default-src 'self' ${sources}; img-src 'self' ${sources} data: blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src data:;`}
      />
    </Helmet>
  );
};
