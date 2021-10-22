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
import { Switch, Redirect, Route } from 'react-router-dom';
import { Top } from 'components/top/top';
import { PhotoSearchPhoto } from 'components/photo-search-photo/photo-search-photo';
import { PhotoSearchName } from 'components/photo-search-name/photo-search-name';
import { PhotoSearchPhotoFaces } from 'components/photo-search-photo-faces/photo-search-photo-faces';
import { PhotoSearchPhotoResults } from 'components/photo-search-photo-results/photo-search-photo-results';
import { PhotoRegister } from 'components/photo-register/photo-register';
import { PhotoRegisterDetail } from 'components/photo-register-detail/photo-register-detail';

export const TOP = '/';
export const PHOTO_SEARCH = '/photos/search';
export const PHOTO_SEARCH_NAME = '/photos/search/name';
export const PHOTO_SEARCH_PHOTO = '/photos/search/photo';
export const PHOTO_SEARCH_FACES = '/photos/search/photo/:photoId/faces';
export const PHOTO_SEARCH_RESULTS = '/photos/search/photo/:photoId/faces/:location';
export const PHOTO_REGISTER = '/photos/register';
export const PHOTO_REGISTER_DETAIL = '/photos/register/:photoId';

export const Routes: React.FC = (): React.ReactElement => {
  return (
    <Switch>
      <Route exact path={TOP} component={Top} />
      <Route exact path={PHOTO_SEARCH} component={PhotoSearchPhoto} />
      <Route exact path={PHOTO_SEARCH_PHOTO} component={PhotoSearchPhoto} />
      <Route exact path={PHOTO_SEARCH_NAME} component={PhotoSearchName} />
      <Route exact path={PHOTO_SEARCH_FACES} component={PhotoSearchPhotoFaces} />
      <Route exact path={PHOTO_SEARCH_RESULTS} component={PhotoSearchPhotoResults} />
      <Route exact path={PHOTO_REGISTER} component={PhotoRegister} />
      <Route exact path={PHOTO_REGISTER_DETAIL} component={PhotoRegisterDetail} />
      <Redirect to={TOP} />
    </Switch>
  );
};
