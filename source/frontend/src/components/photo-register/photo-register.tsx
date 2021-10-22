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
import Header from '@awsui/components-react/header';
import SpaceBetween from '@awsui/components-react/space-between';
import Button from '@awsui/components-react/button';
import Pagination, { PaginationProps } from '@awsui/components-react/pagination';
import { PhotoRegisterCard, OnCardClick } from 'components/photo-register-card/photo-register-card';
import { Photo, PhotoService } from 'services/photo-service';
import { ServiceFactory } from 'services/service-factory';
import { useQuery, useRegisterParams } from 'hooks/query/query-hook';
import { UploadModal, OnUploadCompleted } from './upload-modal';
import { useNotification } from 'hooks/notification/notification-hook';

const photoService = ServiceFactory.getService('photos') as PhotoService;
export const PhotoRegister: React.FC = () => {
  const { push } = useHistory();
  const { photoId } = useParams<{ photoId: string }>();
  const [photos, setPhotos] = React.useState<Photo[]>();
  const [loading, setLoading] = React.useState(false);
  const [pageCount, setPageCount] = React.useState<number>();
  const query = useQuery();
  const { page } = useRegisterParams();
  const { notify } = useNotification();

  React.useEffect(() => {
    fetch();
  }, [photoId, page]);

  const fetch = async () => {
    setLoading(true);
    photoService
      .searchByName('', page, 10)
      .then(({ results, page_count }) => {
        setPhotos(results);
        setPageCount(page_count);
      })
      .catch((error) => {
        notify({
          type: 'error',
          contentKey: 'failedToGetRegisteredPhotos',
        });
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const onCardClick: OnCardClick = (id) => {
    push(`/photos/register/${id}`);
  };

  const onPaginationChange: PaginationProps['onChange'] = ({ detail }) => {
    query.set('page', detail.currentPageIndex + '');
    push({
      search: query.toString(),
    });
  };

  const onUploadCompleted: OnUploadCompleted = () => {
    if (page === 1) {
      fetch();
    } else {
      query.set('page', '1');
    }
    push({
      search: query.toString(),
    });
  };

  return (
    <PhotoRegisterComponent
      loading={loading}
      photos={photos}
      onCardClick={onCardClick}
      pagination={{
        page,
        pageCount,
      }}
      onPaginationChange={onPaginationChange}
      onUploadCompleted={onUploadCompleted}
    />
  );
};

export const PhotoRegisterComponent: React.FC<{
  loading: boolean;
  photos: Photo[];
  onCardClick: OnCardClick;
  onUploadCompleted: OnUploadCompleted;
  pagination: { page: number; pageCount: number };
  onPaginationChange: PaginationProps['onChange'];
}> = (props) => {
  const [visibleUploadModal, setVisibleUploadModal] = React.useState(false);
  const onUploadButtonClick = () => {
    setVisibleUploadModal(true);
  };
  return (
    <Translation ns="photo-register">
      {(t) => (
        <>
          <Cards
            stickyHeader={true}
            items={props.photos}
            trackBy={(item) => item.id}
            header={
              <Header
                actions={
                  <SpaceBetween size="s" direction="horizontal">
                    <Button iconName="add-plus" onClick={onUploadButtonClick}>
                      {t('addPhoto')}
                    </Button>
                  </SpaceBetween>
                }
              >
                {t('title')}
              </Header>
            }
            pagination={
              <Pagination
                currentPageIndex={props.pagination.page}
                pagesCount={props.pagination.pageCount}
                onChange={props.onPaginationChange}
              />
            }
            cardDefinition={{
              sections: [
                {
                  id: 'name',
                  content: (item) => item.name,
                },
                {
                  id: 'image',
                  content: (item) => <PhotoRegisterCard photo={item} onCardClick={props.onCardClick} />,
                },
              ],
            }}
          />
          <UploadModal
            visible={visibleUploadModal}
            onUploadCompleted={props.onUploadCompleted}
            setVisible={setVisibleUploadModal}
          />
        </>
      )}
    </Translation>
  );
};
