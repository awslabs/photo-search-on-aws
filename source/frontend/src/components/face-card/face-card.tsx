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
import type { FaceLocation } from 'services/photo-service';
import './face-card.scss';

type Props = {
  photoUrl: string;
  item: FaceLocation;
};
export const FaceCard: React.FC<Props> = ({ photoUrl, item }) => {
  const rectStyle = {
    width: `${item.width * 100}%`,
    height: `${item.height * 100}%`,
    left: `${item.left * 100}%`,
    top: `${item.top * 100}%`,
  };
  return <FaceCardComponent photoUrl={photoUrl} rectStyle={rectStyle} />;
};

export const FaceCardComponent: React.FC<{
  photoUrl: string;
  rectStyle: React.CSSProperties;
}> = (props) => {
  return (
    <div className="face-card">
      <div style={props.rectStyle} className="face-card__rect" />
      <img src={props.photoUrl} />
    </div>
  );
};
