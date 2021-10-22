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
import React, { FC } from 'react';
import { Translation } from 'react-i18next';
import Cards from '@awsui/components-react/cards';
import Box from '@awsui/components-react/box';
import { PhotoSearchInput } from 'components/photo-search-input/photo-search-input';

export const PhotoSearchPhoto: FC = () => {
  return <PhotoSearchPhotoComponent />;
};

export const PhotoSearchPhotoComponent: React.FC = () => (
  <Translation ns="photo-search">
    {(t) => (
      <Cards
        header={<PhotoSearchInput />}
        items={[]}
        cardDefinition={{}}
        empty={
          <Box textAlign="center" color="inherit">
            <b>{t('resultsShownHere')}</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              {t('uploadOrTypeName')}
            </Box>
          </Box>
        }
      />
    )}
  </Translation>
);
