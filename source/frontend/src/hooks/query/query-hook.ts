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
import { useLocation } from 'react-router-dom';

export const useQuery = (): URLSearchParams => {
  return new URLSearchParams(useLocation().search);
};

export const useSearchParams = (): {
  photoUrl: string | null;
  name: string;
  page: number;
} => {
  const query = useQuery();
  return {
    photoUrl: query.get('photoUrl'),
    name: query.get('name'),
    page: Number(query.get('page') || '1'),
  };
};

export const useRegisterParams = (): {
  page: number;
} => {
  const query = useQuery();
  return {
    page: Number(query.get('page') || '1'),
  };
};
