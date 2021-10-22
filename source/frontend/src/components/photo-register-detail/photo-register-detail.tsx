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
import Container from '@awsui/components-react/container';
import SpaceBetween from '@awsui/components-react/space-between';
import Box from '@awsui/components-react/box';
import Button from '@awsui/components-react/button';
import Input from '@awsui/components-react/input';
import FormField from '@awsui/components-react/form-field';
import Spinner from '@awsui/components-react/spinner';
import Header from '@awsui/components-react/header';
import TokenGroup from '@awsui/components-react/token-group';

import { Translation } from 'react-i18next';
import { Photo, PhotoService } from 'services/photo-service';
import { ServiceFactory } from 'services/service-factory';

import './photo-register-detail.scss';
import { NameService } from 'services/name-service';
import { useNotification } from 'hooks/notification/notification-hook';

const photoService = ServiceFactory.getService('photos') as PhotoService;
const nameService = ServiceFactory.getService('names') as NameService;
export const PhotoRegisterDetail: React.FC = () => {
  const { photoId } = useParams<{ photoId: string }>();
  const [photo, setPhoto] = React.useState<Photo>();
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const { goBack } = useHistory();
  const { notify } = useNotification();

  React.useEffect(() => {
    setLoading(true);
    photoService
      .getPhotoUrl(photoId)
      .then(setPhoto)
      .finally(() => {
        setLoading(false);
      });
  }, [photoId]);

  const onSave = async (tags: string[], name: string) => {
    setSubmitting(true);
    try {
      await photoService.setTags(photoId, tags);
      await nameService.setName(name, [photoId]);
      goBack();
    } catch (error) {
      notify({
        type: 'error',
        contentKey: 'failedToUpdatePhoto',
      });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return <PhotoRegisterDetailComponent loading={loading} submitting={submitting} photo={photo} onSave={onSave} />;
};

export const PhotoRegisterDetailComponent: React.FC<{
  loading: boolean;
  submitting: boolean;
  photo: Photo;
  onSave: (tags: string[], name: string) => void;
}> = (props) => {
  const [tags, setTags] = React.useState<string[]>([]);
  const [tag, setTag] = React.useState<string>();
  const [name, setName] = React.useState<string>();

  React.useEffect(() => {
    if (props.photo) {
      setTags(props.photo.tags);
      setName(props.photo.name);
    }
  }, [props.photo]);

  return (
    <Translation ns="photo-register">
      {(t) => (
        <Container
          className="photo-register-detail"
          header={
            <Header
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    variant="primary"
                    onClick={() => {
                      props.onSave(tags, name);
                    }}
                    loading={props.submitting}
                  >
                    {t('save')}
                  </Button>
                </SpaceBetween>
              }
            />
          }
        >
          <SpaceBetween size="m">
            <Box>{props.photo ? <img src={props.photo.url} /> : <Spinner />}</Box>
            <FormField label={t('name')}>
              <Input
                type="text"
                name="name"
                value={name}
                disabled={props.submitting || props.loading}
                onChange={({ detail: { value } }) => {
                  setName(value);
                }}
              />
            </FormField>
            <Box>
              <ValueWithLabel label={t('tags')}>
                <SpaceBetween size="m">
                  <SpaceBetween size="xs" direction="horizontal">
                    <Input
                      onChange={({ detail: { value } }) => {
                        setTag(value);
                      }}
                      type="text"
                      name="tag"
                      value={tag}
                      disabled={props.submitting || props.loading}
                    />
                    <Button
                      onClick={() => {
                        setTags(Array.from(new Set([...tags, tag])));
                        setTag('');
                      }}
                      disabled={props.submitting || props.loading}
                      variant="primary"
                    >
                      {t('addTag')}
                    </Button>
                  </SpaceBetween>
                  <SpaceBetween size="xs" direction="horizontal">
                    <TokenGroup
                      items={tags.map((label) => ({
                        label,
                      }))}
                      onDismiss={({ detail: { itemIndex } }) => {
                        setTags([...tags.slice(0, itemIndex), ...tags.slice(itemIndex + 1)]);
                      }}
                    />
                  </SpaceBetween>
                </SpaceBetween>
              </ValueWithLabel>
            </Box>
          </SpaceBetween>
        </Container>
      )}
    </Translation>
  );
};

const ValueWithLabel: React.FC<{
  label: string;
}> = ({ label, children }) => (
  <div>
    <Box margin={{ bottom: 'xxxs' }} color="text-label">
      {label}
    </Box>
    <div>{children}</div>
  </div>
);
