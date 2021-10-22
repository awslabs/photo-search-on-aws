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
import { PHOTO_SEARCH, PHOTO_REGISTER } from 'components/app/routes';
import { SideNavigation } from '@awsui/components-react';
import { Translation } from 'react-i18next';
import { useNavigation, NavigationProps } from 'hooks/navigation/navigation-hook';

export const Navigation: React.FC = (): React.ReactElement => {
  return <NavigationComponent {...useNavigation()} />;
};

export const NavigationComponent: React.FC<NavigationProps> = ({
  currentHref,
  onClickNavigationLink,
}: NavigationProps): React.ReactElement => (
  <Translation ns="navigation">
    {(t) => (
      <SideNavigation
        activeHref={currentHref}
        header={{ href: '/', text: t('title') }}
        onFollow={onClickNavigationLink}
        items={[
          { type: 'link', text: t('search'), href: `${PHOTO_SEARCH}` }, // `不要かも
          { type: 'link', text: t('register'), href: `${PHOTO_REGISTER}` },
          { type: 'divider' },
          {
            type: 'link',
            text: t('documentation'),
            href: 'https://aws.amazon.com/solutions/',
            external: true,
          },
        ]}
      />
    )}
  </Translation>
);
