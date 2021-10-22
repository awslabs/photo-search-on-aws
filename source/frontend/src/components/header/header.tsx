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
import './header.scss';
import { Box, Grid, Link, Select } from '@awsui/components-react';
import { useHeader, HeaderProps } from 'hooks/header/header-hook';

export const Header: React.FC = (): React.ReactElement => {
  return <HeaderComponent {...useHeader()} />;
};

export const HeaderComponent: React.FC<HeaderProps> = ({
  lang,
  options,
  onLanguageChange,
}: HeaderProps): React.ReactElement => (
  <div id="header" className="header">
    <Box margin="s">
      <Grid
        gridDefinition={[
          { colspan: 1 },
          {
            colspan: {
              default: 3,
              xs: 6,
              xxs: 9,
            },
            push: { default: 8, xs: 5, xxs: 2 },
          },
        ]}
      >
        <Link href="https://aws.amazon.com/" target="_blank">
          {/* Put your logo here */}
        </Link>
        <div className="header__right">
          <div className="header__right__lang-select">
            <Select selectedOption={lang} options={options} onChange={onLanguageChange} />
          </div>
        </div>
      </Grid>
    </Box>
  </div>
);
