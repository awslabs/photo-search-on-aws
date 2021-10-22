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
import Cards from '@awsui/components-react/cards';
import Box from '@awsui/components-react/box';
import Button from '@awsui/components-react/button';
import { ServiceFactory } from 'services/service-factory';
import { PhotoService, FaceLocation } from 'services/photo-service';
import { useSearchParams, useQuery } from 'hooks/query/query-hook';
import { PhotoSearchInput } from 'components/photo-search-input/photo-search-input';
import { FaceCard } from 'components/face-card/face-card';
import { useNotification } from 'hooks/notification/notification-hook';

const service = ServiceFactory.getService('photos') as PhotoService;

export const PhotoSearchPhotoFaces: React.FC = () => {
  const { push } = useHistory();
  const { photoUrl } = useSearchParams();
  const query = useQuery();
  const { photoId } = useParams<{ photoId: string }>();
  const [loading, setLoading] = React.useState<boolean>();
  const [faceLocations, setFaceLocations] = React.useState<FaceLocation[]>();
  const { notify } = useNotification();

  React.useEffect(() => {
    if (!photoId) return;
    setLoading(true);
    service
      .detectFaces(photoId)
      .then((results) => {
        setFaceLocations(results);
      })
      .catch((e) => {
        notify({
          type: 'error',
          contentKey: 'failedToDetectFaces',
        });
        console.error(e);
      })
      .finally(() => {
        setLoading(false);
      });
    return () => {
      setFaceLocations(undefined);
    };
  }, [photoId]);

  const onFaceSelected = (location: FaceLocation) => {
    const param = `${location.width} ${location.height} ${location.left} ${location.top}`;
    push({
      pathname: `/photos/search/photo/${photoId}/faces/${param}`,
      search: query.toString(),
    });
  };

  return (
    <PhotoSearchPhotoFacesComponent
      faceLocations={faceLocations}
      photoUrl={photoUrl}
      loading={loading}
      onFaceSelected={onFaceSelected}
    />
  );
};

export const PhotoSearchPhotoFacesComponent: React.FC<{
  faceLocations: FaceLocation[];
  photoUrl: string;
  loading: boolean;
  onFaceSelected: (location: FaceLocation) => void;
}> = (props) => {
  return (
    <Translation ns="photo-search">
      {(t) => (
        <Cards
          header={<PhotoSearchInput />}
          items={props.faceLocations}
          trackBy={(item) => `${Object.values(item).join(',')}`}
          cardDefinition={{
            sections: [
              {
                id: 'face-card',
                content: (item) => <FaceCard photoUrl={props.photoUrl} item={item} />,
              },
              {
                id: 'action',
                content: (item) => (
                  <Button
                    onClick={() => {
                      props.onFaceSelected(item);
                    }}
                  >
                    {t('getSimilarImages')}
                  </Button>
                ),
              },
            ],
          }}
          loading={props.loading}
          empty={
            props.faceLocations === undefined ? null : (
              <Box textAlign="center" color="inherit">
                <b>{t('noFaces')}</b>
                <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                  {t('pleaseTryOtherPhoto')}
                </Box>
              </Box>
            )
          }
        />
      )}
    </Translation>
  );
};
