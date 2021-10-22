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
import { notificationState } from 'states/store';
import { Flashbar, FlashbarProps } from '@awsui/components-react';
import { useRecoilValue } from 'recoil';

export const Notification: React.FC = (): React.ReactElement => {
  const notificationStateValue = useRecoilValue(notificationState);
  return <NotificationComponent items={notificationStateValue === null ? [] : [notificationStateValue]} />;
};

export const NotificationComponent: React.FC<{
  items: FlashbarProps.MessageDefinition[];
}> = ({ items }): React.ReactElement => <Flashbar items={items} />;
