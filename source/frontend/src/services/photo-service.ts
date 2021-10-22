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
import { ApiResponse, ApiResponseWithPagination, Client } from './client';
import { Service } from './service-factory';

export type Photo = {
  id: string;
  name: string;
  url: string;
  tags: string[];
};

export type UploadUrl = {
  id: string;
  url: string;
};

export type FaceLocation = {
  height: number;
  left: number;
  top: number;
  width: number;
};

export type SimilarPhoto = Photo;

export class PhotoService implements Service {
  public readonly resource = '/photos';

  public searchByName(name: string, page: number, perPage: number): Promise<ApiResponseWithPagination<Photo[]>> {
    return Client.get('api', `${this.resource}`, {
      queryStringParameters: {
        query: name,
        page: page - 1, // pagination begin with 0 on the backend.
        per_page: perPage,
      },
    });
  }

  public getPhotoUrl(photoId: string): Promise<Photo> {
    return Client.get('api', `${this.resource}/${photoId}`, {});
  }

  public async upload(photo: File): Promise<{ photoId: string }> {
    const { results } = await Client.get('api', `${this.resource}/upload_urls`, {
      queryStringParameters: {
        count: 1,
        type: 'search',
      },
    });
    if (!results || results.length === 0) {
      throw new Error('upload url is empty');
    }
    const uploadUrl = results[0];
    const uploaded = await fetch(uploadUrl.url, {
      method: 'PUT',
      body: photo,
      mode: 'cors',
      headers: {
        'Content-Type': '',
      },
    });
    if (!uploaded.ok) {
      throw new Error('failed to upload');
    }
    return {
      photoId: uploadUrl.id,
    };
  }

  public async uploadForRegister(photos: File[]): Promise<string[]> {
    const { results }: { results: { id: string; url: string }[] } = await Client.get(
      'api',
      `${this.resource}/upload_urls`,
      {
        queryStringParameters: {
          count: photos.length,
          type: 'register',
        },
      }
    );
    if (!results || results.length === 0) {
      throw new Error('upload url is empty');
    }
    const tasks = results.map(({ url }, index) =>
      fetch(url, {
        method: 'PUT',
        body: photos[index],
        mode: 'cors',
        headers: {
          'Content-Type': '',
        },
      })
    );
    await Promise.all(tasks);
    return results.map((result) => result.id);
  }

  public detectFaces(photoId: string): Promise<FaceLocation[]> {
    return Client.get('api', `${this.resource}/${photoId}/faces`, {});
  }

  public getSimilarPhotos(photoId: string, location: string): Promise<ApiResponse<SimilarPhoto[]>> {
    return Client.get('api', `${this.resource}/${photoId}/similars`, {
      queryStringParameters: {
        location,
      },
    });
  }

  public setTags(photoId: string, tags: string[]): Promise<void> {
    return Client.put('api', `${this.resource}/${photoId}/tags`, {
      body: tags,
    });
  }
}
