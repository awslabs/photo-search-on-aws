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
import ReactDOM from 'react-dom';
import { App } from './components/app/app';
import reportWebVitals from './reportWebVitals';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import Amplify, { Auth } from 'aws-amplify';
import {
  AWS_REGION,
  IDENTITY_POOL_ID,
  APP_API_ID,
} from 'utils/consts';
import { CSP } from 'components/csp';

const isDevelopment = process.env.NODE_ENV === 'development';

Amplify.configure({
  aws_project_region: AWS_REGION,
  Auth: {
    identityPoolId: IDENTITY_POOL_ID,
    identityPoolRegion: AWS_REGION,
  },
  API: {
    endpoints: [
      {
        name: 'api',
        endpoint: `https://${APP_API_ID}.execute-api.${AWS_REGION}.amazonaws.com/api`,
        custom_header: async () => {
          const currentSession = await Auth.currentSession().catch(() => {
            // do nothing
          });
          if (currentSession) {
            return {
              Authorization: `Bearer ${currentSession.getIdToken().getJwtToken()}`,
            };
          } else {
            return;
          }
        },
      },
    ],
  },
});

i18next
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    react: {
      useSuspense: false,
    },
    fallbackLng: 'en',
    returnEmptyString: true,
    interpolation: {
      escapeValue: false,
    },
  });

ReactDOM.render(
  <React.StrictMode>
    {!isDevelopment && <CSP />}
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

if (isDevelopment) {
  reportWebVitals(console.log);
}
