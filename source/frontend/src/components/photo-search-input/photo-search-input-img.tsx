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
import { FaceLocation } from 'services/photo-service';

import './photo-search-input-img.scss';

interface Porps {
  src: string;
}
export const PhotoSearchInputImg: React.FC<Porps> = (props) => {
  const { location: locationParam } = useParams<{ location: string }>();
  let rectStyle: React.CSSProperties = null;
  if (locationParam) {
    const locationArray = locationParam.split(' ');
    const location: FaceLocation = { width: null, height: null, left: null, top: null };
    location.width = Number(locationArray[0]);
    location.height = Number(locationArray[1]);
    location.left = Number(locationArray[2]);
    location.top = Number(locationArray[3]);
    rectStyle = {
      width: `${location.width * 100}%`,
      height: `${location.height * 100}%`,
      left: `${location.left * 100}%`,
      top: `${location.top * 100}%`,
    };
  }
  return <PhotoSearchInputImgComponent rectStyle={rectStyle} src={props.src} />;
};

export const PhotoSearchInputImgComponent: React.FC<{
  rectStyle: React.CSSProperties;
  src: string;
}> = (props) => (
  <div className="photo-search-input-img">
    {props.rectStyle && <div style={props.rectStyle} className="photo-search-input-img__rect" />}
    <img src={props.src} />
  </div>
);
