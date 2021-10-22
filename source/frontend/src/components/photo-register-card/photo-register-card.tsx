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
import type { Photo } from 'services/photo-service';
import Badge from '@awsui/components-react/badge';
import SpaceBetween from '@awsui/components-react/space-between';
import './photo-register-card.scss';

export type OnCardClick = (photoId: string) => void;

type Props = {
  photo: Photo;
  onCardClick: OnCardClick;
};
export const PhotoRegisterCard: React.FC<Props> = ({ photo, onCardClick }) => {
  return (
    <div
      className="photo-register-card"
      onClick={() => {
        onCardClick(photo.id);
      }}
    >
      <div className="photo-register-card__img-wrapper">
        <img src={photo.url} />
      </div>
      <SpaceBetween size="xs" direction="vertical">
        <SpaceBetween size="xxs" direction="horizontal">
          {photo.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </SpaceBetween>
      </SpaceBetween>
    </div>
  );
};
