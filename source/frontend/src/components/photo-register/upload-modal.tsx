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
import { Translation } from 'react-i18next';
import Modal from '@awsui/components-react/modal';
import SpaceBetween from '@awsui/components-react/space-between';
import Button, { ButtonProps } from '@awsui/components-react/button';
import TokenGroup from '@awsui/components-react/token-group';
import Box from '@awsui/components-react/box';
import Input, { InputProps } from '@awsui/components-react/input';
import Form from '@awsui/components-react/form';
import FormField from '@awsui/components-react/form-field';
import { ServiceFactory } from 'services/service-factory';
import { PhotoService } from 'services/photo-service';
import { NameService } from 'services/name-service';

export type OnUploadCompleted = () => void;

type Props = {
  visible: boolean;
  onUploadCompleted: OnUploadCompleted;
  setVisible: React.Dispatch<boolean>;
};
const photoService = ServiceFactory.getService('photos') as PhotoService;
const nameService = ServiceFactory.getService('names') as NameService;
export const UploadModal: React.FC<Props> = (props) => {
  const fileInputRef = React.useRef<HTMLInputElement>();
  const [name, setName] = React.useState<string>();
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
  const [uploading, setUploading] = React.useState<boolean>();
  const [errorText, setErrorText] = React.useState<string>();

  const onDissmiss = () => {
    setName(undefined);
    setUploadedFiles([]);
    props.setVisible(false);
  };

  const onUploadClick = async () => {
    if (!uploadedFiles || !name) return;
    setUploading(true);
    try {
      const photoIds = await photoService.uploadForRegister(uploadedFiles);
      await nameService.setName(name, photoIds);
      props.setVisible(false);
      onDissmiss();
      props.onUploadCompleted();
    } catch (error) {
      setErrorText('failed to upload');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const onNameInputChange: InputProps['onChange'] = ({ detail: { value } }) => {
    setName(value);
  };

  const onFileChooseClick: ButtonProps['onClick'] = () => {
    if (fileInputRef) {
      fileInputRef.current.click();
    }
  };

  const onFileChoosed: React.ChangeEventHandler<HTMLInputElement> = ({ target: { files } }) => {
    const _files = [];
    for (let i = 0; i < files.length; i++) {
      _files.push(files[i]);
    }
    setUploadedFiles([...uploadedFiles, ..._files]);
  };

  return (
    <Translation ns="photo-register">
      {(t) => (
        <Modal
          onDismiss={onDissmiss}
          visible={props.visible}
          closeAriaLabel={t('closeModal')}
          size="medium"
          footer={
            <Box float="right">
              <SpaceBetween size="xs" direction="horizontal">
                <Button
                  variant="primary"
                  onClick={onUploadClick}
                  disabled={!uploadedFiles || uploadedFiles.length === 0 || !name}
                  loading={uploading}
                >
                  {t('uploadFiles')}
                </Button>
              </SpaceBetween>
            </Box>
          }
          header={t('uploadFiles')}
        >
          <Form errorText={errorText}>
            <SpaceBetween size="m">
              {t('descriptionForUploading')}
              <FormField
                description={t('whosePhotosAreYouUploading')}
                label={t('name')}
                constraintText={t('youCanUploadPhotoAfterInputThisField')}
              >
                <Input name="name" onChange={onNameInputChange} value={name} />
              </FormField>
              <Box textAlign="center">
                <Button
                  iconName="upload"
                  formAction="none"
                  onClick={onFileChooseClick}
                  disabled={uploading || !name}
                  loading={uploading}
                >
                  {t('choosePhoto')}
                </Button>
                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  onChange={(event) => {
                    onFileChoosed(event);
                  }}
                  onClick={() => {
                    fileInputRef.current.value = null;
                  }}
                  multiple
                  accept="image/*"
                />
              </Box>
              <Box textAlign="center">
                {uploadedFiles && uploadedFiles.length > 0 && t('uploadedFiles')}
                <TokenGroup
                  items={uploadedFiles.map((v) => ({
                    iconUrl: URL.createObjectURL(v),
                    label: v.name,
                    description: `${Math.floor(v.size / 1024)} KB`,
                    tags: [
                      `${t('lastDateModified')}:`,
                      `${new Intl.DateTimeFormat(navigator.language, { dateStyle: 'full', timeStyle: 'long' }).format(
                        new Date(v.lastModified)
                      )}`,
                    ],
                  }))}
                  onDismiss={({ detail: { itemIndex } }) => {
                    setUploadedFiles([...uploadedFiles.slice(0, itemIndex), ...uploadedFiles.slice(itemIndex + 1)]);
                  }}
                  alignment="vertical"
                />
              </Box>
            </SpaceBetween>
          </Form>
        </Modal>
      )}
    </Translation>
  );
};
