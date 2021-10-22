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
import { useHistory } from 'react-router';
import { Translation } from 'react-i18next';
import Cards from '@awsui/components-react/cards';
import Pagination, { PaginationProps } from '@awsui/components-react/pagination';
import Box from '@awsui/components-react/box';
import { PhotoSearchInput } from 'components/photo-search-input/photo-search-input';
import { PhotoCard } from 'components/photo-card/photo-card';
import { ServiceFactory } from 'services/service-factory';
import type { PhotoService, Photo } from 'services/photo-service';
import { useSearchParams, useQuery } from 'hooks/query/query-hook';
import { useNotification } from 'hooks/notification/notification-hook';

const service = ServiceFactory.getService('photos') as PhotoService;
export const PhotoSearchName: React.FC = () => {
  const { push } = useHistory();
  const [photos, setPhotos] = React.useState<Photo[]>();
  const [pageCount, setPageCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>();
  const query = useQuery();
  const { name, page } = useSearchParams();
  const { notify } = useNotification();

  React.useEffect(() => {
    if (!name) return;
    setLoading(true);
    service
      .searchByName(name, page, 10)
      .then(({ results, page_count }) => {
        setPhotos(results);
        setPageCount(page_count);
      })
      .catch((error) => {
        notify({
          type: 'error',
          contentKey: 'failedToSearchByInput',
        });
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });
    return () => {
      setPhotos(undefined);
    };
  }, [name, page]);

  const onPaginationChange: PaginationProps['onChange'] = ({ detail }) => {
    query.set('page', detail.currentPageIndex + '');
    push({
      search: query.toString(),
    });
  };

  return (
    <PhotoSearchNameComponent
      photos={photos}
      loading={loading}
      page={page}
      pageCount={pageCount}
      onPaginationChange={onPaginationChange}
    />
  );
};

export const PhotoSearchNameComponent: React.FC<{
  photos: Photo[];
  loading: boolean;
  page: number;
  pageCount: number;
  onPaginationChange: PaginationProps['onChange'];
}> = (props) => {
  return (
    <Cards
      header={<PhotoSearchInput />}
      items={props.photos}
      trackBy={(item) => `${Object.values(item).join(',')}`}
      cardDefinition={{
        sections: [
          {
            id: 'photo',
            content: (item) => <PhotoCard photo={item} />,
          },
        ],
      }}
      loading={props.loading}
      pagination={
        <Pagination currentPageIndex={props.page} pagesCount={props.pageCount} onChange={props.onPaginationChange} />
      }
      empty={
        props.photos === undefined ? null : (
          <Translation ns="photo-search">
            {(t) => (
              <Box textAlign="center" color="inherit">
                <b>{t('noHitName')}</b>
                <Box padding={{ bottom: 's' }} variant="p" color="inherit">
                  {t('pleaseTryOtherName')}
                </Box>
              </Box>
            )}
          </Translation>
        )
      }
    />
  );
};
