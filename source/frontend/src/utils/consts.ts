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
interface Env {
  AWS_REGION: string;
  APP_API_ID: string;
  IDENTITY_POOL_ID: string;
}

declare global {
  interface Window {
    env: Env;
  }
}

export const AWS_REGION = window.env.AWS_REGION;
export const APP_API_ID = window.env.APP_API_ID;
export const IDENTITY_POOL_ID = window.env.IDENTITY_POOL_ID;
