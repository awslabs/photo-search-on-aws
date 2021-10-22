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
import { useCallback } from 'react';
import { notificationState } from 'states/store';
import { useSetRecoilState } from 'recoil';
import { FlashbarProps } from '@awsui/components-react';
import { useTranslation } from 'react-i18next';

interface NotifyProps extends FlashbarProps.MessageDefinition {
  contentKey?: string;
}

export type NotificationProps = {
  notify: (props: NotifyProps) => void;
};

export const useNotification = (): NotificationProps => {
  const { t } = useTranslation('notification');
  const setNotification = useSetRecoilState(notificationState);
  const onDismiss = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notify: (props) => {
      setNotification({
        onDismiss,
        dismissible: true,
        content: props.contentKey ? t(props.contentKey) : props.content,
        ...props,
      });
    },
  };
};
