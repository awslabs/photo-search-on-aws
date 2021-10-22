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
import './top.scss';
import { Box, Grid } from '@awsui/components-react';
import { Translation } from 'react-i18next';

export const Top: React.FC = (): React.ReactElement => {
  return (
    <Translation ns="top">
      {(t) => (
        <div className="top">
          <Box padding={{ vertical: 'xxl', horizontal: 's' }} className="top__header">
            <Grid gridDefinition={[{ colspan: 12 }]}>
              <Box fontWeight="light" padding={{ top: 'xs' }}>
                <span className="top__category">{t('category')}</span>
              </Box>
              <div className="top__title">
                <Box variant="h1" fontWeight="bold" padding="n" fontSize="display-l" color="inherit">
                  {t('title')}
                </Box>
                <Box fontWeight="light" padding={{ bottom: 's' }} fontSize="display-l" color="inherit">
                  {t('subtitle')}
                </Box>
                <Box variant="p" fontWeight="light">
                  <span className="top__description">{t('description')}</span>
                </Box>
              </div>
            </Grid>
          </Box>
        </div>
      )}
    </Translation>
  );
};
