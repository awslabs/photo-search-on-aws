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
import { useHistory, useParams } from 'react-router-dom';
import { Translation } from 'react-i18next';
import { useSearchParams, useQuery } from 'hooks/query/query-hook';
import Input, { InputProps } from '@awsui/components-react/input';
import Button, { ButtonProps } from '@awsui/components-react/button';
import Header from '@awsui/components-react/header';
import SpaceBetween from '@awsui/components-react/space-between';
import FormField from '@awsui/components-react/form-field';
import Box from '@awsui/components-react/box';

import { v4 as uuidv4 } from 'uuid';
import { ServiceFactory } from 'services/service-factory';
import type { PhotoService } from 'services/photo-service';

import { PHOTO_SEARCH_NAME } from 'components/app/routes';

import { PhotoSearchInputImg } from './photo-search-input-img';
import { useNotification } from 'hooks/notification/notification-hook';

const service = ServiceFactory.getService('photos') as PhotoService;

export const PhotoSearchInput: React.FC = () => {
  const { push, replace } = useHistory();
  const query = useQuery();
  const { photoId } = useParams<{ photoId: string }>();
  const { photoUrl, name: paramName } = useSearchParams();
  const [name, setName] = React.useState(paramName);
  const [uploadedImage, setUploadedImage] = React.useState<File>();
  const [uploading, setUploading] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>();
  const { notify } = useNotification();

  React.useEffect(() => {
    if (!photoId) return;
    service.getPhotoUrl(photoId).then(({ url }) => {
      query.set('photoUrl', url);
      replace({
        search: query.toString(),
      });
    });
  }, [photoId]);

  const handleTextChange: InputProps['onChange'] = ({ detail: { value } }) => {
    setName(value);
  };

  const onFileUploaded: React.ChangeEventHandler<HTMLInputElement> = async ({ target: { files } }) => {
    setUploading(true);
    setUploadedImage(files[0]);
    try {
      const { photoId: uploadedPhotoId } = await service.upload(files[0]);
      const { url } = await service.getPhotoUrl(uploadedPhotoId);
      query.set('photoUrl', url);
      push({
        pathname: `/photos/search/photo/${uploadedPhotoId}/faces`,
        search: query.toString(),
      });
    } catch (error) {
      notify({
        type: 'error',
        contentKey: 'failedToUploadPhoto',
      });
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const onSearch: ButtonProps['onClick'] = () => {
    query.set('name', name);
    push({
      pathname: PHOTO_SEARCH_NAME,
      search: query.toString(),
    });
  };

  return (
    <PhotoSearchInputComponent
      fileInputRef={fileInputRef}
      onFileUploaded={onFileUploaded}
      name={name}
      handleTextChange={handleTextChange}
      onSearch={onSearch}
      uploadedImage={uploadedImage}
      photoUrl={photoUrl}
      uploading={uploading}
    />
  );
};

export const PhotoSearchInputComponent: React.FC<{
  fileInputRef: React.MutableRefObject<HTMLInputElement>;
  onFileUploaded: React.ChangeEventHandler<HTMLInputElement>;
  name: string;
  handleTextChange: InputProps['onChange'];
  onSearch: ButtonProps['onClick'];
  uploadedImage: File;
  photoUrl: string;
  uploading: boolean;
}> = (props) => {
  const fileInputId = React.useMemo(() => uuidv4(), []);
  const hasUploadedLocalImage = !!props.uploadedImage;
  let uploadedImageUrl: string = null;
  if (hasUploadedLocalImage) {
    uploadedImageUrl = hasUploadedLocalImage ? URL.createObjectURL(props.uploadedImage) : props.photoUrl;
  }
  return (
    <Translation ns="photo-search">
      {(t) => (
        <Header>
          <SpaceBetween size="m">
            <Box textAlign="center">
              <SpaceBetween size="m" direction="horizontal">
                <FormField>
                  <Button
                    formAction="none"
                    onClick={() => {
                      if (props.fileInputRef) {
                        props.fileInputRef.current.click();
                      }
                    }}
                    loading={props.uploading}
                    disabled={props.uploading}
                    iconName="upload"
                  >
                    {t('upload')}
                    <input
                      hidden
                      ref={props.fileInputRef}
                      id={fileInputId}
                      accept="image/*"
                      type="file"
                      onChange={props.onFileUploaded}
                    />
                  </Button>
                </FormField>
                <FormField>
                  <SpaceBetween size="s" direction="horizontal">
                    <Input value={props.name} onChange={props.handleTextChange} type="search" />
                    <Button onClick={props.onSearch} variant="primary" disabled={!props.name}>
                      {t('search')}
                    </Button>
                  </SpaceBetween>
                </FormField>
              </SpaceBetween>
            </Box>
            <Box textAlign="center">{hasUploadedLocalImage && <PhotoSearchInputImg src={uploadedImageUrl} />}</Box>
          </SpaceBetween>
        </Header>
      )}
    </Translation>
  );
};
