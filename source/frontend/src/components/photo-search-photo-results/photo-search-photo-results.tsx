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
import { useParams } from 'react-router-dom';
import { Translation } from 'react-i18next';
import { ServiceFactory } from 'services/service-factory';
import type { PhotoService, SimilarPhoto } from 'services/photo-service';
import Cards from '@awsui/components-react/cards';
import Box from '@awsui/components-react/box';
import { PhotoSearchInput } from 'components/photo-search-input/photo-search-input';
import { PhotoCard } from 'components/photo-card/photo-card';
import { useNotification } from 'hooks/notification/notification-hook';

const service = ServiceFactory.getService('photos') as PhotoService;
export const PhotoSearchPhotoResults: React.FC = () => {
  const { photoId, location } = useParams<{ photoId: string; location: string }>();
  const [loading, setLoading] = React.useState<boolean>();
  const [similarPhotos, setSimilarPhotos] = React.useState<SimilarPhoto[]>();
  const { notify } = useNotification();

  React.useEffect(() => {
    if (!photoId || !location) return;
    setLoading(true);
    service
      .getSimilarPhotos(photoId, location)
      .then(({ results }) => {
        setSimilarPhotos(results);
      })
      .catch((e) => {
        notify({
          type: 'error',
          contentKey: 'failedToGetSimilarPhotos',
        });
        console.error(e);
      })
      .finally(() => {
        setLoading(false);
      });
    return () => {
      setSimilarPhotos(undefined);
    };
  }, [photoId, location]);

  return <PhotoSearchPhotoResultsComponent similarPhotos={similarPhotos} loading={loading} />;
};

export const PhotoSearchPhotoResultsComponent: React.FC<{
  similarPhotos: SimilarPhoto[];
  loading: boolean;
}> = (props) => {
  return (
    <Cards
      trackBy={(item) => `${item.id}`}
      items={props.similarPhotos}
      cardDefinition={{
        sections: [
          {
            id: 'image',
            content: (item) => <PhotoCard photo={item} />,
          },
        ],
      }}
      header={<PhotoSearchInput />}
      loading={props.loading}
      empty={
        props.similarPhotos === undefined ? null : (
          <Translation ns="photo-search">
            {(t) => (
              <Box textAlign="center" color="inherit">
                <b>{t('noHitSimilarPhoto')}</b>
                <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                  {t('pleaseTryOtherFace')}
                </Box>
              </Box>
            )}
          </Translation>
        )
      }
    />
  );
};
