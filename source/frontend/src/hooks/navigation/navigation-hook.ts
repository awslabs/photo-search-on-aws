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
import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { SideNavigationProps } from '@awsui/components-react';

export type NavigationProps = {
  currentHref: string;
  onClickNavigationLink: (event: CustomEvent<SideNavigationProps.FollowDetail>) => void;
};

export const useNavigation = (): NavigationProps => {
  const history = useHistory();
  const location = useLocation();
  const [currentHref, setCurrentHref] = useState<string>('/');

  useEffect(() => {
    setCurrentHref(location.pathname);
  }, [location]);

  const onClickNavigationLink = (event: CustomEvent<SideNavigationProps.FollowDetail>): void => {
    if (!event.detail.external) {
      event.preventDefault();
      history.push(event.detail.href);
    }
  };

  return {
    currentHref,
    onClickNavigationLink,
  };
};
